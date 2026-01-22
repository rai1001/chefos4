import { Router } from 'express';
import { ScheduleRulesController } from '@/controllers/schedule-rules.controller';
import { authMiddleware } from '@/middleware/auth.middleware';

const router = Router();
const controller = new ScheduleRulesController();

router.use(authMiddleware);

router.get('/staff/:staffId', controller.getStaffRules.bind(controller));
router.patch('/staff/:staffId', controller.updateStaffRules.bind(controller));
router.get('/org', controller.getOrgRules.bind(controller));
router.patch('/org', controller.updateOrgRules.bind(controller));

export default router;
