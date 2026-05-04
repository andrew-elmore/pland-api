import { Router } from 'express';
import * as controller from '../controllers/step.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, controller.list);
router.get('/:id', authenticate, controller.get);
router.post('/', authenticate, controller.create);
router.post('/create-with-duration', authenticate, controller.createWithDuration);
router.post('/create-with-travel', authenticate, controller.createWithTravel);
router.put('/:id', authenticate, controller.update);
router.delete('/:id', authenticate, controller.remove);

export default router;
