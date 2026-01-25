import { Router } from 'express';
import { ReportsController } from '@/controllers/reports.controller';
import { authMiddleware } from '@/middleware/auth.middleware';

const router = Router();
const reportsController = new ReportsController();

router.use(authMiddleware);

router.get('/inventory/excel', (req, res) => reportsController.exportInventory(req, res));
router.get('/production/excel', (req, res) => reportsController.exportProduction(req, res));
router.get('/food-cost/pdf', (req, res) => reportsController.exportFoodCostPDF(req, res));
router.get('/purchase-orders/excel', (req, res) => reportsController.exportPurchaseOrdersExcel(req, res));

export default router;
