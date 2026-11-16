# Config Standards

All configuration lives in `src/config/`.

## `env.js`

Single source for environment variables. Loads `.env` via dotenv and exports a plain object with defaults:

```javascript
import dotenv from 'dotenv';

dotenv.config();

const env = {
    port: process.env.PORT || 3001,
    mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/pland',
};

export default env;
```

Startup validation (invalid `AUTH_MODE`, `AUTH_MODE=dev` in production, missing Clerk keys in clerk mode) throws from `env.js` so the server fails fast.

## `clerk.js`

Exports the shared Clerk backend client built with `createClerkClient` from the keys in `env.js`. Middleware and services import it instead of `@clerk/express`'s env-reading default client.

When adding a new environment variable, add it here with a sensible default and add the key to `.env.example`.

## `db.js`

Database connection. Imports `env.js` for the connection string:

```javascript
import mongoose from 'mongoose';
import env from './env.js';

const connectDB = async () => {
    const conn = await mongoose.connect(env.mongoUri);
    console.log(`:~: MongoDB connected: ${conn.connection.host}`);
};

export default connectDB;
```

## Rules

- All environment access goes through `env.js` — never use `process.env` directly in other files
- Every environment variable has a default value in `env.js`
- Every environment variable is listed in `.env.example`
