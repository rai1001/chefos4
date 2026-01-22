import { Router } from 'express';
import { StaffController } from '@/controllers/staff.controller';
import { authMiddleware } from '@/middleware/auth.middleware';

const router = Router();
const controller = new StaffController();

router.use(authMiddleware);

router.get('/', controller.list.bind(controller));
router.post('/', controller.create.bind(controller));
router.patch('/:id', controller.update.bind(controller));
router.get('/:id/vacation-balance', controller.getVacationBalance.bind(controller));

export default router;
