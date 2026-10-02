import { Types } from 'mongoose';
import { Product } from '../models/Product.js';
import { Category } from '../models/Category.js';
import { InventoryTransaction } from '../models/InventoryTransaction.js';
import { PriceHistory } from '../models/PriceHistory.js';
import { AuditLog } from '../models/AuditLog.js';
import { financialService } from './financialService.js';
import { rupeesToPaise } from '../utils/currency.js';
import { normalizeSku, normalizeString } from '../utils/calculations.js';
import { TransactionType } from '../types/index.js';

export interface CreateProductInput {
  name: string;
  sku?: string;
  description?: string;
  categoryId: string;
  unitType: any;
  openingQuantity?: number;
  costPerUnit: number;
  sellingPricePerUnit: number;
  reorderLevel?: number;
  createdBy?: string;
}

export interface UpdateProductInput {
  name: string;
  sku: string;
  description?: string;
  categoryId: string;
  unitType: any;
  costPerUnit: number;
  sellingPricePerUnit: number;
  reorderLevel: number;
  reason?: string;
  updatedBy?: string;
}

export interface StockInInput {
  quantity: number;
  reason?: string;
  reference?: string;
  note?: string;
  createdBy?: string;
}

export interface StockOutInput {
  quantity: number;
  type?: 'STOCK_OUT' | 'SALE' | 'DAMAGED' | 'LOST';
  reason?: string;
  reference?: string;
  note?: string;
  createdBy?: string;
}

export interface AdjustStockInput {
  actualQuantity: number;
  reason: string;
  reference?: string;
  note?: string;
  createdBy?: string;
}

export class InventoryService {
  /**
   * Create a new product with optional opening stock transaction
   */
  public async createProduct(data: CreateProductInput) {
    const normalizedName = normalizeString(data.name);
    const generatedSkuBase = normalizeSku(
      normalizedName
        .split(' ')
        .map((word) => word[0])
        .join('')
        .slice(0, 6) || 'ITEM'
    );
    let normalizedSku = data.sku?.trim()
      ? normalizeSku(data.sku)
      : `${generatedSkuBase}-${Date.now().toString().slice(-6)}`;

    // Verify category exists
    const category = await Category.findById(data.categoryId);
    if (!category) {
      const err = new Error('Category not found');
      (err as any).code = 'CATEGORY_NOT_FOUND';
      throw err;
    }

    // Check SKU uniqueness
    let existing = await Product.findOne({ sku: normalizedSku });
    if (existing && !data.sku?.trim()) {
      normalizedSku = `${generatedSkuBase}-${Date.now().toString().slice(-6)}-${Math.floor(
        Math.random() * 100
      )}`;
      existing = await Product.findOne({ sku: normalizedSku });
    }
    if (existing) {
      const err = new Error(`Product with SKU "${normalizedSku}" already exists`);
      (err as any).code = 'DUPLICATE_SKU';
      throw err;
    }

    const costPerUnitPaise = rupeesToPaise(data.costPerUnit);
    const sellingPricePerUnitPaise = rupeesToPaise(data.sellingPricePerUnit);
    const openingQuantity = data.openingQuantity || 0;

    const product = new Product({
      name: normalizedName,
      sku: normalizedSku,
      description: data.description?.trim(),
      categoryId: data.categoryId,
      unitType: data.unitType,
      currentQuantity: openingQuantity,
      costPerUnitPaise,
      sellingPricePerUnitPaise,
      reorderLevel: data.reorderLevel ?? 10,
      isArchived: false,
    });

    await product.save();

    // Create opening stock transaction if opening quantity > 0
    if (openingQuantity > 0) {
      await InventoryTransaction.create({
        productId: product._id,
        type: 'OPENING_STOCK',
        quantityDelta: openingQuantity,
        previousQuantity: 0,
        newQuantity: openingQuantity,
        costPerUnitPaiseSnapshot: costPerUnitPaise,
        sellingPricePerUnitPaiseSnapshot: sellingPricePerUnitPaise,
        reason: 'Initial opening stock upon product creation',
        createdBy: data.createdBy || 'Admin',
      });
    }

    await AuditLog.create({
      user: data.createdBy || 'Admin',
      action: 'PRODUCT_CREATED',
      entity: 'Product',
      entityId: product._id.toString(),
      after: product.toObject(),
      reason: 'Product created',
    });

    const populated = await Product.findById(product._id).populate('categoryId').lean();
    return financialService.enrichProduct(populated as any);
  }

