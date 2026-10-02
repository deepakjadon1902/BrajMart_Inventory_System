import mongoose, { Schema, Document } from 'mongoose';
import { IAuditLog } from '../types/index.js';

export interface AuditLogDocument extends Omit<IAuditLog, '_id'>, Document {}

const AuditLogSchema = new Schema<AuditLogDocument>(
  {
    user: {
      type: String,
      required: true,
      default: 'Admin',
      trim: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    entity: {
      type: String,
      required: true,
      index: true,
    },
    entityId: {
      type: String,
      required: true,
      index: true,
    },
    before: {
      type: Schema.Types.Mixed,
    },
    after: {
      type: Schema.Types.Mixed,
    },
    reason: {
      type: String,
      trim: true,
    },
    reference: {
      type: String,
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

AuditLogSchema.index({ entity: 1, entityId: 1, createdAt: -1 });

export const AuditLog = mongoose.model<AuditLogDocument>('AuditLog', AuditLogSchema);
