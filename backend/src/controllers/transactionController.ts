import { Request, Response } from 'express';
import { InventoryTransaction } from '../models/InventoryTransaction.js';

export class TransactionController {
  public async getTransactions(req: Request, res: Response) {
    const page = Math.max(1, req.query.page ? Number(req.query.page) : 1);
    const limit = Math.max(1, Math.min(100, req.query.limit ? Number(req.query.limit) : 25));
    const skip = (page - 1) * limit;

    const filter: any = {};

    if (req.query.type && req.query.type !== 'ALL') {
      filter.type = req.query.type;
    }

    if (req.query.productId) {
      filter.productId = req.query.productId;
    }

    if (req.query.startDate || req.query.endDate) {
      filter.createdAt = {};
      if (req.query.startDate) {
        filter.createdAt.$gte = new Date(req.query.startDate as string);
      }
      if (req.query.endDate) {
        const end = new Date(req.query.endDate as string);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const [transactions, total] = await Promise.all([
      InventoryTransaction.find(filter)
        .populate('productId', 'name sku unitType')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      InventoryTransaction.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    });
  }
}

export const transactionController = new TransactionController();
