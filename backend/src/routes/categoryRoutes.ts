import { Router } from 'express';
import { categoryController } from '../controllers/categoryController.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', (req, res, next) => categoryController.getCategories(req, res).catch(next));
router.get('/:id', (req, res, next) => categoryController.getCategoryById(req, res).catch(next));

router.post(
  '/',
  requireRole(['ADMIN', 'MANAGER']),
  (req, res, next) => categoryController.createCategory(req, res).catch(next)
);

router.patch(
  '/:id',
  requireRole(['ADMIN', 'MANAGER']),
  (req, res, next) => categoryController.updateCategory(req, res).catch(next)
);

export default router;
