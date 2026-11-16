import { Router } from 'express';
import * as controller from '../controllers/group.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.get('/', authenticate, controller.list);
router.get('/:id', authenticate, authorize('Group'), controller.get);
router.post('/', authenticate, authorize('Group'), controller.create);
router.put('/:id', authenticate, authorize('Group'), controller.update);
router.delete('/:id', authenticate, authorize('Group'), controller.remove);

export default router;
