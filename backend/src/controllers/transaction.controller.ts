import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { transactionService } from '../services/transaction.service.js';

export class TransactionController {
  async getTransactions(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { page, limit, type, search, startDate, endDate } = req.query as any;

      const result = await transactionService.getUserTransactions(userId, {
        page: Number(page) || 1,
        limit: Number(limit) || 10,
        type,
        search,
        startDate,
        endDate,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getTransactionById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const transactionId = req.params.id;

      const result = await transactionService.getTransactionById(userId, transactionId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const transactionController = new TransactionController();

