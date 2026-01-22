
import { Router } from 'express';
import { HRController } from '@/controllers/hr.controller';
import { authMiddleware } from '@/middleware/auth.middleware';

const router = Router();
const controller = new HRController();

router.use(authMiddleware);

router.get('/employees', controller.getEmployees);
router.post('/invite', controller.invite);
router.get('/schedules', controller.getSchedules);
router.post('/schedules', controller.saveSchedule);

export default router;
