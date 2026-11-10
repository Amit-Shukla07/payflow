import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  Check,
  Printer,
  Clock,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import { transactionApi } from '../services/api.js';
import { Transaction } from '../types/index.js';
import { formatDate } from '../utils/currency.js';
import { useToast } from '../context/ToastContext.js';
import { useAuth } from '../context/AuthContext.js';

export const TransactionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedTxId, setCopiedTxId] = useState(false);

  useEffect(() => {
    if (!id) return;
    transactionApi
      .getTransactionById(id)
      .then((res) => {
        if (res.success && res.data) {
          setTransaction(res.data);
        }
      })
      .catch((err) => {
        setError(err.response?.data?.error?.message || 'Transaction not found');
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  const handleCopyId = () => {
    if (transaction?.id) {
      navigator.clipboard.writeText(transaction.id);
      setCopiedTxId(true);
      showToast('Transaction ID copied', 'info');
      setTimeout(() => setCopiedTxId(false), 2000);
    }
  };

  if (isLoading) {
    return <div className="p-12 text-center text-gray-400 text-sm">Loading receipt details...</div>;
  }

  if (error || !transaction) {
    return (
      <div className="max-w-md mx-auto text-center py-12 space-y-4">
        <p className="text-sm text-rose-600 font-semibold">{error || 'Transaction not found'}</p>
        <Link
          to="/transactions"
          className="inline-flex items-center space-x-1.5 px-6 py-2.5 rounded-full bg-black text-white text-xs font-bold"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Activity</span>
        </Link>
      </div>
    );
  }

  const isTopup = transaction.type === 'TOPUP';
  const isDebit = transaction.sender?.id === user?.id && !isTopup;
  const counterpartyName = isTopup
    ? 'State Bank of India (Deposit)'
    : isDebit
    ? transaction.receiver?.name || transaction.receiver?.email
    : transaction.sender?.name || transaction.sender?.email;
  const counterpartyEmail = isDebit ? transaction.receiver?.email : transaction.sender?.email;

  return (
    <div className="max-w-lg mx-auto space-y-6 animate-in fade-in duration-150">
      <div>
        <Link
          to="/transactions"
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-gray-500 hover:text-black transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Transactions</span>
        </Link>
      </div>

      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Receipt Header */}
        <div className="p-8 text-center border-b border-gray-100 space-y-3">
          <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center">
            {transaction.status === 'PENDING_UNDO' ? (
              <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center border-2 border-amber-200">
                <Clock className="w-8 h-8 animate-pulse" />
              </div>
            ) : transaction.status === 'CANCELLED' ? (
              <div className="w-16 h-16 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center border-2 border-gray-300">
                <RotateCcw className="w-8 h-8" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border-2 border-emerald-200">
                <CheckCircle2 className="w-8 h-8" />
              </div>
            )}
          </div>

          <div>
            <div className="text-3xl font-extrabold text-black tabular-numbers tracking-tight">
              {isDebit ? `- ${transaction.formattedAmount}` : `+ ${transaction.formattedAmount}`}
            </div>
            <div className="text-sm font-bold text-gray-900 mt-1">
              {isDebit ? 'Payment to' : 'Payment received from'} {counterpartyName}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">{formatDate(transaction.createdAt)}</div>
          </div>

          <div>
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                transaction.status === 'SETTLED'
                  ? 'bg-emerald-100 text-emerald-800'
                  : transaction.status === 'PENDING_UNDO'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-gray-200 text-gray-800'
              }`}
            >
              {transaction.status === 'SETTLED' ? 'Completed' : transaction.status}
            </span>
          </div>
        </div>

        {/* Breakdown details */}
        <div className="p-8 space-y-4 text-xs">
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Transaction Type</span>
              <span className="font-bold text-gray-900 capitalize">{transaction.type.toLowerCase()}</span>
            </div>

            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Counterparty Email</span>
              <span className="font-bold text-gray-900">{counterpartyEmail || 'N/A (Direct Top-up)'}</span>
            </div>

            {transaction.note && (
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Note / Memo</span>
                <span className="italic text-gray-900">"{transaction.note}"</span>
              </div>
            )}

            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Transaction ID</span>
              <div className="flex items-center space-x-1.5 font-mono text-gray-900">
                <span>{transaction.id}</span>
                <button
                  onClick={handleCopyId}
                  className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-black"
                >
                  {copiedTxId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Ledger Security</span>
              <span className="font-bold text-[#0047BA] flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Zero-loss ACID Ledger</span>
              </span>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between">
            <button
              onClick={() => window.print()}
              className="px-5 py-2.5 rounded-full border border-gray-300 hover:bg-gray-50 text-xs font-bold text-gray-700 flex items-center space-x-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Receipt</span>
            </button>

            <Link
              to="/transfer"
              className="px-6 py-2.5 rounded-full bg-black hover:bg-neutral-800 text-white text-xs font-bold transition-colors shadow-sm"
            >
              Send Another
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
