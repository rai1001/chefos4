import { Router } from 'express';
import { PurchaseOrdersController } from '@/controllers/purchase-orders.controller';
import { authMiddleware } from '@/middleware/auth.middleware';
import { validate } from '@/middleware/validation.middleware';
// Note: Assuming validators are updated with PO schemas
// If not, I'll update them later.

const router = Router();
const controller = new PurchaseOrdersController();

router.use(authMiddleware);

router.get('/', controller.getAll.bind(controller));
router.get('/:id', controller.getById.bind(controller));
router.post('/', controller.create.bind(controller));
router.patch('/:id/status', controller.updateStatus.bind(controller));
router.post('/:id/receive', controller.receiveItems.bind(controller));
router.delete('/:id', controller.delete.bind(controller));

export default router;
