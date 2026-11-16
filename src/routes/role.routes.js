import { Router } from 'express';
import * as controller from '../controllers/role.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.get('/', authenticate, controller.list);
router.get('/:id', authenticate, authorize('Role'), controller.get);
router.post('/', authenticate, authorize('Role'), controller.create);
router.put('/:id', authenticate, authorize('Role'), controller.update);
router.delete('/:id', authenticate, authorize('Role'), controller.remove);

export default router;
