import { Router } from 'express';
import { authMiddleware } from '@/middleware/auth.middleware';
import { InventoryController, uploadImageMiddleware } from '@/controllers/inventory.controller';

const router = Router();
const controller = new InventoryController();

router.get('/batches', authMiddleware, controller.listBatches.bind(controller));
router.patch('/batches/:id', authMiddleware, controller.updateBatch.bind(controller));
router.post('/batches/:id/expiry/scan', authMiddleware, uploadImageMiddleware, controller.scanExpiry.bind(controller));

router.post('/stock-out', authMiddleware, controller.stockOut.bind(controller));

router.get('/locations', authMiddleware, controller.listLocations.bind(controller));
router.post('/locations', authMiddleware, controller.createLocation.bind(controller));
router.patch('/locations/:id', authMiddleware, controller.updateLocation.bind(controller));
router.delete('/locations/:id', authMiddleware, controller.deleteLocation.bind(controller));

export default router;
