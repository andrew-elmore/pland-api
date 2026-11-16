import { Router } from 'express';
import * as controller from '../controllers/participant.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.get('/', authenticate, controller.list);
router.get('/:id', authenticate, authorize('Participant'), controller.get);
router.post('/', authenticate, authorize('Participant'), controller.create);
router.put('/:id', authenticate, authorize('Participant'), controller.update);
router.delete('/:id', authenticate, authorize('Participant'), controller.remove);

export default router;
