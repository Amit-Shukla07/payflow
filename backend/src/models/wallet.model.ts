import mongoose, { Document, Schema } from 'mongoose';

export interface IWallet extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  availableBalance: number; // Spendable funds in integer Paise (1 INR = 100 Paise)
  heldBalance: number;      // Reserved/in-flight funds pending undo window
  balance: number;          // Total or spendable balance for backward compatibility
  totalBalance?: number;    // Computed availableBalance + heldBalance
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

const walletSchema = new Schema<IWallet>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required for a wallet'],
      unique: true,
      index: true,
    },
    availableBalance: {
      type: Number,
      required: [true, 'Available balance is required'],
      default: 0,
      min: [0, 'Available balance cannot be negative'],
      validate: {
        validator: (value: number) => Number.isInteger(value) && value >= 0,
        message: '{VALUE} is not a valid integer paise available balance',
      },
    },
    heldBalance: {
      type: Number,
      required: [true, 'Held balance is required'],
      default: 0,
      min: [0, 'Held balance cannot be negative'],
      validate: {
        validator: (value: number) => Number.isInteger(value) && value >= 0,
        message: '{VALUE} is not a valid integer paise held balance',
      },
    },
    balance: {
      type: Number,
      default: 0,
      min: [0, 'Wallet balance cannot be negative'],
      validate: {
        validator: (value: number) => Number.isInteger(value) && value >= 0,
        message: '{VALUE} is not a valid integer paise balance',
      },
    },
    currency: {
      type: String,
      default: 'INR',
      enum: ['INR'],
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_, ret: any) => {
        delete ret.__v;
        // Ensure backward compatibility while exposing the breakdown
        ret.availableBalance = ret.availableBalance ?? ret.balance ?? 0;
        ret.heldBalance = ret.heldBalance ?? 0;
        ret.totalBalance = (ret.availableBalance || 0) + (ret.heldBalance || 0);
        ret.balance = ret.availableBalance;
        return ret;
      },
    },
  }
);

export const Wallet = mongoose.model<IWallet>('Wallet', walletSchema);
