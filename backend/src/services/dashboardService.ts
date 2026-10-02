import { Product } from '../models/Product.js';
import { InventoryTransaction } from '../models/InventoryTransaction.js';
import { DashboardSummaryData, CategoryValuationBreakdown } from '../types/index.js';

export class DashboardService {
  /**
   * Authoritative global dashboard summary aggregated from MongoDB
   */
  public async getSummary(): Promise<DashboardSummaryData> {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // Aggregation on active products
    const [productMetrics] = await Product.aggregate([
      { $match: { isArchived: false } },
      {
        $project: {
          currentQuantity: 1,
          reorderLevel: 1,
          costPaise: { $multiply: ['$currentQuantity', '$costPerUnitPaise'] },
          sellingPaise: { $multiply: ['$currentQuantity', '$sellingPricePerUnitPaise'] },
          isLowStock: {
            $cond: [
              {
                $and: [
                  { $gt: ['$currentQuantity', 0] },
                  { $lte: ['$currentQuantity', '$reorderLevel'] },
                ],
              },
              1,
              0,
            ],
          },
          isOutOfStock: {
            $cond: [{ $eq: ['$currentQuantity', 0] }, 1, 0],
          },
        },
      },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          totalUnits: { $sum: '$currentQuantity' },
          inventoryCostPaise: { $sum: '$costPaise' },
          sellingValuePaise: { $sum: '$sellingPaise' },
          lowStockProducts: { $sum: '$isLowStock' },
          outOfStockProducts: { $sum: '$isOutOfStock' },
        },
      },
    ]);

    // Aggregation on transactions today
    const [todayMetrics] = await InventoryTransaction.aggregate([
      { $match: { createdAt: { $gte: startOfToday } } },
      {
        $group: {
          _id: null,
          addedTodayUnits: {
            $sum: {
              $cond: [{ $gt: ['$quantityDelta', 0] }, '$quantityDelta', 0],
            },
          },
          reducedTodayUnits: {
            $sum: {
              $cond: [
                { $lt: ['$quantityDelta', 0] },
                { $abs: '$quantityDelta' },
                0,
              ],
            },
          },
        },
      },
    ]);

    const totalProducts = productMetrics?.totalProducts || 0;
    const totalUnits = productMetrics?.totalUnits || 0;
    const inventoryCostPaise = productMetrics?.inventoryCostPaise || 0;
    const sellingValuePaise = productMetrics?.sellingValuePaise || 0;
    const potentialProfitPaise = sellingValuePaise - inventoryCostPaise;
    const lowStockProducts = productMetrics?.lowStockProducts || 0;
    const outOfStockProducts = productMetrics?.outOfStockProducts || 0;

    const addedTodayUnits = todayMetrics?.addedTodayUnits || 0;
    const reducedTodayUnits = todayMetrics?.reducedTodayUnits || 0;

    return {
      totalProducts,
      totalUnits,
      inventoryCostPaise,
      sellingValuePaise,
      potentialProfitPaise,
      lowStockProducts,
      outOfStockProducts,
      addedTodayUnits,
      reducedTodayUnits,
    };
  }

  /**
   * Recent inventory activity directly from MongoDB transactions
   */
  public async getRecentActivity(limit: number = 8) {
    return InventoryTransaction.find()
      .populate('productId', 'name sku unitType')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  /**
   * Category valuation breakdown aggregated from MongoDB
   */
  public async getCategoryBreakdown(): Promise<CategoryValuationBreakdown[]> {
    const result = await Product.aggregate([
      { $match: { isArchived: false } },
      {
        $group: {
          _id: '$categoryId',
          productCount: { $sum: 1 },
          totalUnits: { $sum: '$currentQuantity' },
          inventoryCostPaise: {
            $sum: { $multiply: ['$currentQuantity', '$costPerUnitPaise'] },
          },
          sellingValuePaise: {
            $sum: { $multiply: ['$currentQuantity', '$sellingPricePerUnitPaise'] },
          },
        },
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'category',
        },
      },
      { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          categoryId: { $toString: '$_id' },
          categoryName: { $ifNull: ['$category.name', 'Uncategorized'] },
          productCount: 1,
          totalUnits: 1,
          inventoryCostPaise: 1,
          sellingValuePaise: 1,
          potentialProfitPaise: {
            $subtract: ['$sellingValuePaise', '$inventoryCostPaise'],
          },
        },
      },
      { $sort: { inventoryCostPaise: -1 } },
    ]);

    return result;
  }
}

export const dashboardService = new DashboardService();
