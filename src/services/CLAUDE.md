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

Replace `Entity` with the actual entity name in the error message: `'Plan not found'`, `'User not found'`, etc.

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