  /**
   * Update non-quantity product attributes & record price history if applicable
   */
  public async updateProduct(id: string, data: UpdateProductInput) {
    const product = await Product.findById(id);
    if (!product) {
      const err = new Error('Product not found');
      (err as any).code = 'PRODUCT_NOT_FOUND';
      throw err;
    }

    const normalizedSku = normalizeSku(data.sku);
    if (normalizedSku !== product.sku) {
      const existing = await Product.findOne({ sku: normalizedSku, _id: { $ne: id } });
      if (existing) {
        const err = new Error(`Product with SKU "${normalizedSku}" already exists`);
        (err as any).code = 'DUPLICATE_SKU';
        throw err;
      }
    }

    const newCostPaise = rupeesToPaise(data.costPerUnit);
    const newSellingPaise = rupeesToPaise(data.sellingPricePerUnit);

    const priceChanged =
      product.costPerUnitPaise !== newCostPaise ||
      product.sellingPricePerUnitPaise !== newSellingPaise;

    if (priceChanged) {
      await PriceHistory.create({
        productId: product._id,
        previousCostPerUnitPaise: product.costPerUnitPaise,
        newCostPerUnitPaise: newCostPaise,
        previousSellingPricePerUnitPaise: product.sellingPricePerUnitPaise,
        newSellingPricePerUnitPaise: newSellingPaise,
        changedBy: data.updatedBy || 'Admin',
        reason: data.reason || 'Price update',
      });
    }

    const beforeState = product.toObject();

    product.name = normalizeString(data.name);
    product.sku = normalizedSku;
    product.description = data.description?.trim();
    product.categoryId = new Types.ObjectId(data.categoryId) as any;
    product.unitType = data.unitType;
    product.costPerUnitPaise = newCostPaise;
    product.sellingPricePerUnitPaise = newSellingPaise;
    product.reorderLevel = data.reorderLevel;

    await product.save();

    await AuditLog.create({
      user: data.updatedBy || 'Admin',
      action: priceChanged ? 'PRICE_UPDATED' : 'PRODUCT_UPDATED',
      entity: 'Product',
      entityId: product._id.toString(),
      before: beforeState,
      after: product.toObject(),
      reason: data.reason || 'Product updated',
    });

    const populated = await Product.findById(product._id).populate('categoryId').lean();
    return financialService.enrichProduct(populated as any);
  }

  /**
   * Atomic Stock-In
   */
  public async stockIn(id: string, data: StockInInput) {
    if (data.quantity <= 0) {
      const err = new Error('Stock in quantity must be greater than 0');
      (err as any).code = 'INVALID_QUANTITY';
      throw err;
    }

    const product = await Product.findOne({ _id: id, isArchived: false });
    if (!product) {
      const err = new Error('Product not found or is archived');
      (err as any).code = 'PRODUCT_NOT_FOUND';
      throw err;
    }

    const previousQuantity = product.currentQuantity;
    const newQuantity = previousQuantity + data.quantity;

    // Atomic increment
    const updated = await Product.findOneAndUpdate(
      { _id: id, isArchived: false },
      { $inc: { currentQuantity: data.quantity } },
      { new: true }
    ).populate('categoryId');

    if (!updated) {
      const err = new Error('Failed to update stock');
      (err as any).code = 'DATABASE_ERROR';
      throw err;
    }

    await InventoryTransaction.create({
      productId: updated._id,
      type: 'STOCK_IN',
      quantityDelta: data.quantity,
      previousQuantity,
      newQuantity,
      costPerUnitPaiseSnapshot: updated.costPerUnitPaise,
      sellingPricePerUnitPaiseSnapshot: updated.sellingPricePerUnitPaise,
      reason: data.reason || 'Stock added',
      reference: data.reference,
      note: data.note,
      createdBy: data.createdBy || 'Admin',
    });

    await AuditLog.create({
      user: data.createdBy || 'Admin',
      action: 'STOCK_ADDED',
      entity: 'Product',
      entityId: updated._id.toString(),
      before: { currentQuantity: previousQuantity },
      after: { currentQuantity: newQuantity },
      reason: data.reason,
      reference: data.reference,
    });

    return financialService.enrichProduct(updated.toObject() as any);
  }

