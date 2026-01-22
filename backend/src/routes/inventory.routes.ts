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

router.get('/cycle-counts', authMiddleware, controller.listCycleCounts.bind(controller));
router.post('/cycle-counts', authMiddleware, controller.createCycleCount.bind(controller));
router.get('/cycle-counts/:id', authMiddleware, controller.getCycleCount.bind(controller));
router.patch('/cycle-counts/:id/items', authMiddleware, controller.updateCycleCountItems.bind(controller));
router.post('/cycle-counts/:id/complete', authMiddleware, controller.completeCycleCount.bind(controller));

router.get('/alerts', authMiddleware, controller.listAlerts.bind(controller));
router.patch('/alerts/:id/resolve', authMiddleware, controller.resolveAlert.bind(controller));
router.post('/alerts/run', authMiddleware, controller.runAlerts.bind(controller));

export default router;
