# pland-api

Express + Mongoose API for Pland. Data lives in MongoDB Atlas; authentication is handled by [Clerk](https://clerk.com).

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Fill in `.env`:

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB connection string (Atlas or local) |
| `CORS_ORIGIN` | UI origin, e.g. `http://localhost:3000` |
| `AUTH_MODE` | `clerk` (default). `dev` skips Clerk for local/e2e runs and is refused when `NODE_ENV=production` |
| `CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` | From the Clerk dashboard, API keys page |
| `CLERK_WEBHOOK_SIGNING_SECRET` | From the Clerk webhook endpoint for `user.created` |
| `GOOGLE_MAPS_API_KEY` | Google Maps server key used for routing |

## Authentication

The UI sends the Clerk session token as a bearer token. `clerkMiddleware()` verifies it on every request, and each entity route uses `authenticate`, which rejects signed-out requests with `401` and sets `req.user.id` to the Clerk user id. Records reference users by Clerk user id (`Plan.ownerId`, `Participant.userId`, and so on).

`POST /api/webhooks/clerk` receives Clerk's `user.created` event and links existing plan participants whose email matches the new user's verified email.

Creating a plan adds the creator as the plan's admin participant, which needs an email and a first name. In the Clerk dashboard (User & authentication), require **Email address** and turn on **First and last name** as required. If a user still has no first name, the API falls back to their username, then the part of their email before `@`, then `User`.

## Tests

```bash
TEST_MONGODB_URI=mongodb://127.0.0.1:<port>/pland-authorization-test npm test
```

The authorization suite drops its database before and after running, so it refuses to start unless `TEST_MONGODB_URI` points at a disposable mongod. CI (`.github/workflows/ci.yml`) runs it against a MongoDB service container on pushes to `master` and `develop` and on pull requests into either.

## Deploy (Render)

`render.yaml` is a Render Blueprint that defines both environments as Node web services on the free plan, each with a health check on `/health`:

| Service | Branch | URL | `CORS_ORIGIN` |
|---|---|---|---|
| `pland-api` (production) | `master` | `https://pland-api.onrender.com` | `https://pland-ui.onrender.com` |
| `pland-api-test` (test) | `develop` | `https://pland-api-test.onrender.com` | `https://pland-ui-test.onrender.com` |

In Render, create one Blueprint from this repo; it creates both services. Then set the `sync: false` secrets on each service in the dashboard:

- `MONGODB_URI`: a separate MongoDB Atlas database per environment. In Atlas, allow connections from Render (Network Access).
- `CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY`: the same Clerk development instance keys on both services.
- `CLERK_WEBHOOK_SIGNING_SECRET`: each environment has its own Clerk webhook endpoint (`https://pland-api.onrender.com/api/webhooks/clerk` and `https://pland-api-test.onrender.com/api/webhooks/clerk`, both subscribed to `user.created`); use the signing secret of that environment's endpoint.
- `GOOGLE_MAPS_API_KEY`: Google Maps server key.
