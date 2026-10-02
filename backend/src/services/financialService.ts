import {
  calculateInventoryCostPaise,
  calculateSellingValuePaise,
  calculatePotentialProfitPaise,
  calculateMarginPercentage,
  deriveStockStatus,
} from '../utils/calculations.js';
import { IProduct } from '../types/index.js';

export class FinancialService {
  public calculateProductValuations(product: {
    currentQuantity: number;
    costPerUnitPaise: number;
    sellingPricePerUnitPaise: number;
    reorderLevel: number;
  }) {
    const inventoryCostPaise = calculateInventoryCostPaise(
      product.currentQuantity,
      product.costPerUnitPaise
    );
    const sellingValuePaise = calculateSellingValuePaise(
      product.currentQuantity,
      product.sellingPricePerUnitPaise
    );
    const potentialProfitPaise = calculatePotentialProfitPaise(
      sellingValuePaise,
      inventoryCostPaise
    );
    const marginPercentage = calculateMarginPercentage(
      sellingValuePaise,
      potentialProfitPaise
    );
    const stockStatus = deriveStockStatus(
      product.currentQuantity,
      product.reorderLevel
    );

    return {
      inventoryCostPaise,
      sellingValuePaise,
      potentialProfitPaise,
      marginPercentage,
      stockStatus,
    };
  }

  public enrichProduct<T extends Partial<IProduct>>(product: T) {
    const qty = product.currentQuantity ?? 0;
    const cost = product.costPerUnitPaise ?? 0;
    const sell = product.sellingPricePerUnitPaise ?? 0;
    const reorder = product.reorderLevel ?? 10;

    const valuations = this.calculateProductValuations({
      currentQuantity: qty,
      costPerUnitPaise: cost,
      sellingPricePerUnitPaise: sell,
      reorderLevel: reorder,
    });

    return {
      ...product,
      ...valuations,
    };
  }
}

export const financialService = new FinancialService();
