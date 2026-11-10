import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { walletService } from '../services/wallet.service.js';
import { formatPaiseToINR } from '../utils/currency.js';

export class WalletController {
  async getWallet(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const wallet = await walletService.getWalletByUserId(userId);
      const effectiveAvailable = wallet.availableBalance ?? wallet.balance ?? 0;

      res.status(200).json({
        success: true,
        data: {
          id: wallet._id.toString(),
          availableBalance: effectiveAvailable,
          heldBalance: wallet.heldBalance ?? 0,
          balance: effectiveAvailable,
          formattedBalance: formatPaiseToINR(effectiveAvailable),
          currency: wallet.currency,
          updatedAt: wallet.updatedAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async topup(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { amount, note } = req.body;
      const idempotencyKey = req.idempotencyKey;

      const result = await walletService.topup({
        userId,
        amount,
        note,
        idempotencyKey,
      });

      res.status(200).json({
        success: true,
        message: 'Funds added successfully',
        data: {
          wallet: {
            id: result.wallet._id.toString(),
            balance: result.wallet.balance,
            formattedBalance: result.formattedBalance,
            currency: result.wallet.currency,
          },
          transaction: {
            id: result.transaction._id.toString(),
            type: result.transaction.type,
            amount: result.transaction.amount,
            formattedAmount: formatPaiseToINR(result.transaction.amount),
            status: result.transaction.status,
            createdAt: result.transaction.createdAt,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const walletController = new WalletController();

