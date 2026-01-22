import { Router } from 'express';
import { ProductFamiliesController } from '@/controllers/product-families.controller';
import { authMiddleware } from '@/middleware/auth.middleware';
import { validate } from '@/middleware/validation.middleware';
import { createProductFamilySchema, updateProductFamilySchema } from '@/utils/validators';

const router = Router();
const controller = new ProductFamiliesController();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.post('/', validate(createProductFamilySchema), controller.create);
router.patch('/:id', validate(updateProductFamilySchema), controller.update);
router.delete('/:id', controller.delete);

export default router;
