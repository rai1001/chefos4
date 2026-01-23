import { Router } from 'express';
import { authMiddleware } from '@/middleware/auth.middleware';
import { ScheduleCoverageController } from '@/controllers/schedule-coverage.controller';

const router = Router();
const controller = new ScheduleCoverageController();

router.use(authMiddleware);

router.get('/coverage-rules', controller.getCoverageRules.bind(controller));
router.patch('/coverage-rules', controller.updateCoverageRules.bind(controller));
router.post('/coverage-overrides', controller.createOverride.bind(controller));

export default router;
