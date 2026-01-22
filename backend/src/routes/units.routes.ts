import { Router } from 'express';
import { UnitsController } from '@/controllers/units.controller';
import { authMiddleware } from '@/middleware/auth.middleware';

const router = Router();
const controller = new UnitsController();

router.use(authMiddleware);
router.get('/', controller.getAll);

export default router;
