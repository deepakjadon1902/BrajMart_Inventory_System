import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { Product } from '../models/Product.js';
import { InventoryTransaction } from '../models/InventoryTransaction.js';

const OUT_TYPES = new Set(['STOCK_OUT', 'SALE', 'DAMAGED', 'LOST', 'ADJUSTMENT_OUT']);
const SALE_TYPES = new Set(['STOCK_OUT', 'SALE']);

interface SmartProductReport {
  productId: string;
  name: string;
  categoryName: string;
  serialNumber?: number;
  stockUnits: number;
  costToCompanyPaise: number;
  sellingPricePaise: number;
  totalCostPaise: number;
  sellingTotalPaise: number;
  profitPaise: number;
  soldUnits: number;
  soldUnits30Days: number;
  predicted30DaySales: number;
  averageDailySales: number;
  daysOfStockCover: number | null;
  reorderSuggestion: number;
  risk: 'OUT_OF_STOCK' | 'REORDER_SOON' | 'SLOW_MOVING' | 'HEALTHY';
  action: string;
  salesValuePaise: number;
}

export class SmartReportService {
  public async getSmartReport() {
    const [products, transactions] = await Promise.all([
      Product.find({ isArchived: false }).populate('categoryId').lean(),
      InventoryTransaction.find().sort({ createdAt: -1 }).lean(),
    ]);

    const payload = {
      products: products.map((product: any) => ({
        ...product,
        _id: product._id.toString(),
        categoryId:
          typeof product.categoryId === 'object' && product.categoryId
            ? {
                ...product.categoryId,
                _id: product.categoryId._id?.toString?.() || product.categoryId._id,
              }
            : product.categoryId,
      })),
      transactions: transactions.map((tx: any) => ({
        ...tx,
        _id: tx._id.toString(),
        productId: tx.productId?.toString?.() || tx.productId,
        createdAt: tx.createdAt?.toISOString?.() || tx.createdAt,
      })),
    };

    const pythonReport = await this.tryPythonReport(payload);
    if (pythonReport) return pythonReport;

    return this.buildTypeScriptReport(payload.products, payload.transactions);
  }

  private async tryPythonReport(payload: any) {
    const scriptCandidates = [
      path.join(process.cwd(), 'backend', 'analytics', 'smart_inventory.py'),
      path.join(process.cwd(), 'analytics', 'smart_inventory.py'),
    ];
    const scriptPath = scriptCandidates.find((candidate) => fs.existsSync(candidate));
    if (!scriptPath) return null;

    const commands = [
      { command: 'py', args: ['-3', scriptPath] },
      { command: 'python', args: [scriptPath] },
      { command: 'python3', args: [scriptPath] },
    ];

    for (const option of commands) {
      const result = await this.runPython(option.command, option.args, payload);
      if (result) return result;
    }

    return null;
  }

