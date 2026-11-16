import { Router } from 'express';
import * as controller from '../controllers/plan.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.get('/', authenticate, controller.list);
router.get('/:id', authenticate, authorize('Plan'), controller.get);
router.post('/', authenticate, authorize('Plan'), controller.create);
router.put('/:id', authenticate, authorize('Plan'), controller.update);
router.delete('/:id', authenticate, authorize('Plan'), controller.remove);

export default router;
