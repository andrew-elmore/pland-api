import { Router } from 'express';
import * as controller from '../controllers/route.controller.js';

const router = Router();

router.get('/', controller.list);
router.get('/:id', controller.get);
router.post('/', controller.create);
router.post('/calculate', controller.calculate);
router.post('/preview', controller.preview);
router.post('/recalculate-all', controller.recalculateAll);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

export default router;
