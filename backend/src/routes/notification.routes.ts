
import { Router } from 'express';
import { NotificationController } from '@/controllers/notification.controller';
import { authMiddleware } from '@/middleware/auth.middleware';

const router = Router();
const controller = new NotificationController();

router.use(authMiddleware);

router.get('/', (req, res) => controller.list(req, res));
router.patch('/:id/read', (req, res) => controller.markAsRead(req, res));
router.post('/read-all', (req, res) => controller.markAllAsRead(req, res));

export default router;
