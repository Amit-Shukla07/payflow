import { Router } from 'express';
import { walletController } from '../controllers/wallet.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireIdempotency } from '../middleware/idempotency.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { topupSchema } from '../validators/wallet.validator.js';

const router = Router();

router.use(authenticate);

router.get('/', walletController.getWallet);
router.post('/topup', requireIdempotency, validate(topupSchema), walletController.topup);

export default router;

