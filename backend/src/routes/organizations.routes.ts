
import { Router } from 'express';
import { OrganizationsController } from '@/controllers/organizations.controller';
import { authMiddleware } from '@/middleware/auth.middleware';

const router = Router();
const controller = new OrganizationsController();

router.use(authMiddleware);

router.get('/', controller.getAll);
router.post('/', controller.create);

export default router;
