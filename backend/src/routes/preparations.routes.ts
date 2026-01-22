import { Router } from 'express';
import { PreparationsController, uploadImageMiddleware } from '@/controllers/preparations.controller';
import { authMiddleware } from '@/middleware/auth.middleware';

const router = Router();
const controller = new PreparationsController();

router.use(authMiddleware);

router.get('/', controller.list.bind(controller));
router.post('/', controller.create.bind(controller));
router.patch('/:id', controller.update.bind(controller));

router.post('/:id/batches', controller.createBatch.bind(controller));
router.get('/batches', controller.listBatches.bind(controller));
router.patch('/batches/:id', controller.updateBatch.bind(controller));
router.post('/batches/:id/labels/print', controller.printLabels.bind(controller));
router.post('/batches/:id/expiry/scan', uploadImageMiddleware, controller.scanExpiry.bind(controller));

export default router;
