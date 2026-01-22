import { Router } from 'express';
import { TimeOffController } from '@/controllers/time-off.controller';
import { authMiddleware } from '@/middleware/auth.middleware';

const router = Router();
const controller = new TimeOffController();

router.use(authMiddleware);

router.get('/', controller.list.bind(controller));
router.post('/', controller.request.bind(controller));
router.patch('/:id/approve', controller.approve.bind(controller));
router.patch('/:id/reject', controller.reject.bind(controller));

export default router;
