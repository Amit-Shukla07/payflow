import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import { AuthenticatedRequest } from '../types/index.js';
import { walletService } from '../services/wallet.service.js';
import { formatPaiseToINR } from '../utils/currency.js';

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.register(req.body);
      res.status(201).json({
        success: true,
        message: 'Account created successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.login(req.body);
      res.status(200).json({
        success: true,
        message: 'Logged in successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getMe(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const wallet = await walletService.getWalletByUserId(userId);
      const effectiveAvailable = wallet.availableBalance ?? wallet.balance ?? 0;

      res.status(200).json({
        success: true,
        data: {
          user: req.user,
          wallet: {
            id: wallet._id.toString(),
            availableBalance: effectiveAvailable,
            heldBalance: wallet.heldBalance ?? 0,
            balance: effectiveAvailable,
            formattedBalance: formatPaiseToINR(effectiveAvailable),
            currency: wallet.currency,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();

