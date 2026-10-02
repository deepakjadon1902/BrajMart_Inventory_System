import mongoose, { Schema, Document } from 'mongoose';
import { IInventoryTransaction, TRANSACTION_TYPES } from '../types/index.js';

export interface InventoryTransactionDocument
  extends Omit<IInventoryTransaction, '_id'>,
    Document {}

const InventoryTransactionSchema = new Schema<InventoryTransactionDocument>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product ID is required'],
      index: true,
    },
    type: {
      type: String,
      enum: {
        values: TRANSACTION_TYPES,
        message: 'Invalid transaction type',
      },
      required: [true, 'Transaction type is required'],
      index: true,
    },
    quantityDelta: {
      type: Number,
      required: [true, 'Quantity delta is required'],
      validate: {
        validator: Number.isInteger,
        message: 'Quantity delta must be an integer',
      },
    },
    previousQuantity: {
      type: Number,
      required: [true, 'Previous quantity is required'],
      min: [0, 'Previous quantity cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Previous quantity must be an integer',
      },
    },
    newQuantity: {
      type: Number,
      required: [true, 'New quantity is required'],
      min: [0, 'New quantity cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'New quantity must be an integer',
      },
    },
    costPerUnitPaiseSnapshot: {
      type: Number,
      min: 0,
    },
    sellingPricePerUnitPaiseSnapshot: {
      type: Number,
      min: 0,
    },
    reason: {
      type: String,
      trim: true,
      maxlength: [300, 'Reason cannot exceed 300 characters'],
    },
    reference: {
      type: String,
      trim: true,
      maxlength: [100, 'Reference cannot exceed 100 characters'],
    },
    note: {
      type: String,
      trim: true,
      maxlength: [500, 'Note cannot exceed 500 characters'],
    },
    createdBy: {
      type: String,
      default: 'Admin',
      trim: true,
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

InventoryTransactionSchema.index({ productId: 1, createdAt: -1 });
InventoryTransactionSchema.index({ type: 1, createdAt: -1 });

export const InventoryTransaction = mongoose.model<InventoryTransactionDocument>(
  'InventoryTransaction',
  InventoryTransactionSchema
);
