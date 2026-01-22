import { Router } from 'express';
import { ProductionController } from '@/controllers/production.controller';
import { authMiddleware } from '@/middleware/auth.middleware';

const router = Router();
const productionController = new ProductionController();

// Todas las rutas de producción requieren autenticación
router.use(authMiddleware);

router.get('/', productionController.getTasks);
router.post('/', productionController.createTask);
router.patch('/:id', productionController.updateTask);
router.post('/auto-generate', productionController.autoGenerateTasks);

export default router;
