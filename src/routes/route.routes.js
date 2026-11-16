import { Router } from 'express';
import * as controller from '../controllers/route.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.get('/', authenticate, controller.list);
router.get('/:id', authenticate, authorize('Route'), controller.get);
router.post('/', authenticate, authorize('Route'), controller.create);
router.post('/calculate', authenticate, authorize('Route'), controller.calculate);
router.post('/preview', authenticate, authorize('Route'), controller.preview);
router.post('/recalculate-all', authenticate, authorize('Plan', (req) => req.body.planId), controller.recalculateAll);
router.put('/:id', authenticate, authorize('Route'), controller.update);
router.delete('/:id', authenticate, authorize('Route'), controller.remove);

export default router;
