import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { transferService } from '../services/transfer.service.js';

export class TransferController {
  async transfer(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const senderId = req.user!.id;
      const senderEmail = req.user!.email;
      const { receiverEmail, amount, note } = req.body;
      const idempotencyKey = req.idempotencyKey;

      const result = await transferService.executeTransfer({
        senderId,
        senderEmail,
        receiverEmail,
        amount,
        note,
        idempotencyKey,
      });

      res.status(200).json({
        success: true,
        message: 'Transfer completed successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async undo(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const transactionId = req.params.id;

      const result = await transferService.undoTransfer(userId, transactionId);

      res.status(200).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const transferController = new TransferController();

