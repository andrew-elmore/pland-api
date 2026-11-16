import { Router } from 'express';
import * as controller from '../controllers/location.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.get('/', authenticate, controller.list);
router.get('/:id', authenticate, authorize('Location'), controller.get);
router.post('/', authenticate, authorize('Location'), controller.create);
router.put('/:id', authenticate, authorize('Location'), controller.update);
router.delete('/:id', authenticate, authorize('Location'), controller.remove);

export default router;
