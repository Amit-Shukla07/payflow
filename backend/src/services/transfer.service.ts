import mongoose from 'mongoose';
import { User } from '../models/user.model.js';
import { Wallet } from '../models/wallet.model.js';
import { Transaction } from '../models/transaction.model.js';
import {
  AppError,
  NotFoundError,
  ForbiddenError,
  InsufficientFundsError,
} from '../utils/errors.js';
import { isValidPaiseAmount, formatPaiseToINR } from '../utils/currency.js';
import { logger } from '../utils/logger.js';

export interface TransferDTO {
  senderId: string;
  senderEmail: string;
  receiverEmail: string;
  amount: number; // in integer paise
  note?: string;
  idempotencyKey?: string;
}

export interface TransferResult {
  transaction: {
    id: string;
    type: 'TRANSFER';
    amount: number;
    formattedAmount: string;
    senderEmail: string;
    senderName: string;
    receiverEmail: string;
    receiverName: string;
    status: 'PENDING_UNDO';
    undoExpiresAt: Date;
    note?: string;
    idempotencyKey?: string;
    createdAt: Date;
  };
  senderRemainingAvailableBalance: number;
  senderRemainingBalance: number;
  formattedRemainingBalance: string;
}

export interface UndoResult {
  transaction: {
    id: string;
    type: 'TRANSFER';
    amount: number;
    formattedAmount: string;
    status: 'CANCELLED';
    cancelledAt: Date;
  };
  senderRestoredBalance: number;
  formattedRestoredBalance: string;
  message: string;
}

export class TransferService {
  /**
   * Initiates a transfer entering the 10-second PayFlow Undo window.
   * Decreases sender availableBalance and increases sender heldBalance atomically.
   */
  async executeTransfer(dto: TransferDTO): Promise<TransferResult> {
    const { senderId, senderEmail, amount, note, idempotencyKey } = dto;
    const receiverEmail = dto.receiverEmail.toLowerCase().trim();

    // 1. Amount validation
    if (!isValidPaiseAmount(amount)) {
      throw new AppError('Invalid transfer amount in paise', 400, 'INVALID_AMOUNT');
    }

    // 2. Reject self-transfer
    if (senderEmail.toLowerCase() === receiverEmail) {
      throw new AppError('Cannot transfer money to yourself', 400, 'SELF_TRANSFER_PROHIBITED');
    }

    // 3. Resolve receiver user and verify existence
    const receiverUser = await User.findOne({ email: receiverEmail });
    if (!receiverUser) {
      throw new NotFoundError(
        `Recipient with email '${receiverEmail}' does not exist on PayFlow`,
        'RECEIVER_NOT_FOUND'
      );
    }

    if (receiverUser._id.toString() === senderId) {
      throw new AppError('Cannot transfer money to yourself', 400, 'SELF_TRANSFER_PROHIBITED');
    }

    const senderUser = await User.findById(senderId);
    if (!senderUser) {
      throw new NotFoundError('Sender account not found', 'SENDER_NOT_FOUND');
    }

    // 4. Resolve wallets
    const senderWallet = await Wallet.findOne({ userId: senderUser._id });
    if (!senderWallet) {
      throw new NotFoundError('Sender wallet not found', 'WALLET_NOT_FOUND');
    }

    // Ensure legacy wallets have availableBalance synced
    if ((senderWallet.availableBalance === 0 || senderWallet.availableBalance === undefined) && senderWallet.balance > 0 && (senderWallet.heldBalance || 0) === 0) {
      await Wallet.updateOne({ _id: senderWallet._id }, { $set: { availableBalance: senderWallet.balance } });
      senderWallet.availableBalance = senderWallet.balance;
    }

    const receiverWallet = await Wallet.findOne({ userId: receiverUser._id });
    if (!receiverWallet) {
      throw new NotFoundError('Receiver wallet not found', 'WALLET_NOT_FOUND');
    }

    if ((receiverWallet.availableBalance === 0 || receiverWallet.availableBalance === undefined) && receiverWallet.balance > 0 && (receiverWallet.heldBalance || 0) === 0) {
      await Wallet.updateOne({ _id: receiverWallet._id }, { $set: { availableBalance: receiverWallet.balance } });
      receiverWallet.availableBalance = receiverWallet.balance;
    }

    // 5. Atomic multi-document transaction to reserve funds
    const session = await mongoose.startSession();

    try {
      let createdTransaction: any = null;
      let finalSenderWallet: any = null;
      const undoExpiresAt = new Date(Date.now() + 10000); // 10-second cancellation window

      await session.withTransaction(async () => {
        // Reserve funds: move from availableBalance to heldBalance conditionally
        const updatedSenderWallet = await Wallet.findOneAndUpdate(
          {
            _id: senderWallet._id,
            availableBalance: { $gte: amount },
          },
          {
            $inc: {
              availableBalance: -amount,
              heldBalance: amount,
            },
          },
          {
            new: true,
            session,
          }
        );

        if (!updatedSenderWallet) {
          throw new InsufficientFundsError(
            'Transfer failed: Insufficient wallet balance for this transaction'
          );
        }

        finalSenderWallet = updatedSenderWallet;

        // Record the transaction with status PENDING_UNDO
        const [txDoc] = await Transaction.create(
          [
            {
              type: 'TRANSFER',
              senderWalletId: senderWallet._id,
              receiverWalletId: receiverWallet._id,
              initiatedBy: senderUser._id,
              amount,
              status: 'PENDING_UNDO',
              undoExpiresAt,
              note: note || 'Peer-to-peer Transfer',
              idempotencyKey,
            },
          ],
          { session }
        );

        createdTransaction = txDoc;
      });

      logger.info('Transfer initiated in PENDING_UNDO state', {
        txId: createdTransaction._id.toString(),
        amount,
        sender: senderEmail,
        receiver: receiverEmail,
        undoExpiresAt: undoExpiresAt.toISOString(),
      });

      return {
        transaction: {
          id: createdTransaction._id.toString(),
          type: 'TRANSFER',
          amount,
          formattedAmount: formatPaiseToINR(amount),
          senderEmail: senderUser.email,
          senderName: senderUser.name,
          receiverEmail: receiverUser.email,
          receiverName: receiverUser.name,
          status: 'PENDING_UNDO',
          undoExpiresAt: createdTransaction.undoExpiresAt,
          note: createdTransaction.note,
          idempotencyKey,
          createdAt: createdTransaction.createdAt,
        },
        senderRemainingAvailableBalance: finalSenderWallet.availableBalance,
        senderRemainingBalance: finalSenderWallet.availableBalance,
        formattedRemainingBalance: formatPaiseToINR(finalSenderWallet.availableBalance),
      };
    } finally {
      await session.endSession();
    }
  }

