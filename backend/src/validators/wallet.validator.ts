import { z } from 'zod';
import { MIN_TRANSFER_PAISE, MAX_SAFE_TRANSFER_PAISE } from '../utils/currency.js';

export const topupSchema = z.object({
  body: z.object({
    amount: z
      .number({ required_error: 'Amount is required' })
      .int('Amount must be an integer in paise')
      .min(MIN_TRANSFER_PAISE, `Minimum top-up amount is ${MIN_TRANSFER_PAISE} paise (₹1)`)
      .max(10_00_000_00, 'Maximum top-up amount is ₹10,00,000 (100,000,000 paise)'),
    note: z.string().trim().max(100, 'Note cannot exceed 100 characters').optional(),
  }),
});

