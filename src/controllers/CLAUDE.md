# Controller Standards

Every file in `src/controllers/` handles HTTP request/response for a single entity. Controllers are thin — they extract data from the request, call the service, and send the response.

## File naming

`{entity}.controller.js` — lowercase entity name, singular.

## Template

```javascript
import * as entityService from '../services/{entity}.service.js';

export const list = async (req, res, next) => {
    try {
        const result = await entityService.list(req.query);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

export const get = async (req, res, next) => {
    try {
        const result = await entityService.get(req.params.id);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

export const create = async (req, res, next) => {
    try {
        const result = await entityService.create(req.body);
        res.status(201).json(result);
    } catch (err) {
        next(err);
    }
};

export const update = async (req, res, next) => {
    try {
        const result = await entityService.update(req.params.id, req.body);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

export const remove = async (req, res, next) => {
    try {
        await entityService.remove(req.params.id);
        res.status(204).end();
    } catch (err) {
        next(err);
    }
};
```

## Rules

### Named exports only

Every handler is a named `export const`. No default export.

### Five standard handlers

Every entity gets `list`, `get`, `create`, `update`, `remove` in that order.

### Service import

Always import the service as a namespace: `import * as entityService from '../services/{entity}.service.js'`.

### Error handling

Every handler wraps its body in `try/catch` and calls `next(err)` on failure. Never send error responses directly — let the centralized `errorHandler` middleware handle it.

### Response status codes

| Operation | Status | Body |
|---|---|---|
| list | 200 | `{ items, totalCount }` |
| get | 200 | entity object |
| create | 201 | created entity |
| update | 200 | updated entity |
| remove | 204 | no body (`.end()`) |

### Request data sources

- `req.params.id` — entity ID from URL
- `req.query` — query string parameters (pagination, filters)
- `req.body` — request payload (create and update)

### No business logic

Controllers never access models directly. They never contain conditionals, transformations, or validation beyond what Express provides. All logic goes in the service.

### Adding custom handlers

Custom handlers follow the same pattern and go after the five standard handlers:

```javascript
export const assign = async (req, res, next) => {
    try {
        const result = await entityService.assign(req.params.id, req.body);
        res.json(result);
    } catch (err) {
        next(err);
    }
};
```
