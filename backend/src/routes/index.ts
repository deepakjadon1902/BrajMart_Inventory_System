import { Router } from 'express';
import productRoutes from './productRoutes.js';
import categoryRoutes from './categoryRoutes.js';
import dashboardRoutes from './dashboardRoutes.js';
import transactionRoutes from './transactionRoutes.js';
import reportRoutes from './reportRoutes.js';

const router = Router();

router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/transactions', transactionRoutes);
router.use('/reports', reportRoutes);

export default router;
