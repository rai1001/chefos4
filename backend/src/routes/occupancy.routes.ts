import { Router } from 'express';
import { authMiddleware } from '@/middleware/auth.middleware';
import { OccupancyController } from '@/controllers/occupancy.controller';
import multer from 'multer';

const router = Router();
const controller = new OccupancyController();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', authMiddleware, controller.list);
router.post('/import', authMiddleware, upload.single('file'), controller.importCSV.bind(controller));

export default router;
