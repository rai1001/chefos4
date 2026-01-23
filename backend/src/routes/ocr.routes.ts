import { Router } from 'express';
import { processDeliveryNote, getDeliveryNotes } from '../controllers/ocr.controller';
import { authMiddleware } from '@/middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.post('/process', processDeliveryNote);
router.get('/', getDeliveryNotes);

export default router;
