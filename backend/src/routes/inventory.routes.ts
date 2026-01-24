import { Router } from 'express';
import { authMiddleware } from '@/middleware/auth.middleware';
import { InventoryController, uploadImageMiddleware } from '@/controllers/inventory.controller';
import { validate } from '@/middleware/validation.middleware';
import {
    stockOutSchema,
    createLocationSchema,
    updateLocationSchema,
    updateBatchSchema,
    createCycleCountSchema,
    updateCycleCountItemsSchema,
} from '@/utils/validators';

const router = Router();
const controller = new InventoryController();

router.get('/batches', authMiddleware, controller.listBatches.bind(controller));
router.get('/stock', authMiddleware, controller.listStockSummary.bind(controller));
router.patch('/batches/:id', authMiddleware, validate(updateBatchSchema), controller.updateBatch.bind(controller));
router.post('/batches/:id/expiry/scan', authMiddleware, uploadImageMiddleware, controller.scanExpiry.bind(controller));

router.post('/stock-out', authMiddleware, validate(stockOutSchema), controller.stockOut.bind(controller));

router.get('/locations', authMiddleware, controller.listLocations.bind(controller));
router.post('/locations', authMiddleware, validate(createLocationSchema), controller.createLocation.bind(controller));
router.patch('/locations/:id', authMiddleware, validate(updateLocationSchema), controller.updateLocation.bind(controller));
router.delete('/locations/:id', authMiddleware, controller.deleteLocation.bind(controller));

router.get('/cycle-counts', authMiddleware, controller.listCycleCounts.bind(controller));
router.post('/cycle-counts', authMiddleware, validate(createCycleCountSchema), controller.createCycleCount.bind(controller));
router.get('/cycle-counts/:id', authMiddleware, controller.getCycleCount.bind(controller));
router.patch(
    '/cycle-counts/:id/items',
    authMiddleware,
    validate(updateCycleCountItemsSchema),
    controller.updateCycleCountItems.bind(controller)
);
router.post('/cycle-counts/:id/complete', authMiddleware, controller.completeCycleCount.bind(controller));

router.get('/alerts', authMiddleware, controller.listAlerts.bind(controller));
router.patch('/alerts/:id/resolve', authMiddleware, controller.resolveAlert.bind(controller));
router.post('/alerts/run', authMiddleware, controller.runAlerts.bind(controller));

export default router;
