import axios, { AxiosError } from 'axios';
import {
  User,
  Wallet,
  Transaction,
  TransactionHistoryResponse,
  TransferResult,
  UndoTransferResult,
} from '../types/index.js';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor to attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('payflow_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for centralized error handling
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<any>) => {
    if (error.response?.status === 401) {
      // Clear token if expired or unauthorized
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        localStorage.removeItem('payflow_token');
        localStorage.removeItem('payflow_user');
        window.location.href = '/login?expired=true';
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  register: async (data: { name: string; email: string; password: string }) => {
    const res = await api.post('/auth/register', data);
    return res.data;
  },

  login: async (data: { email: string; password: string }) => {
    const res = await api.post('/auth/login', data);
    return res.data;
  },

  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },
};

export const walletApi = {
  getWallet: async (): Promise<{ success: boolean; data: Wallet }> => {
    const res = await api.get('/wallet');
    return res.data;
  },

  topup: async (data: { amount: number; note?: string }, idempotencyKey: string) => {
    const res = await api.post('/wallet/topup', data, {
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
    });
    return res.data;
  },
};

export const transferApi = {
  sendTransfer: async (
    data: { receiverEmail: string; amount: number; note?: string },
    idempotencyKey: string
  ): Promise<{ success: boolean; data: TransferResult; message: string }> => {
    const res = await api.post('/transfers', data, {
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
    });
    return res.data;
  },

  undoTransfer: async (
    transactionId: string
  ): Promise<{ success: boolean; data: UndoTransferResult; message: string }> => {
    const res = await api.post(`/transfers/${transactionId}/undo`);
    return res.data;
  },
};

export const transactionApi = {
  getTransactions: async (params?: {
    page?: number;
    limit?: number;
    type?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ success: boolean; data: TransactionHistoryResponse }> => {
    const res = await api.get('/transactions', { params });
    return res.data;
  },

  getTransactionById: async (id: string): Promise<{ success: boolean; data: Transaction }> => {
    const res = await api.get(`/transactions/${id}`);
    return res.data;
  },
};

export const healthApi = {
  check: async () => {
    const res = await api.get('/health');
    return res.data;
  },
};

export default api;

