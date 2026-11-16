import { Router } from 'express';
import * as controller from '../controllers/step.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.get('/', authenticate, controller.list);
router.get('/:id', authenticate, authorize('Step'), controller.get);
router.post('/', authenticate, authorize('Step'), controller.create);
router.post('/create-with-duration', authenticate, authorize('Step'), controller.createWithDuration);
router.post('/create-with-travel', authenticate, authorize('Step'), controller.createWithTravel);
router.put('/:id', authenticate, authorize('Step'), controller.update);
router.delete('/:id', authenticate, authorize('Step'), controller.remove);

export default router;