  /**
   * Cancels a PENDING_UNDO transfer within the 10-second window.
   * Returns reserved funds from heldBalance back to sender's availableBalance.
   */
  async undoTransfer(userId: string, transactionId: string): Promise<UndoResult> {
    if (!mongoose.Types.ObjectId.isValid(transactionId)) {
      throw new NotFoundError('Invalid transaction ID format', 'INVALID_TRANSACTION_ID');
    }

    const tx = await Transaction.findById(transactionId);
    if (!tx) {
      throw new NotFoundError('Transaction not found', 'TRANSACTION_NOT_FOUND');
    }

    if (tx.initiatedBy.toString() !== userId) {
      throw new ForbiddenError(
        'You do not have permission to cancel this transfer',
        'UNAUTHORIZED_UNDO'
      );
    }

    // Idempotent return if already cancelled
    if (tx.status === 'CANCELLED') {
      const senderWallet = await Wallet.findById(tx.senderWalletId);
      return {
        transaction: {
          id: tx._id.toString(),
          type: 'TRANSFER',
          amount: tx.amount,
          formattedAmount: formatPaiseToINR(tx.amount),
          status: 'CANCELLED',
          cancelledAt: tx.cancelledAt || tx.updatedAt,
        },
        senderRestoredBalance: senderWallet?.availableBalance ?? 0,
        formattedRestoredBalance: formatPaiseToINR(senderWallet?.availableBalance ?? 0),
        message: 'Transfer was already cancelled.',
      };
    }

    if (tx.status === 'SETTLED' || tx.status === 'SETTLING' || tx.status === 'SUCCESS') {
      throw new AppError(
        'Transfer has already been settled and cannot be undone',
        400,
        'ALREADY_SETTLED'
      );
    }

    const now = new Date();
    if (!tx.undoExpiresAt || now > tx.undoExpiresAt) {
      throw new AppError(
        'The 10-second cancellation window has expired',
        400,
        'UNDO_WINDOW_EXPIRED'
      );
    }

    // Cancel transaction and return reserved funds in a session
    const session = await mongoose.startSession();
    try {
      let updatedTx: any = null;
      let updatedSenderWallet: any = null;

      await session.withTransaction(async () => {
        // Atomically transition from PENDING_UNDO to CANCELLED only if deadline hasn't elapsed
        updatedTx = await Transaction.findOneAndUpdate(
          {
            _id: tx._id,
            status: 'PENDING_UNDO',
            undoExpiresAt: { $gt: now },
          },
          {
            $set: {
              status: 'CANCELLED',
              cancelledAt: now,
            },
          },
          { new: true, session }
        );

        if (!updatedTx) {
          const latest = await Transaction.findById(tx._id).session(session);
          if (latest?.status === 'SETTLED' || latest?.status === 'SETTLING') {
            throw new AppError(
              'Transfer has already been settled and cannot be undone',
              400,
              'ALREADY_SETTLED'
            );
          }
          throw new AppError(
            'The 10-second cancellation window has expired',
            400,
            'UNDO_WINDOW_EXPIRED'
          );
        }

        // Return reserved funds to sender: decrease heldBalance, increase availableBalance
        updatedSenderWallet = await Wallet.findOneAndUpdate(
          {
            _id: tx.senderWalletId,
            heldBalance: { $gte: tx.amount },
          },
          {
            $inc: {
              availableBalance: tx.amount,
              heldBalance: -tx.amount,
            },
          },
          { new: true, session }
        );

        if (!updatedSenderWallet) {
          throw new AppError(
            'Failed to return held balance to sender wallet',
            500,
            'REVERSAL_FAILED'
          );
        }
      });

      logger.info('Transfer cancelled via PayFlow Undo', {
        txId: tx._id.toString(),
        amount: tx.amount,
        senderId: userId,
        refundedAt: now.toISOString(),
      });

      return {
        transaction: {
          id: updatedTx._id.toString(),
          type: 'TRANSFER',
          amount: updatedTx.amount,
          formattedAmount: formatPaiseToINR(updatedTx.amount),
          status: 'CANCELLED',
          cancelledAt: updatedTx.cancelledAt,
        },
        senderRestoredBalance: updatedSenderWallet.availableBalance,
        formattedRestoredBalance: formatPaiseToINR(updatedSenderWallet.availableBalance),
        message: 'Transfer cancelled successfully. Funds have been returned to your available balance.',
      };
    } finally {
      await session.endSession();
    }
  }
}

export const transferService = new TransferService();
