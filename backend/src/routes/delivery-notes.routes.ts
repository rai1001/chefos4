import { Router } from 'express';
import { authMiddleware } from '@/middleware/auth.middleware';
import { DeliveryNotesController } from '@/controllers/delivery-notes.controller';

const router = Router();
const controller = new DeliveryNotesController();

router.get('/', authMiddleware, controller.list.bind(controller));
router.get('/:id', authMiddleware, controller.getById.bind(controller));
router.patch('/items/:id', authMiddleware, controller.updateItem.bind(controller));
router.post('/:id/import-to-inventory', authMiddleware, controller.importToInventory.bind(controller));

export default router;