  /**
   * Atomic Stock-Out with concurrency guard
   */
  public async stockOut(id: string, data: StockOutInput) {
    if (data.quantity <= 0) {
      const err = new Error('Stock out quantity must be greater than 0');
      (err as any).code = 'INVALID_QUANTITY';
      throw err;
    }

    // Atomic reduction requiring currentQuantity >= requested quantity
    const updated = await Product.findOneAndUpdate(
      {
        _id: id,
        isArchived: false,
        currentQuantity: { $gte: data.quantity },
      },
      {
        $inc: { currentQuantity: -data.quantity },
      },
      { new: true }
    ).populate('categoryId');

    if (!updated) {
      // Check current quantity to deliver precise message
      const product = await Product.findById(id);
      if (!product || product.isArchived) {
        const err = new Error('Product not found or is archived');
        (err as any).code = 'PRODUCT_NOT_FOUND';
        throw err;
      }
      const err = new Error(
        `Unable to reduce stock. Only ${product.currentQuantity} ${product.unitType} available.`
      );
      (err as any).code = 'INSUFFICIENT_STOCK';
      throw err;
    }

    const newQuantity = updated.currentQuantity;
    const previousQuantity = newQuantity + data.quantity;
    const txType: TransactionType = data.type || 'STOCK_OUT';

    await InventoryTransaction.create({
      productId: updated._id,
      type: txType,
      quantityDelta: -data.quantity,
      previousQuantity,
      newQuantity,
      costPerUnitPaiseSnapshot: updated.costPerUnitPaise,
      sellingPricePerUnitPaiseSnapshot: updated.sellingPricePerUnitPaise,
      reason: data.reason || 'Stock reduced',
      reference: data.reference,
      note: data.note,
      createdBy: data.createdBy || 'Admin',
    });

    await AuditLog.create({
      user: data.createdBy || 'Admin',
      action: 'STOCK_REDUCED',
      entity: 'Product',
      entityId: updated._id.toString(),
      before: { currentQuantity: previousQuantity },
      after: { currentQuantity: newQuantity },
      reason: data.reason,
      reference: data.reference,
    });

    return financialService.enrichProduct(updated.toObject() as any);
  }

  /**
   * Explicit Stock Adjustment
   */
  public async adjustStock(id: string, data: AdjustStockInput) {
    if (data.actualQuantity < 0) {
      const err = new Error('Actual quantity cannot be negative');
      (err as any).code = 'INVALID_QUANTITY';
      throw err;
    }

    const product = await Product.findOne({ _id: id, isArchived: false });
    if (!product) {
      const err = new Error('Product not found or is archived');
      (err as any).code = 'PRODUCT_NOT_FOUND';
      throw err;
    }

    const previousQuantity = product.currentQuantity;
    const delta = data.actualQuantity - previousQuantity;

    let txType: TransactionType = 'CORRECTION';
    if (delta > 0) txType = 'ADJUSTMENT_IN';
    else if (delta < 0) txType = 'ADJUSTMENT_OUT';

    product.currentQuantity = data.actualQuantity;
    await product.save();

    await InventoryTransaction.create({
      productId: product._id,
      type: txType,
      quantityDelta: delta,
      previousQuantity,
      newQuantity: data.actualQuantity,
      costPerUnitPaiseSnapshot: product.costPerUnitPaise,
      sellingPricePerUnitPaiseSnapshot: product.sellingPricePerUnitPaise,
      reason: data.reason,
      reference: data.reference,
      note: data.note,
      createdBy: data.createdBy || 'Admin',
    });

    await AuditLog.create({
      user: data.createdBy || 'Admin',
      action: 'STOCK_ADJUSTED',
      entity: 'Product',
      entityId: product._id.toString(),
      before: { currentQuantity: previousQuantity },
      after: { currentQuantity: data.actualQuantity },
      reason: data.reason,
      reference: data.reference,
    });

    const populated = await Product.findById(product._id).populate('categoryId').lean();
    return financialService.enrichProduct(populated as any);
  }

