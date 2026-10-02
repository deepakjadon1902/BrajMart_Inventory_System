import mongoose, { Schema, Document } from 'mongoose';
import { IPriceHistory } from '../types/index.js';

export interface PriceHistoryDocument
  extends Omit<IPriceHistory, '_id'>,
    Document {}

const PriceHistorySchema = new Schema<PriceHistoryDocument>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product ID is required'],
      index: true,
    },
    previousCostPerUnitPaise: {
      type: Number,
      required: true,
      min: 0,
    },
    newCostPerUnitPaise: {
      type: Number,
      required: true,
      min: 0,
    },
    previousSellingPricePerUnitPaise: {
      type: Number,
      required: true,
      min: 0,
    },
    newSellingPricePerUnitPaise: {
      type: Number,
      required: true,
      min: 0,
    },
    changedBy: {
      type: String,
      default: 'Admin',
      trim: true,
    },
    reason: {
      type: String,
      trim: true,
      maxlength: [300, 'Reason cannot exceed 300 characters'],
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
  }
);

PriceHistorySchema.index({ productId: 1, createdAt: -1 });

export const PriceHistory = mongoose.model<PriceHistoryDocument>(
  'PriceHistory',
  PriceHistorySchema
);
