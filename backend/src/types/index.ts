import { Request } from 'express';
import { Types } from 'mongoose';

export type Currency = 'INR';

export type TransactionType = 'TRANSFER' | 'TOPUP';

export type TransactionStatus =
  | 'PENDING_UNDO'
  | 'SETTLING'
  | 'SETTLED'
  | 'CANCELLED'
  | 'SUCCESS'
  | 'FAILED'
  | 'PENDING';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  idempotencyKey?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

