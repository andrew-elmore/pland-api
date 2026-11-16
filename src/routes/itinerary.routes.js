import { Router } from 'express';
import * as controller from '../controllers/itinerary.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.get('/', authenticate, controller.list);
router.get('/:id', authenticate, authorize('Itinerary'), controller.get);
router.post('/', authenticate, authorize('Itinerary'), controller.create);
router.put('/:id', authenticate, authorize('Itinerary'), controller.update);
router.delete('/:id', authenticate, authorize('Itinerary'), controller.remove);

export default router;
