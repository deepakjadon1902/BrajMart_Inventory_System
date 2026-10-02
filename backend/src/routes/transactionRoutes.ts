import { Router } from 'express';
import { transactionController } from '../controllers/transactionController.js';

const router = Router();

router.get('/', (req, res, next) =>
  transactionController.getTransactions(req, res).catch(next)
);

export default router;
