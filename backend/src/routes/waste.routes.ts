import { Router } from 'express';
import { WasteController } from '@/controllers/waste.controller';
import { authMiddleware } from '@/middleware/auth.middleware';

const router = Router();
const wasteController = new WasteController();

router.use(authMiddleware);

router.post('/', wasteController.recordWaste);
router.get('/analysis', wasteController.getAnalysis);

export default router;
