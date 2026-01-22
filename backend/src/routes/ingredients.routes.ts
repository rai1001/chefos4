import { Router } from 'express';
import { IngredientsController, uploadMiddleware } from '@/controllers/ingredients.controller';
import { authMiddleware } from '@/middleware/auth.middleware';

import { validate } from '@/middleware/validation.middleware';
import { createIngredientSchema, updateIngredientSchema } from '@/utils/validators';

const router = Router();
const controller = new IngredientsController();

router.use(authMiddleware);

router.get('/', controller.getAll);
router.get('/low-stock', controller.getLowStock);
router.get('/:id', controller.getById);
router.post('/', validate(createIngredientSchema), controller.create);
router.patch('/:id', validate(updateIngredientSchema), controller.update);
router.delete('/:id', controller.delete);

router.post('/import/analyze', uploadMiddleware, controller.analyzeCSV);
router.post('/import/execute', uploadMiddleware, controller.importCSV);

export default router;

