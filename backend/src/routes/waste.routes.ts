import { Router } from 'express';
import { WasteController } from '@/controllers/waste.controller';
import { authMiddleware } from '@/middleware/auth.middleware';

const router = Router();
const controller = new WasteController();

router.use(authMiddleware);

router.get('/causes', controller.getCauses);
router.post('/causes', controller.createCause);
router.post('/log', controller.createWasteEntry);
router.get('/stats', controller.getStats);

export default router;
