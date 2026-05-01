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

## Auth middleware

```javascript
export const authenticate = (req, res, next) => {
    next();
};
```

Applied per-route in route files, not globally:

```javascript
import { authenticate } from '../middleware/auth.js';

router.get('/', authenticate, controller.list);
```

## Middleware signature

Standard middleware: `(req, res, next) => { ... }`

Error middleware: `(err, req, res, next) => { ... }` (four parameters)

## Adding new middleware

Each middleware is a named export from its own file. File naming: `{purpose}.js` (e.g., `auth.js`, `validate.js`, `rateLimiter.js`).
