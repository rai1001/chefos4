import { Router } from 'express';
import { SuppliersController } from '@/controllers/suppliers.controller';
import { authMiddleware } from '@/middleware/auth.middleware';
import { validate } from '@/middleware/validation.middleware';
import { createSupplierSchema, updateSupplierSchema } from '@/utils/validators';

const router = Router();
const controller = new SuppliersController();

router.use(authMiddleware);

router.get('/', controller.getAll);
router.get('/cutoff-status/all', controller.getWithCutoffStatus);
router.get('/:id', controller.getById);
router.post('/', validate(createSupplierSchema), controller.create);
router.patch('/:id', controller.update); // Validation should follow the schema provided
router.delete('/:id', controller.delete);
router.get('/:id/estimate-delivery', controller.estimateDelivery);

export default router;
