import { Product } from '../models/Product.js';
import { InventoryTransaction } from '../models/InventoryTransaction.js';
import { financialService } from './financialService.js';
import { paiseToRupees } from '../utils/currency.js';

export class ReportService {
  /**
   * Complete inventory valuation report
   */
  public async getInventoryValuationReport() {
    const products = await Product.find({ isArchived: false })
      .populate('categoryId', 'name')
      .sort({ name: 1 })
      .lean();

    return products.map((p) => financialService.enrichProduct(p as any));
  }

  /**
   * Low-stock report (quantity > 0 and quantity <= reorderLevel)
   */
  public async getLowStockReport() {
    const products = await Product.find({
      isArchived: false,
      currentQuantity: { $gt: 0 },
      $expr: { $lte: ['$currentQuantity', '$reorderLevel'] },
    })
      .populate('categoryId', 'name')
      .sort({ currentQuantity: 1 })
      .lean();

    return products.map((p) => financialService.enrichProduct(p as any));
  }

  /**
   * Out-of-stock report (quantity === 0)
   */
  public async getOutOfStockReport() {
    const products = await Product.find({
      isArchived: false,
      currentQuantity: 0,
    })
      .populate('categoryId', 'name')
      .sort({ name: 1 })
      .lean();

    return products.map((p) => financialService.enrichProduct(p as any));
  }

  /**
   * Stock movements report by date range and type
   */
  public async getStockMovementsReport(params: {
    startDate?: string;
    endDate?: string;
    type?: string;
    productId?: string;
  }) {
    const filter: any = {};

    if (params.startDate || params.endDate) {
      filter.createdAt = {};
      if (params.startDate) {
        filter.createdAt.$gte = new Date(params.startDate);
      }
      if (params.endDate) {
        const end = new Date(params.endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    if (params.type && params.type !== 'ALL') {
      filter.type = params.type;
    }

    if (params.productId) {
      filter.productId = params.productId;
    }

    return InventoryTransaction.find(filter)
      .populate('productId', 'name sku unitType')
      .sort({ createdAt: -1 })
      .lean();
  }

  /**
   * Format inventory valuation items to machine-friendly CSV string
   */
  public generateValuationCsv(items: any[]): string {
    const headers = [
      'SKU',
      'ProductName',
      'Category',
      'Unit',
      'Quantity',
      'CostPerUnitINR',
      'SellingPriceINR',
      'InventoryCostINR',
      'SellingValueINR',
      'PotentialProfitINR',
      'MarginPercent',
      'Status',
    ];

    const rows = items.map((item) => {
      const categoryName = item.categoryId?.name || 'Uncategorized';
      const costINR = paiseToRupees(item.costPerUnitPaise).toFixed(2);
      const sellINR = paiseToRupees(item.sellingPricePerUnitPaise).toFixed(2);
      const invCostINR = paiseToRupees(item.inventoryCostPaise).toFixed(2);
      const sellValINR = paiseToRupees(item.sellingValuePaise).toFixed(2);
      const profitINR = paiseToRupees(item.potentialProfitPaise).toFixed(2);

      return [
        `"${item.sku.replace(/"/g, '""')}"`,
        `"${item.name.replace(/"/g, '""')}"`,
        `"${categoryName.replace(/"/g, '""')}"`,
        item.unitType,
        item.currentQuantity,
        costINR,
        sellINR,
        invCostINR,
        sellValINR,
        profitINR,
        item.marginPercentage,
        item.stockStatus,
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Format movements items to machine-friendly CSV string
   */
  public generateMovementsCsv(items: any[]): string {
    const headers = [
      'Date',
      'SKU',
      'ProductName',
      'Type',
      'PreviousQty',
      'Change',
      'NewQty',
      'Reason',
      'Reference',
      'User',
    ];

    const rows = items.map((tx) => {
      const sku = tx.productId?.sku || '';
      const name = tx.productId?.name || '';
      const date = new Date(tx.createdAt).toISOString();
      const changeStr = tx.quantityDelta > 0 ? `+${tx.quantityDelta}` : `${tx.quantityDelta}`;

      return [
        `"${date}"`,
        `"${sku.replace(/"/g, '""')}"`,
        `"${name.replace(/"/g, '""')}"`,
        tx.type,
        tx.previousQuantity,
        changeStr,
        tx.newQuantity,
        `"${(tx.reason || '').replace(/"/g, '""')}"`,
        `"${(tx.reference || '').replace(/"/g, '""')}"`,
        `"${(tx.createdBy || 'Admin').replace(/"/g, '""')}"`,
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }
}

export const reportService = new ReportService();
