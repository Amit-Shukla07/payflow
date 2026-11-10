import { Router } from 'express';
import authRoutes from './auth.routes.js';
import walletRoutes from './wallet.routes.js';
import transferRoutes from './transfer.routes.js';
import transactionRoutes from './transaction.routes.js';
import healthRoutes from './health.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/wallet', walletRoutes);
router.use('/transfers', transferRoutes);
router.use('/transactions', transactionRoutes);
router.use('/health', healthRoutes);

export default router;