  private runPython(command: string, args: string[], payload: any): Promise<any | null> {
    return new Promise((resolve) => {
      const child = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'] });
      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
      });

      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      child.on('error', () => resolve(null));
      child.on('close', (code) => {
        if (code !== 0) return resolve(null);
        try {
          resolve(JSON.parse(stdout));
        } catch {
          console.warn('[SmartReport] Python output parse failed:', stderr);
          resolve(null);
        }
      });

      child.stdin.write(JSON.stringify(payload));
      child.stdin.end();
    });
  }

  private buildTypeScriptReport(products: any[], transactions: any[]) {
    const now = new Date();
    const soldByProduct = new Map<string, number>();
    const sold30ByProduct = new Map<string, number>();
    const movementDaysByProduct = new Map<string, Set<string>>();
    const revenueByProduct = new Map<string, number>();
    const productLookup = new Map(products.map((product) => [product._id.toString(), product]));

    for (const tx of transactions) {
      const productId = tx.productId?.toString?.() || String(tx.productId || '');
      const txType = tx.type;
      const qty = Math.abs(Number(tx.quantityDelta || 0));
      if (!productId || !qty || !OUT_TYPES.has(txType)) continue;

      soldByProduct.set(productId, (soldByProduct.get(productId) || 0) + qty);
      const createdAt = new Date(tx.createdAt);
      if (!Number.isNaN(createdAt.getTime())) {
        const day = createdAt.toISOString().slice(0, 10);
        if (!movementDaysByProduct.has(productId)) {
          movementDaysByProduct.set(productId, new Set());
        }
        movementDaysByProduct.get(productId)?.add(day);
        const daysOld = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
        if (daysOld <= 30) {
          sold30ByProduct.set(productId, (sold30ByProduct.get(productId) || 0) + qty);
        }
      }

      const product = productLookup.get(productId);
      if (product && SALE_TYPES.has(txType)) {
        revenueByProduct.set(
          productId,
          (revenueByProduct.get(productId) || 0) + qty * Number(product.sellingPricePerUnitPaise || 0)
        );
      }
    }

    const productReports: SmartProductReport[] = products.map((product) => {
      const productId = product._id.toString();
      const category = typeof product.categoryId === 'object' ? product.categoryId : undefined;
      const stockUnits = Number(product.currentQuantity || 0);
      const cost = Number(product.costPerUnitPaise || 0);
      const selling = Number(product.sellingPricePerUnitPaise || 0);
      const totalCost = stockUnits * cost;
      const sellingTotal = stockUnits * selling;
      const profit = sellingTotal - totalCost;
      const soldUnits = soldByProduct.get(productId) || 0;
      const sold30 = sold30ByProduct.get(productId) || 0;
      const activeDays = Math.max(1, movementDaysByProduct.get(productId)?.size || 1);
      const avgDailyAll = soldUnits > 0 ? soldUnits / activeDays : 0;
      const avgDailySales = sold30 > 0 ? sold30 / 30 : avgDailyAll;
      const predicted30DaySales = Math.ceil(avgDailySales * 30);
      const daysOfStockCover =
        avgDailySales > 0 ? Number((stockUnits / avgDailySales).toFixed(1)) : null;
      const targetStock = Math.ceil(avgDailySales * 14 + Number(product.reorderLevel || 0));
      const reorderSuggestion = Math.max(0, targetStock - stockUnits);

      let risk: SmartProductReport['risk'] = 'HEALTHY';
      let action = 'Stock level looks healthy.';
      if (stockUnits === 0) {
        risk = 'OUT_OF_STOCK';
        action = 'Restock before accepting more orders.';
      } else if (reorderSuggestion > 0) {
        risk = 'REORDER_SOON';
        action = `Order ${reorderSuggestion} more units.`;
      } else if (soldUnits === 0) {
        risk = 'SLOW_MOVING';
        action = 'No delivery history yet. Watch sales before buying more.';
      }

      return {
        productId,
        name: product.name,
        categoryName: category?.name || 'Uncategorized',
        serialNumber: category?.serialNumber,
        stockUnits,
        costToCompanyPaise: cost,
        sellingPricePaise: selling,
        totalCostPaise: totalCost,
        sellingTotalPaise: sellingTotal,
        profitPaise: profit,
        soldUnits,
        soldUnits30Days: sold30,
        predicted30DaySales,
        averageDailySales: Number(avgDailySales.toFixed(2)),
        daysOfStockCover,
        reorderSuggestion,
        risk,
        action,
        salesValuePaise: revenueByProduct.get(productId) || 0,
      };
    });

    productReports.sort(
      (a, b) =>
        b.soldUnits - a.soldUnits ||
        b.salesValuePaise - a.salesValuePaise ||
        b.profitPaise - a.profitPaise
    );

    const categoryMap = new Map<string, any>();
    for (const product of productReports) {
      const key = `${product.serialNumber || 'x'}:${product.categoryName}`;
      const existing =
        categoryMap.get(key) ||
        {
          categoryName: product.categoryName,
          serialNumber: product.serialNumber,
          productCount: 0,
          stockUnits: 0,
          totalCostPaise: 0,
          sellingTotalPaise: 0,
          profitPaise: 0,
          soldUnits: 0,
        };
      existing.productCount += 1;
      existing.stockUnits += product.stockUnits;
      existing.totalCostPaise += product.totalCostPaise;
      existing.sellingTotalPaise += product.sellingTotalPaise;
      existing.profitPaise += product.profitPaise;
      existing.soldUnits += product.soldUnits;
      categoryMap.set(key, existing);
    }

    const categories = Array.from(categoryMap.values()).sort(
      (a, b) => (a.serialNumber || 999999) - (b.serialNumber || 999999)
    );

    const summary = productReports.reduce(
      (sum, product) => ({
        productCount: sum.productCount + 1,
        categoryCount: categories.length,
        stockUnits: sum.stockUnits + product.stockUnits,
        totalCostPaise: sum.totalCostPaise + product.totalCostPaise,
        sellingTotalPaise: sum.sellingTotalPaise + product.sellingTotalPaise,
        profitPaise: sum.profitPaise + product.profitPaise,
        predicted30DaySales: sum.predicted30DaySales + product.predicted30DaySales,
        reorderProducts: sum.reorderProducts + (product.reorderSuggestion > 0 ? 1 : 0),
      }),
      {
        productCount: 0,
        categoryCount: categories.length,
        stockUnits: 0,
        totalCostPaise: 0,
        sellingTotalPaise: 0,
        profitPaise: 0,
        predicted30DaySales: 0,
        reorderProducts: 0,
      }
    );

    return {
      engine: 'typescript-fallback',
      libraries: { pandas: false, numpy: false },
      summary,
      bestSellers: productReports.slice(0, 5),
      products: productReports,
      categories,
      generatedAt: now.toISOString(),
    };
  }
}

export const smartReportService = new SmartReportService();
