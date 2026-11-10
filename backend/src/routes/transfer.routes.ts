import { Router } from 'express';
import { transferController } from '../controllers/transfer.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireIdempotency } from '../middleware/idempotency.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { transferSchema } from '../validators/transfer.validator.js';

const router = Router();

router.use(authenticate);

router.post('/', requireIdempotency, validate(transferSchema), transferController.transfer);
router.post('/:id/undo', transferController.undo);

export default router;

