export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Wallet {
  id: string;
  balance: number; // in paise
  availableBalance?: number; // spendable in paise
  heldBalance?: number;      // in-flight/reserved in paise
  totalBalance?: number;
  formattedBalance: string;
  formattedAvailableBalance?: string;
  formattedHeldBalance?: string;
  currency: string;
  updatedAt?: string;
}

export interface TransactionSenderReceiver {
  id: string;
  name: string;
  email: string;
}

export interface Transaction {
  id: string;
  type: 'TRANSFER' | 'TOPUP';
  direction: 'SENT' | 'RECEIVED' | 'SELF';
  amount: number; // in paise
  formattedAmount: string;
  sender: TransactionSenderReceiver | null;
  receiver: TransactionSenderReceiver | null;
  status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'PENDING_UNDO' | 'SETTLING' | 'SETTLED' | 'CANCELLED';
  note?: string;
  idempotencyKey?: string;
  undoExpiresAt?: string;
  settledAt?: string;
  cancelledAt?: string;
  createdAt: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface TransactionHistoryResponse {
  items: Transaction[];
  pagination: Pagination;
  summary: {
    totalSent: number;
    totalReceived: number;
    formattedTotalSent: string;
    formattedTotalReceived: string;
  };
}

export interface TransferResult {
  transaction: {
    id: string;
    type: 'TRANSFER';
    amount: number;
    formattedAmount: string;
    senderEmail: string;
    senderName: string;
    receiverEmail: string;
    receiverName: string;
    status: 'PENDING_UNDO' | 'SETTLING' | 'SETTLED' | 'CANCELLED' | 'SUCCESS';
    undoExpiresAt?: string;
    settledAt?: string;
    cancelledAt?: string;
    note?: string;
    idempotencyKey?: string;
    createdAt: string;
  };
  senderRemainingAvailableBalance?: number;
  senderRemainingBalance: number;
  formattedRemainingBalance: string;
}

export interface UndoTransferResult {
  transaction: {
    id: string;
    type: 'TRANSFER';
    amount: number;
    formattedAmount: string;
    status: 'CANCELLED';
    cancelledAt: string;
  };
  senderRestoredBalance: number;
  formattedRestoredBalance: string;
  message: string;
}

export interface ApiErrorResponse {
  code: string;
  message: string;
  details?: any;
}

