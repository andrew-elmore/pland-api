import { Router } from 'express';
import * as controller from '../controllers/time.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.get('/', authenticate, controller.list);
router.get('/:id', authenticate, authorize('Time'), controller.get);
router.post('/', authenticate, authorize('Time'), controller.create);
router.put('/:id', authenticate, authorize('Time'), controller.update);
router.delete('/:id', authenticate, authorize('Time'), controller.remove);

router.post('/:id/merge', authenticate, authorize('Time'), controller.merge);

export default router;
