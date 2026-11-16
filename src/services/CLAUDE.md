# Service Standards

Every file in `src/services/` contains the business logic and database operations for a single entity. Services are the only layer that interacts with Mongoose models.

## File naming

`{entity}.service.js` — lowercase entity name, singular.

## Template

```javascript
import Entity from '../models/{entity}.model.js';

export const list = async (query = {}) => {
    const { skip = 0, limit = 50 } = query;
    const [items, totalCount] = await Promise.all([
        Entity.find().skip(Number(skip)).limit(Number(limit)),
        Entity.countDocuments(),
    ]);
    return { items, totalCount };
};

export const get = async (id) => {
    const item = await Entity.findById(id);
    if (!item) throw Object.assign(new Error('Entity not found'), { status: 404 });
    return item;
};

export const create = async (data) => {
    const item = new Entity(data);
    return item.save();
};

export const update = async (id, data) => {
    const item = await Entity.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!item) throw Object.assign(new Error('Entity not found'), { status: 404 });
    return item;
};

export const remove = async (id) => {
    const item = await Entity.findByIdAndDelete(id);
    if (!item) throw Object.assign(new Error('Entity not found'), { status: 404 });
    return item;
};
```

## Rules

### Named exports only

Every function is a named `export const`. No default export.

### Five standard functions

Every entity gets `list`, `get`, `create`, `update`, `remove` in that order.

### Model import

Import the model as a default import: `import Entity from '../models/{entity}.model.js'`. Use PascalCase for the model name.

### List always returns `{ items, totalCount }`

Use `Promise.all` to run the query and count in parallel. Always convert `skip` and `limit` to numbers with `Number()`.

### Error throwing pattern

When an entity is not found, throw an error with a `status` property:

```javascript
throw Object.assign(new Error('Entity not found'), { status: 404 });
```

Replace `Entity` with the actual entity name in the error message: `'Plan not found'`, `'Step not found'`, etc.

### Update options

Always pass `{ new: true, runValidators: true }` to `findByIdAndUpdate`:
- `new: true` — return the updated document, not the original
- `runValidators: true` — enforce schema validation on update

### No request/response objects

Services never access `req` or `res`. They receive plain data and return plain data. The controller handles HTTP concerns.

### Adding custom functions

Custom functions follow the same error-throwing pattern and go after the five standard functions:

```javascript
export const assign = async (id, data) => {
    const item = await Entity.findById(id);
    if (!item) throw Object.assign(new Error('Entity not found'), { status: 404 });
    item.assignedUserId = data.userId;
    return item.save();
};
```

### Filtering in list

When adding filters, apply them as a query object to `find()` and `countDocuments()`:

```javascript
export const list = async (query = {}) => {
    const { skip = 0, limit = 50, planId } = query;
    const filter = {};
    if (planId) filter.planId = planId;
    const [items, totalCount] = await Promise.all([
        Entity.find(filter).skip(Number(skip)).limit(Number(limit)),
        Entity.countDocuments(filter),
    ]);
    return { items, totalCount };
};
```

### Access scoping in list

`list` only returns records in plans the signed-in user can access. The controller passes `userId`; scope the filter with `accessiblePlanIds` from `access.service.js` and AND any requested filter onto it:

```javascript
import { accessiblePlanIds } from './access.service.js';

export const list = async (query = {}) => {
    const { skip = 0, limit = 50, planId, userId } = query;
    const filter = { planId: { $in: await accessiblePlanIds(userId) } };
    if (planId) filter.planId.$eq = planId;
    ...
};
```

Records keyed to a parent instead of `planId` scope through it (e.g. steps and windows via their itinerary's `planId`).

### Access service

`access.service.js` owns authorization data rules. A user can access a plan they own (`ownerId`) or participate in (a `Participant` with their Clerk `userId`). Fields that grant access are never taken from a request body: `plan.service` sets `ownerId` itself, and `participant.service` drops `userId` from create and update bodies (it is set only by the Clerk email lookup and the webhook's `linkUserByEmail`). Its `RECORDS` map says how each plan-scoped kind reaches its plan (`parent`) and which payload fields reference other records (`refs`); `authorize` checks the record, its parent on create/move, and that every referenced record sits in the same plan, throwing `404 '<Kind> not found'` otherwise. It first refuses any payload containing an `_id`, a `$`-prefixed key or a dotted key (at any depth) with `400 'Invalid field name'`, so update operators, dotted paths and client-chosen ids cannot slip past those checks. Parent and reference values must be id strings that resolve to an existing record in the same plan. When adding a plan-scoped entity or a reference field, add it to `RECORDS`.

Deletes cascade to every record parented by the deleted one, so no orphan keeps a dead parent id: `plan.remove` deletes the plan's Groups, Itineraries, Locations, Participants, Roles and Times plus their Steps, Windows, Timeslots and Routes; `itinerary.remove` deletes its Steps, Windows and their Timeslots; `window.remove` its Timeslots; `location.remove` the Routes that start at it. When adding a parented entity, add it to its parent's cascade.

Profiles are per-user, not per-plan: the profile service takes the signed-in `userId` and only touches profiles with that `userId`.
