# Middleware Standards

All Express middleware lives in `src/middleware/`.

## Error handler

The centralized error handler is the last middleware registered in `app.js`. All errors flow here via `next(err)` from controllers.

```javascript
export const errorHandler = (err, req, res, next) => {
    const status = err.status || 500;
    const message = err.message || 'Internal server error';
    res.status(status).json({ error: message });
};
```

Error response format is always `{ error: "message" }`.

Services set `err.status` to control the HTTP status code. If no status is set, it defaults to 500.

## Request validation middleware

`validateRequest.js` exports `validateRequest`, registered globally in `app.js` right after `express.json()`. It refuses with `400 'Invalid request body'` a JSON array body, since `findByIdAndUpdate` would run an array as an aggregation pipeline and `authorize` reads parent and reference fields off a plain object. It refuses with `400 'Invalid skip or limit'` a `skip` or `limit` query value that is not a non-negative integer string, so every `list()` can pass `Number(skip)` and `Number(limit)` to the query.

## Auth middleware

Authentication is handled by Clerk (`@clerk/express`). `auth.js` exports:

- `identify` — registered globally in `app.js` after `express.json()`. In `AUTH_MODE=clerk` it is `clerkMiddleware()`, which verifies the bearer session token the UI sends. In `AUTH_MODE=dev` (local/e2e only, refused when `NODE_ENV=production`) it reads the identity from the `X-Dev-User` header.
- `authenticate` — per-route guard. Rejects with `401` when there is no signed-in user, otherwise sets `req.user = { id }` where `id` is the Clerk user id.
- `currentAccount(req)` — loads `{ id, email, firstName, lastName }` for the signed-in user from Clerk (or the dev identity). `firstName` falls back to the username, then the email's local part, then `User`, so it is never empty.

```javascript
export const authenticate = (req, res, next) => {
    const userId = env.authMode === 'dev' ? req.devUser?.id : getAuth(req).userId;
    if (!userId) throw unauthorized('Authentication required');
    req.user = { id: userId };
    next();
};
```

User references stored on records (`ownerId`, `userId`, `assignedUserId`) are Clerk user id strings.

Applied per-route in route files, not globally. Every entity route uses it:

```javascript
import { authenticate } from '../middleware/auth.js';

router.get('/', authenticate, controller.list);
```

## Authorize middleware

`authorize.js` exports `authorize(kind, idOf?)`, a per-route guard applied after `authenticate` on every plan-scoped route except `list`. It calls `access.service.authorize(req.user.id, kind, idOf(req), req.body)` (`idOf` defaults to `req.params.id`) and forwards a `404 '<Kind> not found'` when the user is not the owner of or a participant in the plan behind the record, its new parent, or any record the payload references. Unreadable records answer 404, never 403, so ids of other users' records are not confirmed. A payload with an `_id`, a Mongo operator (`$`-prefixed) or a dotted-path key at any depth is refused first with `400 'Invalid field name'`, because services pass `req.body` straight to `new Entity()` and `findByIdAndUpdate`: those keys would bypass the field checks, and a client-chosen `_id` could re-create a deleted record. Parent and reference values must be id strings of existing records.

## Middleware signature

Standard middleware: `(req, res, next) => { ... }`

Error middleware: `(err, req, res, next) => { ... }` (four parameters)

## Adding new middleware

Each middleware is a named export from its own file. File naming: `{purpose}.js` (e.g., `auth.js`, `validate.js`, `rateLimiter.js`).
