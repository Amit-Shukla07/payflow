import { z } from 'zod';
import { MIN_TRANSFER_PAISE, MAX_SAFE_TRANSFER_PAISE } from '../utils/currency.js';

export const transferSchema = z.object({
  body: z.object({
    receiverEmail: z
      .string({ required_error: 'Receiver email is required' })
      .trim()
      .toLowerCase()
      .email('Please provide a valid receiver email address'),
    amount: z
      .number({ required_error: 'Amount is required' })
      .int('Amount must be an integer in paise')
      .min(MIN_TRANSFER_PAISE, `Minimum transfer amount is ${MIN_TRANSFER_PAISE} paise (₹1)`)
      .max(MAX_SAFE_TRANSFER_PAISE, 'Transfer amount exceeds maximum safe limit'),
    note: z.string().trim().max(200, 'Note cannot exceed 200 characters').optional(),
  }),
});

export const transactionQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    type: z.enum(['ALL', 'TRANSFER', 'TOPUP', 'SENT', 'RECEIVED']).default('ALL'),
    search: z.string().trim().optional(),
    startDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
    endDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  }),
});

