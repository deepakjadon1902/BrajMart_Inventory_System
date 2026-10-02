import mongoose, { Schema, Document } from 'mongoose';
import { ICategory } from '../types/index.js';

export interface CategoryDocument extends Omit<ICategory, '_id'>, Document {}

const CategorySchema = new Schema<CategoryDocument>(
  {
    serialNumber: {
      type: Number,
      min: [1, 'Serial number must be greater than 0'],
      unique: true,
      sparse: true,
      index: true,
      validate: {
        validator: Number.isInteger,
        message: 'Serial number must be an integer',
      },
    },
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      maxlength: [100, 'Category name cannot exceed 100 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Category slug is required'],
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Category = mongoose.model<CategoryDocument>('Category', CategorySchema);
