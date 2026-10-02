import { Router } from 'express';
import { productController } from '../controllers/productController.js';
import { requireRole } from '../middleware/auth.js';
import { idempotencyMiddleware } from '../middleware/idempotency.js';

const router = Router();

// Query products
router.get('/', (req, res, next) => productController.getProducts(req, res).catch(next));
router.get('/:id', (req, res, next) => productController.getProductById(req, res).catch(next));
router.get('/:id/history', (req, res, next) => productController.getProductHistory(req, res).catch(next));

// Create product (Admin / Manager)
router.post(
  '/',
  requireRole(['ADMIN', 'MANAGER']),
  idempotencyMiddleware,
  (req, res, next) => productController.createProduct(req, res).catch(next)
);

// Update product attributes (Admin / Manager)
router.patch(
  '/:id',
  requireRole(['ADMIN', 'MANAGER']),
  (req, res, next) => productController.updateProduct(req, res).catch(next)
);

// Stock In (Admin, Manager, Staff)
router.post(
  '/:id/stock-in',
  requireRole(['ADMIN', 'MANAGER', 'STAFF']),
  idempotencyMiddleware,
  (req, res, next) => productController.stockIn(req, res).catch(next)
);

// Stock Out (Admin, Manager, Staff)
router.post(
  '/:id/stock-out',
  requireRole(['ADMIN', 'MANAGER', 'STAFF']),
  idempotencyMiddleware,
  (req, res, next) => productController.stockOut(req, res).catch(next)
);

// Adjust Stock (Admin, Manager)
router.post(
  '/:id/adjust',
  requireRole(['ADMIN', 'MANAGER']),
  idempotencyMiddleware,
  (req, res, next) => productController.adjustStock(req, res).catch(next)
);

// Archive / Restore (Admin)
router.post(
  '/:id/archive',
  requireRole(['ADMIN']),
  (req, res, next) => productController.archiveProduct(req, res).catch(next)
);

router.post(
  '/:id/restore',
  requireRole(['ADMIN']),
  (req, res, next) => productController.restoreProduct(req, res).catch(next)
);

export default router;
