import mongoose, { Document, Schema } from 'mongoose';
import { TransactionType, TransactionStatus } from '../types/index.js';

export interface ITransaction extends Document {
  _id: mongoose.Types.ObjectId;
  type: TransactionType;
  senderWalletId: mongoose.Types.ObjectId | null;
  receiverWalletId: mongoose.Types.ObjectId;
  initiatedBy: mongoose.Types.ObjectId;
  amount: number; // Stored in integer Paise
  status: TransactionStatus;
  note?: string;
  idempotencyKey?: string;
  undoExpiresAt?: Date;
  settledAt?: Date;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>(
  {
    type: {
      type: String,
      required: true,
      enum: ['TRANSFER', 'TOPUP'],
      index: true,
    },
    senderWalletId: {
      type: Schema.Types.ObjectId,
      ref: 'Wallet',
      default: null,
      index: true,
    },
    receiverWalletId: {
      type: Schema.Types.ObjectId,
      ref: 'Wallet',
      required: true,
      index: true,
    },
    initiatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Transaction amount is required'],
      min: [100, 'Minimum transaction amount is 100 paise (₹1)'],
      validate: {
        validator: (value: number) => Number.isInteger(value) && value > 0,
        message: '{VALUE} must be a positive integer in paise',
      },
    },
    status: {
      type: String,
      required: true,
      enum: [
        'PENDING_UNDO',
        'SETTLING',
        'SETTLED',
        'CANCELLED',
        'SUCCESS',
        'FAILED',
        'PENDING',
      ],
      default: 'PENDING',
      index: true,
    },
    note: {
      type: String,
      trim: true,
      maxlength: [200, 'Note cannot exceed 200 characters'],
    },
    idempotencyKey: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      index: true,
    },
    undoExpiresAt: {
      type: Date,
      index: true,
    },
    settledAt: {
      type: Date,
    },
    cancelledAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_, ret) => {
        delete (ret as any).__v;
        return ret;
      },
    },
  }
);

// Compound indexes for performant wallet, user feeds, and settlement worker queries
transactionSchema.index({ senderWalletId: 1, createdAt: -1 });
transactionSchema.index({ receiverWalletId: 1, createdAt: -1 });
transactionSchema.index({ initiatedBy: 1, createdAt: -1 });
transactionSchema.index({ status: 1, undoExpiresAt: 1 });

export const Transaction = mongoose.model<ITransaction>('Transaction', transactionSchema);
