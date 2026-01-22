import { Router } from 'express';
import { ScheduleController } from '@/controllers/schedule.controller';
import { authMiddleware } from '@/middleware/auth.middleware';

const router = Router();
const controller = new ScheduleController();

router.use(authMiddleware);

router.post('/months', controller.createMonth.bind(controller));
router.get('/months/:id', controller.getMonth.bind(controller));
router.post('/months/:id/publish', controller.publishMonth.bind(controller));

router.post('/shifts', controller.createShift.bind(controller));
router.patch('/shifts/:id', controller.updateShift.bind(controller));
router.patch('/shifts/:id/assignments', controller.updateAssignments.bind(controller));

export default router;
