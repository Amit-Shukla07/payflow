import mongoose from 'mongoose';
import { Transaction } from '../models/transaction.model.js';
import { Wallet } from '../models/wallet.model.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';
import { formatPaiseToINR } from '../utils/currency.js';
import { PaginatedResult } from '../types/index.js';

export interface TransactionFilterOptions {
  page: number;
  limit: number;
  type?: 'ALL' | 'TRANSFER' | 'TOPUP' | 'SENT' | 'RECEIVED';
  search?: string;
  startDate?: string;
  endDate?: string;
}

export interface EnrichedTransaction {
  id: string;
  type: 'TRANSFER' | 'TOPUP';
  direction: 'SENT' | 'RECEIVED' | 'SELF';
  amount: number;
  formattedAmount: string;
  sender: {
    id: string;
    name: string;
    email: string;
  } | null;
  receiver: {
    id: string;
    name: string;
    email: string;
  } | null;
  status: string;
  note?: string;
  idempotencyKey?: string;
  undoExpiresAt?: Date;
  settledAt?: Date;
  cancelledAt?: Date;
  createdAt: Date;
}

function formatTransaction(tx: any, walletId: string): EnrichedTransaction {
  const isSender = tx.senderWalletId && tx.senderWalletId._id.toString() === walletId;
  const isTopup = tx.type === 'TOPUP';

  let direction: 'SENT' | 'RECEIVED' | 'SELF' = 'RECEIVED';
  if (isTopup) {
    direction = 'SELF';
  } else if (isSender) {
    direction = 'SENT';
  }

  const senderUser = tx.senderWalletId?.userId;
  const receiverUser = tx.receiverWalletId?.userId;

  return {
    id: tx._id.toString(),
    type: tx.type,
    direction,
    amount: tx.amount,
    formattedAmount: formatPaiseToINR(tx.amount),
    sender: senderUser
      ? {
          id: senderUser._id.toString(),
          name: senderUser.name,
          email: senderUser.email,
        }
      : null,
    receiver: receiverUser
      ? {
          id: receiverUser._id.toString(),
          name: receiverUser.name,
          email: receiverUser.email,
        }
      : null,
    status: tx.status,
    note: tx.note,
    idempotencyKey: tx.idempotencyKey,
    undoExpiresAt: tx.undoExpiresAt,
    settledAt: tx.settledAt,
    cancelledAt: tx.cancelledAt,
    createdAt: tx.createdAt,
  };
}

export class TransactionService {
  async getUserTransactions(
    userId: string,
    options: TransactionFilterOptions
  ): Promise<
    PaginatedResult<EnrichedTransaction> & {
      summary: {
        totalSent: number;
        totalReceived: number;
        formattedTotalSent: string;
        formattedTotalReceived: string;
      };
    }
  > {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const wallet = await Wallet.findOne({ userId: userObjectId });

    if (!wallet) {
      throw new NotFoundError('Wallet not found for this user', 'WALLET_NOT_FOUND');
    }

    const { page = 1, limit = 10, type = 'ALL', search, startDate, endDate } = options;
    const skip = (page - 1) * limit;

    const filter: any = {};

    if (type === 'SENT') {
      filter.senderWalletId = wallet._id;
    } else if (type === 'RECEIVED') {
      filter.receiverWalletId = wallet._id;
      filter.type = 'TRANSFER';
    } else if (type === 'TOPUP') {
      filter.type = 'TOPUP';
      filter.receiverWalletId = wallet._id;
    } else {
      filter.$or = [{ senderWalletId: wallet._id }, { receiverWalletId: wallet._id }];
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    if (search) {
      filter.note = { $regex: search, $options: 'i' };
    }

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: 'senderWalletId',
          populate: { path: 'userId', select: 'name email _id' },
        })
        .populate({
          path: 'receiverWalletId',
          populate: { path: 'userId', select: 'name email _id' },
        })
        .lean(),
      Transaction.countDocuments(filter),
    ]);

    // Calculate aggregated metrics for user's lifetime activity
    const [sentAgg, receivedAgg] = await Promise.all([
      Transaction.aggregate([
        { $match: { senderWalletId: wallet._id, status: { $in: ['SUCCESS', 'SETTLED'] } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Transaction.aggregate([
        { $match: { receiverWalletId: wallet._id, type: 'TRANSFER', status: { $in: ['SUCCESS', 'SETTLED'] } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    const totalSent = sentAgg[0]?.total || 0;
    const totalReceived = receivedAgg[0]?.total || 0;
    const walletIdStr = wallet._id.toString();

    const items = transactions.map((tx) => formatTransaction(tx, walletIdStr));
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      summary: {
        totalSent,
        totalReceived,
        formattedTotalSent: formatPaiseToINR(totalSent),
        formattedTotalReceived: formatPaiseToINR(totalReceived),
      },
    };
  }

  async getTransactionById(userId: string, transactionId: string): Promise<EnrichedTransaction> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const wallet = await Wallet.findOne({ userId: userObjectId });

    if (!wallet) {
      throw new NotFoundError('Wallet not found for this user', 'WALLET_NOT_FOUND');
    }

    if (!mongoose.Types.ObjectId.isValid(transactionId)) {
      throw new NotFoundError('Invalid transaction ID format', 'INVALID_TRANSACTION_ID');
    }

    const tx: any = await Transaction.findById(transactionId)
      .populate({
        path: 'senderWalletId',
        populate: { path: 'userId', select: 'name email _id' },
      })
      .populate({
        path: 'receiverWalletId',
        populate: { path: 'userId', select: 'name email _id' },
      })
      .lean();

    if (!tx) {
      throw new NotFoundError('Transaction not found', 'TRANSACTION_NOT_FOUND');
    }

    const walletIdStr = wallet._id.toString();
    const isSender = tx.senderWalletId && tx.senderWalletId._id.toString() === walletIdStr;
    const isReceiver = tx.receiverWalletId && tx.receiverWalletId._id.toString() === walletIdStr;

    if (!isSender && !isReceiver) {
      throw new ForbiddenError(
        'You do not have permission to view this transaction',
        'TRANSACTION_FORBIDDEN'
      );
    }

    return formatTransaction(tx, walletIdStr);
  }
}

export const transactionService = new TransactionService();
