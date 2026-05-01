# pland-api

Node.js + Express + MongoDB API.

## Development Commands

```bash
npm install
npm run dev      # Start with nodemon
npm start        # Start production
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

User, Profile, Role, Plan, Itinerary, Step, Time, Location, Route, Window, Timeslot

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

Create `.env` from `.env.example`. Required variables:

- `PORT` — server port (default 3001)
- `MONGODB_URI` — MongoDB connection string

## ES Modules

This project uses ES modules (`"type": "module"` in package.json). All imports use the `import` keyword and must include the `.js` extension.
