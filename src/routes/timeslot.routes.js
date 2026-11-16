import { Router } from 'express';
import * as controller from '../controllers/timeslot.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.get('/', authenticate, controller.list);
router.get('/:id', authenticate, authorize('Timeslot'), controller.get);
router.post('/', authenticate, authorize('Timeslot'), controller.create);
router.put('/:id', authenticate, authorize('Timeslot'), controller.update);
router.delete('/:id', authenticate, authorize('Timeslot'), controller.remove);

export default router;
