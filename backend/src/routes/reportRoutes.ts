import { Router } from 'express';
import { reportController } from '../controllers/reportController.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();

// Reports are accessible to ADMIN and MANAGER
router.use(requireRole(['ADMIN', 'MANAGER']));

router.get('/inventory', (req, res, next) =>
  reportController.getInventoryValuation(req, res).catch(next)
);

router.get('/low-stock', (req, res, next) =>
  reportController.getLowStock(req, res).catch(next)
);

router.get('/out-of-stock', (req, res, next) =>
  reportController.getOutOfStock(req, res).catch(next)
);

router.get('/movements', (req, res, next) =>
  reportController.getMovements(req, res).catch(next)
);

router.get('/smart', (req, res, next) =>
  reportController.getSmartReport(req, res).catch(next)
);

export default router;
