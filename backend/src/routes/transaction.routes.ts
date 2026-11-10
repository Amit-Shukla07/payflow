import { Router } from 'express';
import { transactionController } from '../controllers/transaction.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { transactionQuerySchema } from '../validators/transfer.validator.js';

const router = Router();

router.use(authenticate);

router.get('/', validate(transactionQuerySchema), transactionController.getTransactions);
router.get('/:id', transactionController.getTransactionById);

export default router;

