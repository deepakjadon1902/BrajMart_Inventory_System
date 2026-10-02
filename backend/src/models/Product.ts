import mongoose, { Schema, Document } from 'mongoose';
import { IProduct, UNIT_TYPES } from '../types/index.js';

export interface ProductDocument extends Omit<IProduct, '_id'>, Document {}

const ProductSchema = new Schema<ProductDocument>(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: [150, 'Product name cannot exceed 150 characters'],
      index: true,
    },
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      trim: true,
      uppercase: true,
      unique: true,
      index: true,
      maxlength: [50, 'SKU cannot exceed 50 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required'],
      index: true,
    },
    unitType: {
      type: String,
      enum: {
        values: UNIT_TYPES,
        message: 'Invalid unit type',
      },
      required: [true, 'Unit type is required'],
    },
    currentQuantity: {
      type: Number,
      required: [true, 'Current quantity is required'],
      min: [0, 'Quantity cannot be negative'],
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: 'Quantity must be an integer',
      },
    },
    costPerUnitPaise: {
      type: Number,
      required: [true, 'Cost per unit in paise is required'],
      min: [0, 'Cost per unit cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Cost per unit paise must be an integer',
      },
    },
    sellingPricePerUnitPaise: {
      type: Number,
      required: [true, 'Selling price per unit in paise is required'],
      min: [0, 'Selling price per unit cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Selling price per unit paise must be an integer',
      },
    },
    reorderLevel: {
      type: Number,
      required: [true, 'Reorder level is required'],
      min: [0, 'Reorder level cannot be negative'],
      default: 10,
      validate: {
        validator: Number.isInteger,
        message: 'Reorder level must be an integer',
      },
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for optimal queries and sorting
ProductSchema.index({ isArchived: 1, currentQuantity: 1 });
ProductSchema.index({ isArchived: 1, updatedAt: -1 });

export const Product = mongoose.model<ProductDocument>('Product', ProductSchema);
