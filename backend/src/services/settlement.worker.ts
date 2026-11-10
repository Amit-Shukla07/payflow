import mongoose from 'mongoose';
import { Transaction } from '../models/transaction.model.js';
import { Wallet } from '../models/wallet.model.js';
import { logger } from '../utils/logger.js';

export class SettlementWorker {
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private isRunning = false;

  start(intervalMs = 1000): void {
    if (this.isRunning) return;
    this.isRunning = true;
    logger.info(`Starting Settlement Worker (interval: ${intervalMs}ms)`);

    this.timer = setInterval(async () => {
      if (this.isProcessing) return;
      this.isProcessing = true;
      try {
        await this.processExpiredTransactions();
      } catch (err) {
        logger.error('Error in settlement worker cycle:', err);
      } finally {
        this.isProcessing = false;
      }
    }, intervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    logger.info('Settlement Worker stopped');
  }

  /**
   * Scans and processes expired PENDING_UNDO or interrupted SETTLING transactions.
   */
  async processExpiredTransactions(batchSize = 50): Promise<number> {
    const now = new Date();

    const candidates = await Transaction.find({
      $or: [
        { status: 'PENDING_UNDO', undoExpiresAt: { $lte: now } },
        { status: 'SETTLING' },
      ],
    })
      .sort({ undoExpiresAt: 1 })
      .limit(batchSize);

    let settledCount = 0;
    for (const tx of candidates) {
      const settled = await this.settleTransaction(tx._id.toString());
      if (settled) settledCount++;
    }

    return settledCount;
  }

  /**
   * Atomically settles a single eligible transaction.
   * Debits sender heldBalance and credits receiver availableBalance.
   */
  async settleTransaction(transactionId: string): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(transactionId)) {
      return false;
    }

    const txId = new mongoose.Types.ObjectId(transactionId);
    const session = await mongoose.startSession();

    try {
      let settled = false;

      await session.withTransaction(async () => {
        const now = new Date();

        // 1. Claim transaction to SETTLING state
        const claimedTx = await Transaction.findOneAndUpdate(
          {
            _id: txId,
            $or: [
              { status: 'PENDING_UNDO', undoExpiresAt: { $lte: now } },
              { status: 'SETTLING' },
            ],
          },
          { $set: { status: 'SETTLING' } },
          { new: true, session }
        );

        if (!claimedTx) return;

        // 2. Debit sender heldBalance and balance
        const updatedSender = await Wallet.findOneAndUpdate(
          { _id: claimedTx.senderWalletId, heldBalance: { $gte: claimedTx.amount } },
          { $inc: { heldBalance: -claimedTx.amount, balance: -claimedTx.amount } },
          { new: true, session }
        );

        if (!updatedSender) {
          throw new Error('Sender held balance insufficient during settlement');
        }

        // 3. Credit receiver availableBalance and balance
        const updatedReceiver = await Wallet.findOneAndUpdate(
          { _id: claimedTx.receiverWalletId },
          { $inc: { availableBalance: claimedTx.amount, balance: claimedTx.amount } },
          { new: true, session }
        );

        if (!updatedReceiver) {
          throw new Error('Receiver wallet not found during settlement');
        }

        // 4. Mark transaction SETTLED
        const finalizedTx = await Transaction.findByIdAndUpdate(
          claimedTx._id,
          { $set: { status: 'SETTLED', settledAt: new Date() } },
          { new: true, session }
        );

        if (finalizedTx) {
          settled = true;
          logger.info('Transaction settled successfully', {
            txId: finalizedTx._id.toString(),
            amount: finalizedTx.amount,
          });
        }
      });

      return settled;
    } catch (error) {
      logger.error('Failed to settle transaction:', { transactionId, error });
      return false;
    } finally {
      await session.endSession();
    }
  }
}

export const settlementWorker = new SettlementWorker();
