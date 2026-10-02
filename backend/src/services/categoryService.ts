import { Category } from '../models/Category.js';
import { Product } from '../models/Product.js';
import { normalizeString } from '../utils/calculations.js';

export class CategoryService {
  public async getCategories(includeInactive: boolean = false) {
    const filter = includeInactive ? {} : { isActive: true };
    return Category.find(filter).sort({ serialNumber: 1, name: 1 }).lean();
  }

  public async getCategoryById(id: string) {
    const category = await Category.findById(id).lean();
    if (!category) {
      const err = new Error('Category not found');
      (err as any).code = 'CATEGORY_NOT_FOUND';
      throw err;
    }
    return category;
  }

  public async createCategory(data: { serialNumber?: number; name: string; description?: string }) {
    const name = normalizeString(data.name);
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const serialNumber =
      data.serialNumber ??
      ((await Category.findOne({ serialNumber: { $exists: true } })
        .sort({ serialNumber: -1 })
        .select('serialNumber')
        .lean())?.serialNumber ?? 0) + 1;

    const existing = await Category.findOne({
      $or: [
        { name: { $regex: new RegExp(`^${name}$`, 'i') } },
        { slug },
        { serialNumber },
      ],
    });

    if (existing) {
      const err = new Error(`Category name or serial number already exists`);
      (err as any).code = 'CONFLICT';
      throw err;
    }

    const category = new Category({
      serialNumber,
      name,
      slug,
      description: data.description?.trim(),
      isActive: true,
    });

    await category.save();
    return category.toObject();
  }

  public async updateCategory(
    id: string,
    data: { serialNumber?: number; name?: string; description?: string; isActive?: boolean }
  ) {
    const category = await Category.findById(id);
    if (!category) {
      const err = new Error('Category not found');
      (err as any).code = 'CATEGORY_NOT_FOUND';
      throw err;
    }

    if (data.name) {
      const name = normalizeString(data.name);
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      const existing = await Category.findOne({
        _id: { $ne: id },
        $or: [{ name: { $regex: new RegExp(`^${name}$`, 'i') } }, { slug }],
      });

      if (existing) {
        const err = new Error(`Category "${name}" already exists`);
        (err as any).code = 'CONFLICT';
        throw err;
      }

      category.name = name;
      category.slug = slug;
    }

    if (data.serialNumber !== undefined) {
      const existing = await Category.findOne({
        _id: { $ne: id },
        serialNumber: data.serialNumber,
      });

      if (existing) {
        const err = new Error(`Category serial number ${data.serialNumber} already exists`);
        (err as any).code = 'CONFLICT';
        throw err;
      }

      category.serialNumber = data.serialNumber;
    }

    if (data.description !== undefined) {
      category.description = data.description.trim();
    }

    if (data.isActive !== undefined) {
      // If deactivating, check if active products are assigned
      if (!data.isActive) {
        const inUseCount = await Product.countDocuments({
          categoryId: id,
          isArchived: false,
        });
        if (inUseCount > 0) {
          const err = new Error(
            `Cannot deactivate category: ${inUseCount} active products are currently assigned to it.`
          );
          (err as any).code = 'CONFLICT';
          throw err;
        }
      }
      category.isActive = data.isActive;
    }

    await category.save();
    return category.toObject();
  }
}

export const categoryService = new CategoryService();
