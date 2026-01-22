import { Router } from 'express';
import { EventsController } from '@/controllers/events.controller';
import { authMiddleware } from '@/middleware/auth.middleware';
import { validate } from '@/middleware/validation.middleware';
import { createEventSchema } from '@/utils/validators';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();
const controller = new EventsController();

router.use(authMiddleware);

router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.post('/', validate(createEventSchema), controller.create);
router.post('/import', upload.single('file'), controller.importCSV);
router.patch('/:id', controller.update);
router.delete('/:id', controller.delete);
router.get('/:id/calculate-demand', controller.calculateDemand);
router.post('/:id/generate-purchase-orders', controller.generatePurchaseOrders);

export default router;

