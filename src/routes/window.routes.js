import { Router } from 'express';
import * as controller from '../controllers/window.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.get('/', authenticate, controller.list);
router.get('/:id', authenticate, authorize('Window'), controller.get);
router.post('/', authenticate, authorize('Window'), controller.create);
router.put('/:id', authenticate, authorize('Window'), controller.update);
router.delete('/:id', authenticate, authorize('Window'), controller.remove);

export default router;
