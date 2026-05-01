# Route Standards

Every file in `src/routes/` defines an Express router for a single entity. `index.js` is the barrel that mounts all entity routers.

## File naming

`{entity}.routes.js` — lowercase entity name, singular.

## Template

```javascript
import { Router } from 'express';
import * as controller from '../controllers/{entity}.controller.js';

const router = Router();

router.get('/', controller.list);
router.get('/:id', controller.get);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

export default router;
```

## Rules

### Five standard routes

Every entity gets these five routes in this order: `list`, `get`, `create`, `update`, `remove`.

### Controller import

Always import the controller as a namespace: `import * as controller from '../controllers/{entity}.controller.js'`. Reference handlers as `controller.list`, `controller.get`, etc.

### No inline handlers

Route files never contain request handling logic. They only wire HTTP methods to controller functions.

### Adding custom routes

Custom routes go after the five standard routes:

```javascript
router.get('/', controller.list);
router.get('/:id', controller.get);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

router.post('/:id/assign', controller.assign);
```

### Middleware on routes

Apply middleware between the path and the handler:

```javascript
import { authenticate } from '../middleware/auth.js';

router.get('/', authenticate, controller.list);
```

### Barrel file (`index.js`)

`index.js` imports all entity routers and mounts them on their plural path:

```javascript
import { Router } from 'express';
import userRoutes from './user.routes.js';
import planRoutes from './plan.routes.js';

const router = Router();

router.use('/users', userRoutes);
router.use('/plans', planRoutes);

export default router;
```

When adding a new entity, add both the import and the `router.use` line to `index.js`. Keep entries in alphabetical order after the existing entries.

### Path naming

Paths are lowercase plural: `/users`, `/plans`, `/itineraries`, `/timeslots`.
