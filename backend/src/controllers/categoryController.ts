import { Request, Response } from 'express';
import { categoryService } from '../services/categoryService.js';
import { createCategorySchema, updateCategorySchema } from '../schemas/categorySchemas.js';

export class CategoryController {
  public async getCategories(req: Request, res: Response) {
    const { includeInactive } = req.query;
    const categories = await categoryService.getCategories(includeInactive === 'true');
    res.json({
      success: true,
      data: categories,
    });
  }

  public async getCategoryById(req: Request, res: Response) {
    const category = await categoryService.getCategoryById(req.params.id);
    res.json({
      success: true,
      data: category,
    });
  }

  public async createCategory(req: Request, res: Response) {
    const validated = createCategorySchema.parse(req.body);
    const category = await categoryService.createCategory(validated);
    res.status(201).json({
      success: true,
      data: category,
    });
  }

  public async updateCategory(req: Request, res: Response) {
    const validated = updateCategorySchema.parse(req.body);
    const category = await categoryService.updateCategory(req.params.id, validated);
    res.json({
      success: true,
      data: category,
    });
  }
}

export const categoryController = new CategoryController();
