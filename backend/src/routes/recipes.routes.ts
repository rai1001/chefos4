import { Router } from 'express';
import { RecipesController } from '@/controllers/recipes.controller';
import { authMiddleware } from '@/middleware/auth.middleware';
import { validate } from '@/middleware/validation.middleware';
import { createRecipeSchema, updateRecipeSchema } from '@/utils/validators';

const router = Router();
const controller = new RecipesController();

router.use(authMiddleware);

router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.post('/', validate(createRecipeSchema), controller.create);
router.patch('/:id', validate(updateRecipeSchema), controller.update);
router.delete('/:id', controller.delete);

export default router;