  /**
   * Archive or Restore a Product
   */
  public async setArchiveStatus(id: string, isArchived: boolean, user: string = 'Admin') {
    const product = await Product.findById(id);
    if (!product) {
      const err = new Error('Product not found');
      (err as any).code = 'PRODUCT_NOT_FOUND';
      throw err;
    }

    product.isArchived = isArchived;
    await product.save();

    await AuditLog.create({
      user,
      action: isArchived ? 'PRODUCT_ARCHIVED' : 'PRODUCT_RESTORED',
      entity: 'Product',
      entityId: product._id.toString(),
      reason: isArchived ? 'Product archived' : 'Product restored',
    });

    const populated = await Product.findById(product._id).populate('categoryId').lean();
    return financialService.enrichProduct(populated as any);
  }

  /**
   * Get paginated products with search, filter, and sorting
   */
  public async getProducts(params: {
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: string;
    status?: 'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
    unitType?: string;
    includeArchived?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, Math.min(100, params.limit || 20));
    const skip = (page - 1) * limit;

    const filter: any = {};

    if (!params.includeArchived) {
      filter.isArchived = false;
    }

    if (params.categoryId) {
      filter.categoryId = params.categoryId;
    }

    if (params.unitType) {
      filter.unitType = params.unitType;
    }

    if (params.search && params.search.trim()) {
      const searchRegex = new RegExp(params.search.trim(), 'i');
      filter.$or = [{ name: searchRegex }, { sku: searchRegex }];
    }

    // Apply stock status filter at query level
    if (params.status && params.status !== 'ALL') {
      if (params.status === 'OUT_OF_STOCK') {
        filter.currentQuantity = 0;
      } else if (params.status === 'LOW_STOCK') {
        filter.currentQuantity = { $gt: 0 };
        filter.$expr = { $lte: ['$currentQuantity', '$reorderLevel'] };
      } else if (params.status === 'IN_STOCK') {
        filter.$expr = { $gt: ['$currentQuantity', '$reorderLevel'] };
      }
    }

    const sortField = params.sortBy || 'createdAt';
    const sortDirection = params.sortOrder === 'asc' ? 1 : -1;
    const sortOptions: any = { [sortField]: sortDirection };

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate('categoryId')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter),
    ]);

    const enrichedProducts = products.map((p) => financialService.enrichProduct(p as any));

    return {
      data: enrichedProducts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Get single product by ID
   */
  public async getProductById(id: string) {
    const product = await Product.findById(id).populate('categoryId').lean();
    if (!product) {
      const err = new Error('Product not found');
      (err as any).code = 'PRODUCT_NOT_FOUND';
      throw err;
    }
    return financialService.enrichProduct(product as any);
  }

  /**
   * Get product transaction history
   */
  public async getProductTransactions(
    productId: string,
    params: { page?: number; limit?: number }
  ) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, Math.min(100, params.limit || 20));
    const skip = (page - 1) * limit;

    const filter = { productId };

    const [transactions, total] = await Promise.all([
      InventoryTransaction.find(filter)
        .populate('productId', 'name sku unitType')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      InventoryTransaction.countDocuments(filter),
    ]);

    return {
      data: transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  }
}

export const inventoryService = new InventoryService();
