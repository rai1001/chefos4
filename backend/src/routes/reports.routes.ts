import { Router } from 'express';
import { ReportsController } from '@/controllers/reports.controller';
import { authMiddleware } from '@/middleware/auth.middleware';

const router = Router();
const reportsController = new ReportsController();

router.use(authMiddleware);

router.get('/inventory', (req, res) => reportsController.exportInventory(req, res));
router.get('/production', (req, res) => reportsController.exportProduction(req, res));
router.get('/purchase-orders/pdf', (req, res) => reportsController.exportPurchaseOrdersPDF(req, res));

export default router;
