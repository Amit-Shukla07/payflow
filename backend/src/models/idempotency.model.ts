import mongoose, { Document, Schema } from 'mongoose';

export type IdempotencyStatus = 'PENDING' | 'RESOLVED' | 'FAILED';

export interface IIdempotencyRecord extends Document {
  _id: mongoose.Types.ObjectId;
  key: string;
  userId: mongoose.Types.ObjectId;
  requestHash: string;
  status: IdempotencyStatus;
  statusCode?: number;
  responseBody?: any;
  createdAt: Date;
  updatedAt: Date;
}

const idempotencyRecordSchema = new Schema<IIdempotencyRecord>(
  {
    key: {
      type: String,
      required: true,
      trim: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    requestHash: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'RESOLVED', 'FAILED'],
      default: 'PENDING',
      required: true,
    },
    statusCode: {
      type: Number,
    },
    responseBody: {
      type: Schema.Types.Mixed,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 86400, // Automatic TTL expiration after 24 hours
    },
  },
  {
    timestamps: true,
  }
);

// Enforce database-level uniqueness per user and idempotency key
idempotencyRecordSchema.index({ key: 1, userId: 1 }, { unique: true });

export const IdempotencyRecord = mongoose.model<IIdempotencyRecord>(
  'IdempotencyRecord',
  idempotencyRecordSchema
);

