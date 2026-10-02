import { Request, Response } from 'express';
import { inventoryService } from '../services/inventoryService.js';
import {
  createProductSchema,
  updateProductSchema,
  stockInSchema,
  stockOutSchema,
  adjustStockSchema,
} from '../schemas/productSchemas.js';

export class ProductController {
  public async getProducts(req: Request, res: Response) {
    const {
      page,
      limit,
      search,
      categoryId,
      status,
      unitType,
      includeArchived,
      sortBy,
      sortOrder,
    } = req.query;

    const result = await inventoryService.getProducts({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search: search as string,
      categoryId: categoryId as string,
      status: status as any,
      unitType: unitType as string,
      includeArchived: includeArchived === 'true',
      sortBy: sortBy as string,
      sortOrder: sortOrder as any,
    });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  }

  public async getProductById(req: Request, res: Response) {
    const product = await inventoryService.getProductById(req.params.id);
    res.json({
      success: true,
      data: product,
    });
  }

  public async createProduct(req: Request, res: Response) {
    const validated = createProductSchema.parse(req.body);
    const product = await inventoryService.createProduct({
      ...validated,
      createdBy: (req as any).user?.name || 'Admin',
    });

    res.status(201).json({
      success: true,
      data: product,
    });
  }

  public async updateProduct(req: Request, res: Response) {
    const validated = updateProductSchema.parse(req.body);
    const product = await inventoryService.updateProduct(req.params.id, {
      ...validated,
      updatedBy: (req as any).user?.name || 'Admin',
    });

    res.json({
      success: true,
      data: product,
    });
  }

  public async stockIn(req: Request, res: Response) {
    const validated = stockInSchema.parse(req.body);
    const product = await inventoryService.stockIn(req.params.id, {
      ...validated,
      createdBy: (req as any).user?.name || 'Admin',
    });

    res.json({
      success: true,
      data: product,
    });
  }

  public async stockOut(req: Request, res: Response) {
    const validated = stockOutSchema.parse(req.body);
    const product = await inventoryService.stockOut(req.params.id, {
      ...validated,
      createdBy: (req as any).user?.name || 'Admin',
    });

    res.json({
      success: true,
      data: product,
    });
  }

  public async adjustStock(req: Request, res: Response) {
    const validated = adjustStockSchema.parse(req.body);
    const product = await inventoryService.adjustStock(req.params.id, {
      ...validated,
      createdBy: (req as any).user?.name || 'Admin',
    });

    res.json({
      success: true,
      data: product,
    });
  }

  public async archiveProduct(req: Request, res: Response) {
    const product = await inventoryService.setArchiveStatus(
      req.params.id,
      true,
      (req as any).user?.name || 'Admin'
    );
    res.json({
      success: true,
      data: product,
    });
  }

  public async restoreProduct(req: Request, res: Response) {
    const product = await inventoryService.setArchiveStatus(
      req.params.id,
      false,
      (req as any).user?.name || 'Admin'
    );
    res.json({
      success: true,
      data: product,
    });
  }

  public async getProductHistory(req: Request, res: Response) {
    const { page, limit } = req.query;
    const result = await inventoryService.getProductTransactions(req.params.id, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  }
}

export const productController = new ProductController();
