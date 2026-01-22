import { Router } from 'express';
import { webhookController } from '../controllers/webhook.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.post('/', webhookController.create);
router.get('/', webhookController.list);
router.put('/:id', webhookController.update);
router.delete('/:id', webhookController.delete);
router.get('/:id/history', webhookController.getHistory);
router.post('/test', webhookController.testDispatch);

export default router;
