import { Response, NextFunction } from 'express';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../types/index.js';
import { IdempotencyRecord } from '../models/idempotency.model.js';
import {
  AppError,
  IdempotencyConflictError,
  ConcurrentTransactionError,
} from '../utils/errors.js';

export function createRequestHash(req: AuthenticatedRequest): string {
  const payload = JSON.stringify({
    method: req.method,
    path: req.baseUrl + req.path,
    body: req.body,
  });
  return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * Idempotency Middleware for Financial Transactions
 *
 * Intercepts incoming requests carrying the `Idempotency-Key` header.
 * Ensures strict database-level unique execution per user and handles retries gracefully.
 */
export async function requireIdempotency(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const idempotencyKey = req.header('Idempotency-Key')?.trim();

  if (!idempotencyKey) {
    next(
      new AppError(
        'Idempotency-Key header is required for this operation',
        400,
        'IDEMPOTENCY_KEY_REQUIRED'
      )
    );
    return;
  }

  // Validate format (e.g. UUID, alphanumeric string with dashes, min 16 chars)
  if (idempotencyKey.length < 8 || idempotencyKey.length > 128) {
    next(
      new AppError(
        'Idempotency-Key must be between 8 and 128 characters',
        400,
        'INVALID_IDEMPOTENCY_KEY'
      )
    );
    return;
  }

  const userId = req.user?.id;
  if (!userId) {
    next(new AppError('User authentication required before idempotency validation', 401, 'UNAUTHORIZED'));
    return;
  }

  const requestHash = createRequestHash(req);
  req.idempotencyKey = idempotencyKey;

  try {
    // Check if an existing idempotency record exists
    const existingRecord = await IdempotencyRecord.findOne({
      key: idempotencyKey,
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (existingRecord) {
      // 1. If payload hash differs, it's a conflict
      if (existingRecord.requestHash !== requestHash) {
        throw new IdempotencyConflictError(
          'Idempotency key has already been used with a different request payload'
        );
      }

      // 2. If it's still pending, concurrent execution detected
      if (existingRecord.status === 'PENDING') {
        throw new ConcurrentTransactionError();
      }

      // 3. If resolved, return the cached response
      if (existingRecord.status === 'RESOLVED') {
        res.setHeader('Idempotent-Replay', 'true');
        res.status(existingRecord.statusCode || 200).json(existingRecord.responseBody);
        return;
      }
    }

    // Try to reserve the idempotency key in PENDING state
    try {
      await IdempotencyRecord.create({
        key: idempotencyKey,
        userId: new mongoose.Types.ObjectId(userId),
        requestHash,
        status: 'PENDING',
      });
    } catch (createErr: any) {
      // If duplicate key error (race condition between find and create)
      if (createErr.code === 11000) {
        const raceRecord = await IdempotencyRecord.findOne({
          key: idempotencyKey,
          userId: new mongoose.Types.ObjectId(userId),
        });

        if (raceRecord?.requestHash !== requestHash) {
          throw new IdempotencyConflictError(
            'Idempotency key conflict: race condition detected with conflicting payload'
          );
        }

        if (raceRecord?.status === 'PENDING') {
          throw new ConcurrentTransactionError();
        }

        if (raceRecord?.status === 'RESOLVED') {
          res.setHeader('Idempotent-Replay', 'true');
          res.status(raceRecord.statusCode || 200).json(raceRecord.responseBody);
          return;
        }
      }
      throw createErr;
    }

    // Capture the original json method to persist resolved response body upon completion
    const originalJson = res.json.bind(res);
    res.json = (body: any): Response => {
      // Restore original json method
      res.json = originalJson;

      // Update idempotency record asynchronously in the background
      const statusCode = res.statusCode;
      const isSuccess = statusCode >= 200 && statusCode < 300;

      IdempotencyRecord.updateOne(
        {
          key: idempotencyKey,
          userId: new mongoose.Types.ObjectId(userId),
        },
        {
          $set: {
            status: isSuccess ? 'RESOLVED' : 'FAILED',
            statusCode,
            responseBody: body,
          },
        }
      ).catch((err) => {
        console.error('Failed to update idempotency record:', err);
      });

      return originalJson(body);
    };

    next();
  } catch (error) {
    next(error);
  }
}

