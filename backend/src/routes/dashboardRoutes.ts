import { Router } from 'express';
import { dashboardController } from '../controllers/dashboardController.js';

const router = Router();

router.get('/summary', (req, res, next) =>
  dashboardController.getSummary(req, res).catch(next)
);

router.get('/recent-activity', (req, res, next) =>
  dashboardController.getRecentActivity(req, res).catch(next)
);

router.get('/category-breakdown', (req, res, next) =>
  dashboardController.getCategoryBreakdown(req, res).catch(next)
);

export default router;
