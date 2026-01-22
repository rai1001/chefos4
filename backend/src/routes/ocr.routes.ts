import { Router } from 'express';
import { processDeliveryNote, getDeliveryNotes } from '../controllers/ocr.controller';

const router = Router();

router.post('/process', processDeliveryNote);
router.get('/', getDeliveryNotes);

export default router;
