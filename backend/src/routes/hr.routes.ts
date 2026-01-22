
import { Router } from 'express';
import { HRController } from '@/controllers/hr.controller';
import { authMiddleware } from '@/middleware/auth.middleware';

const router = Router();
const controller = new HRController();

router.use(authMiddleware);

router.get('/employees', controller.getEmployees.bind(controller));
router.post('/invite', controller.invite.bind(controller));
router.get('/schedules', controller.getSchedules.bind(controller));
router.post('/schedules', controller.saveSchedule.bind(controller));

export default router;
