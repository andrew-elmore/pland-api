# pland-api

Node.js + Express + MongoDB API.

## Development Commands

```bash
npm install
npm run dev      # Start with nodemon
npm start        # Start production
npm test         # Authorization tests (node:test); requires TEST_MONGODB_URI pointing at a throwaway mongod, its database is dropped
```

## Architecture

Flat-by-layer structure. Every entity follows the same 4-layer flow:

```
Route → Controller → Service → Model
```

```
src/
├── models/          # Mongoose schemas — one file per entity
├── routes/          # Express routers — one file per entity + index.js barrel
├── controllers/     # Request/response handlers — one file per entity
├── services/        # Business logic and database operations — one file per entity
├── middleware/       # Express middleware (auth, error handling)
├── config/          # Environment and database configuration
└── utils/           # Shared utilities (schema options, helpers)
```

- **Routes** define HTTP endpoints and apply middleware
- **Controllers** handle request/response, delegate to services
- **Services** contain business logic, interact with models
- **Models** define Mongoose schemas and data access

## Pattern Enforcement

When a pattern is established or modified for any layer, a generic version of that pattern MUST be placed into the relevant directory's CLAUDE.md file. Each directory's CLAUDE.md is the single source of truth for how every file in that directory should be structured.

When creating a new entity, follow the CLAUDE.md template in each directory exactly. When modifying a pattern (adding a new method, changing the error format, etc.), update the CLAUDE.md first, then apply the change across all existing files.

## File Naming

- Models: `{entity}.model.js`
- Routes: `{entity}.routes.js`
- Controllers: `{entity}.controller.js`
- Services: `{entity}.service.js`

## Response Format

- List endpoints return `{ items, totalCount }`
- Single-entity endpoints return the entity object directly
- Create returns `201` with the created entity
- Delete returns `204` with no body
- Errors return `{ error: "message" }` with appropriate status code

## Entities

Profile, Role, Plan, Itinerary, Step, Time, Location, Route, Window, Timeslot

## API Base Path

All routes are mounted under `/api`. Entity routes are plural:

```
GET    /api/plans
GET    /api/plans/:id
POST   /api/plans
PUT    /api/plans/:id
DELETE /api/plans/:id
```

## Environment

Create `.env` from `.env.example`. Variables:

- `PORT` — server port (default 3001)
- `MONGODB_URI` — MongoDB connection string (MongoDB Atlas in production)
- `CORS_ORIGIN` — UI origin allowed by CORS and as Clerk's authorized party (default `http://localhost:3000`)
- `AUTH_MODE` — `clerk` (default) or `dev` (local/e2e only; forbidden when `NODE_ENV=production`)
- `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` — required when `AUTH_MODE=clerk`
- `CLERK_WEBHOOK_SIGNING_SECRET` — signing secret for `POST /api/webhooks/clerk`
- `GOOGLE_MAPS_API_KEY` — Google Maps server key

## Authentication

Clerk handles sign-up and sign-in. The UI sends the Clerk session token as `Authorization: Bearer <token>`; `clerkMiddleware()` verifies it and `authenticate` exposes the Clerk user id as `req.user.id`. See `src/middleware/CLAUDE.md`.

Authorization is per plan: a user can act only on records in plans they own or participate in (a `Participant` linked to their Clerk user id). Routes apply `authorize` (see `src/middleware/CLAUDE.md`), list services scope by `accessiblePlanIds`, and everything else answers `404`. Profiles are scoped to their own `userId`.

`GET /health` returns `{ status: 'ok' }` for the Render health check.

## Deploy

`render.yaml` defines both Render services: `pland-api` deploys from `master` (production, CORS to `https://pland-ui.onrender.com`) and `pland-api-test` deploys from `develop` (test, CORS to `https://pland-ui-test.onrender.com`). Both run on the free plan with `healthCheckPath: /health`. Every secret is `sync: false` and set per service in the Render dashboard: `MONGODB_URI` (separate Atlas database per environment), `CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` (shared Clerk dev keys), `CLERK_WEBHOOK_SIGNING_SECRET` (per environment webhook endpoint), `GOOGLE_MAPS_API_KEY`. Keep `render.yaml` free of comments.

CI (`.github/workflows/ci.yml`) runs `npm test` against a MongoDB service container on pushes to `master` and `develop` and on pull requests. `npm test` refuses to run without `TEST_MONGODB_URI`; never point it at a real database.

## ES Modules

This project uses ES modules (`"type": "module"` in package.json). All imports use the `import` keyword and must include the `.js` extension.
