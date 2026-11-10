import mongoose from 'mongoose';
import { Wallet, IWallet } from '../models/wallet.model.js';
import { Transaction } from '../models/transaction.model.js';
import { AppError, NotFoundError } from '../utils/errors.js';
import { isValidPaiseAmount, formatPaiseToINR } from '../utils/currency.js';

export interface TopupDTO {
  userId: string;
  amount: number; // in integer paise
  note?: string;
  idempotencyKey?: string;
}

export class WalletService {
  async getWalletByUserId(userId: string): Promise<IWallet> {
    const wallet = await Wallet.findOne({ userId: new mongoose.Types.ObjectId(userId) });
    if (!wallet) {
      throw new NotFoundError('Wallet not found for this user', 'WALLET_NOT_FOUND');
    }

    // Auto-heal legacy/seeded wallets where availableBalance was not set
    if ((wallet.availableBalance === 0 || wallet.availableBalance === undefined) && wallet.balance > 0 && (wallet.heldBalance || 0) === 0) {
      await Wallet.updateOne({ _id: wallet._id }, { $set: { availableBalance: wallet.balance } });
      wallet.availableBalance = wallet.balance;
    }

    return wallet;
  }

  async topup(dto: TopupDTO) {
    if (!isValidPaiseAmount(dto.amount)) {
      throw new AppError('Invalid top-up amount in paise', 400, 'INVALID_AMOUNT');
    }

    const userObjectId = new mongoose.Types.ObjectId(dto.userId);
    const session = await mongoose.startSession();

    try {
      let updatedWallet: IWallet | null = null;
      let transactionDoc: any = null;

      await session.withTransaction(async () => {
        const wallet = await Wallet.findOne({ userId: userObjectId }).session(session);
        if (!wallet) {
          throw new NotFoundError('Wallet not found for user', 'WALLET_NOT_FOUND');
        }

        // Atomically increment available balance and total balance
        updatedWallet = await Wallet.findByIdAndUpdate(
          wallet._id,
          {
            $inc: {
              availableBalance: dto.amount,
              balance: dto.amount,
            },
          },
          { new: true, runValidators: true, session }
        );

        if (!updatedWallet) {
          throw new AppError('Failed to top-up wallet balance', 500, 'TOPUP_FAILED');
        }

        // Create transaction record
        const [createdTx] = await Transaction.create(
          [
            {
              type: 'TOPUP',
              senderWalletId: null,
              receiverWalletId: wallet._id,
              initiatedBy: userObjectId,
              amount: dto.amount,
              status: 'SUCCESS',
              note: dto.note || 'Wallet Top-up',
              idempotencyKey: dto.idempotencyKey,
            },
          ],
          { session }
        );

        transactionDoc = createdTx;
      });

      return {
        wallet: updatedWallet!,
        transaction: transactionDoc,
        formattedBalance: formatPaiseToINR(updatedWallet!.availableBalance ?? updatedWallet!.balance),
        formattedAvailableBalance: formatPaiseToINR(updatedWallet!.availableBalance),
        formattedHeldBalance: formatPaiseToINR(updatedWallet!.heldBalance),
      };
    } finally {
      await session.endSession();
    }
  }
}

export const walletService = new WalletService();
