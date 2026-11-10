import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Send,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  RotateCcw,
  Clock,
  ShieldCheck,
  ArrowDownLeft,
  X,
  ArrowLeft,
  Copy,
  Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { transferApi, transactionApi } from '../services/api.js';
import { formatPaise, inrToPaise, formatINR } from '../utils/currency.js';
import { TransferResult } from '../types/index.js';
import { useToast } from '../context/ToastContext.js';

interface ActiveUndoState {
  receipt: TransferResult;
  status: 'PENDING_UNDO' | 'SETTLING' | 'SETTLED' | 'CANCELLED';
  expiresAtMs: number;
  remainingMs: number;
  progress: number;
  isUndoing: boolean;
}

export const TransferPage: React.FC = () => {
  const { user, wallet, refreshWallet } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = searchParams.get('mode') === 'request' ? 'request' : 'send';
  const initialTo = searchParams.get('to') || '';

  const [receiverEmail, setReceiverEmail] = useState(initialTo);
  const [inrAmount, setInrAmount] = useState('500');
  const [note, setNote] = useState('');
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  // Request mode
  const [requestPayerEmail, setRequestPayerEmail] = useState('');
  const [requestAmount, setRequestAmount] = useState('1000');
  const [requestNote, setRequestNote] = useState('');
  const [requestCreated, setRequestCreated] = useState<boolean>(false);

  // Undo state
  const [activeUndo, setActiveUndo] = useState<ActiveUndoState | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => crypto.randomUUID());
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const parsedInr = parseFloat(inrAmount) || 0;
  const calculatedPaise = inrToPaise(parsedInr);
  const availablePaise = wallet?.availableBalance ?? wallet?.balance ?? 0;

  useEffect(() => {
    if (initialTo && !receiverEmail) {
      setReceiverEmail(initialTo);
    }
  }, [initialTo]);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  // 10-second countdown loop
  useEffect(() => {
    if (!activeUndo || activeUndo.status !== 'PENDING_UNDO') return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, activeUndo.expiresAtMs - Date.now());
      const progress = Math.min(100, Math.max(0, (remaining / 10000) * 100));

      if (remaining <= 0) {
        clearInterval(interval);
        setActiveUndo((prev) => (prev ? { ...prev, status: 'SETTLING', remainingMs: 0, progress: 0 } : null));
        startSettlementPolling(activeUndo.receipt.transaction.id);
      } else {
        setActiveUndo((prev) => (prev ? { ...prev, remainingMs: remaining, progress } : null));
      }
    }, 100);

    return () => clearInterval(interval);
  }, [activeUndo?.expiresAtMs, activeUndo?.status]);

  const startSettlementPolling = (transactionId: string) => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);

    pollTimerRef.current = setInterval(async () => {
      try {
        const res = await transactionApi.getTransactionById(transactionId);
        if (res.success && res.data) {
          if (res.data.status === 'SETTLED' || res.data.status === 'SUCCESS') {
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
            setActiveUndo((prev) => (prev ? { ...prev, status: 'SETTLED' } : null));
            showToast('Transfer finalized and settled in ledger', 'success');
            await refreshWallet();
          } else if (res.data.status === 'CANCELLED') {
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
            setActiveUndo((prev) => (prev ? { ...prev, status: 'CANCELLED' } : null));
            await refreshWallet();
          }
        }
      } catch {
        // Poll retry
      }
    }, 1000);
  };

  const handleOpenReview = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const email = receiverEmail.trim().toLowerCase();

    if (!email) return setError('Please enter a valid recipient email');
    if (email === user?.email.toLowerCase()) return setError('Cannot transfer money to yourself');
    if (parsedInr <= 0 || isNaN(parsedInr)) return setError('Transfer amount must be greater than ₹0');
    if (calculatedPaise > availablePaise) {
      return setError(`Insufficient funds. Available: ${formatPaise(availablePaise)}`);
    }

    setIsReviewOpen(true);
  };

  const handleExecuteTransfer = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      const res = await transferApi.sendTransfer(
        {
          receiverEmail: receiverEmail.trim().toLowerCase(),
          amount: calculatedPaise,
          note: note.trim() || 'Peer Transfer',
        },
        idempotencyKey
      );

      if (res.success && res.data) {
        setIsReviewOpen(false);
        const expiresAt = res.data.transaction.undoExpiresAt
          ? new Date(res.data.transaction.undoExpiresAt).getTime()
          : Date.now() + 10000;

        setActiveUndo({
          receipt: res.data,
          status: 'PENDING_UNDO',
          expiresAtMs: expiresAt,
          remainingMs: Math.max(0, expiresAt - Date.now()),
          progress: 100,
          isUndoing: false,
        });

        showToast('Transfer initiated. 10-second Undo window started.', 'info');
        await refreshWallet();
        setIdempotencyKey(crypto.randomUUID());
      }
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Transfer failed. Please retry.';
      setError(msg);
      showToast(msg, 'error');
      setIsReviewOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUndoTransfer = async () => {
    if (!activeUndo || activeUndo.status !== 'PENDING_UNDO') return;

    try {
      setActiveUndo((prev) => (prev ? { ...prev, isUndoing: true } : null));
      const res = await transferApi.undoTransfer(activeUndo.receipt.transaction.id);

      if (res.success) {
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        setActiveUndo((prev) => (prev ? { ...prev, status: 'CANCELLED', isUndoing: false } : null));
        showToast('Transfer cancelled! Funds returned to your available balance.', 'success');
        await refreshWallet();
      }
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Failed to cancel transfer.';
      showToast(msg, 'error');
      setActiveUndo((prev) => (prev ? { ...prev, isUndoing: false } : null));
    }
  };

  const handleResetForm = () => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    setActiveUndo(null);
    setReceiverEmail('');
    setInrAmount('500');
    setNote('');
    setError(null);
  };

  const handleCopyTransactionId = (txId: string) => {
    navigator.clipboard.writeText(txId);
    setCopiedId(true);
    showToast('Transaction ID copied', 'info');
    setTimeout(() => setCopiedId(false), 2000);
  };

  const demoContacts = [
    { email: 'alice@example.com', name: 'Alice' },
    { email: 'bob@example.com', name: 'Bob' },
    { email: 'charlie@example.com', name: 'Charlie' },
  ].filter((c) => c.email.toLowerCase() !== user?.email.toLowerCase());

  return (
    <div className="max-w-xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* ========================================================================= */}
      {/* EXACT PAYPAL RECEIPT / UNDO CONFIRMATION SCREEN                           */}
      {/* ========================================================================= */}
      {activeUndo ? (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-8 sm:p-10 space-y-7 animate-in fade-in">
          {/* Top Status Icon & Header (PayPal receipt style) */}
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center">
              {activeUndo.status === 'PENDING_UNDO' && (
                <div className="w-16 h-16 rounded-full bg-[#D6E6FE] text-[#003087] flex items-center justify-center shadow-inner">
                  <Clock className="w-8 h-8 animate-pulse" />
                </div>
              )}
              {activeUndo.status === 'SETTLING' && (
                <div className="w-16 h-16 rounded-full bg-blue-50 text-[#0047BA] flex items-center justify-center">
                  <RefreshCw className="w-8 h-8 animate-spin" />
                </div>
              )}
              {activeUndo.status === 'SETTLED' && (
                <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
              )}
              {activeUndo.status === 'CANCELLED' && (
                <div className="w-16 h-16 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center border border-gray-200">
                  <RotateCcw className="w-8 h-8" />
                </div>
              )}
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-black text-black tracking-tight">
                {activeUndo.status === 'PENDING_UNDO' &&
                  `You sent ${activeUndo.receipt.transaction.formattedAmount}`}
                {activeUndo.status === 'SETTLING' && 'Finalizing Settlement...'}
                {activeUndo.status === 'SETTLED' &&
                  `You sent ${activeUndo.receipt.transaction.formattedAmount}`}
                {activeUndo.status === 'CANCELLED' && 'Payment Cancelled'}
              </h2>
              <p className="text-sm text-gray-600">
                {activeUndo.status === 'PENDING_UNDO' &&
                  `Sending to ${activeUndo.receipt.transaction.receiverEmail || receiverEmail}`}
                {activeUndo.status === 'SETTLING' && 'Verifying multi-document ledger balance...'}
                {activeUndo.status === 'SETTLED' &&
                  `Sent to ${activeUndo.receipt.transaction.receiverEmail || receiverEmail}`}
                {activeUndo.status === 'CANCELLED' &&
                  `Funds refunded to your available balance`}
              </p>
            </div>
          </div>

          {/* 10-Second Undo Grace Box (Exact PayPal Blue / Slate Styling) */}
          {activeUndo.status === 'PENDING_UNDO' && (
            <div className="p-5 rounded-2xl bg-[#F0F5FF] border border-[#C5DAFE] space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-[#003087]">
                <span className="flex items-center space-x-1.5">
                  <Clock className="w-4 h-4 text-[#0047BA]" />
                  <span>Cancellation window active</span>
                </span>
                <span className="font-mono text-sm tabular-numbers">
                  {(activeUndo.remainingMs / 1000).toFixed(1)}s remaining
                </span>
              </div>

              {/* Progress bar in PayPal Blue */}
              <div className="w-full bg-blue-100/80 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-[#0047BA] h-2 rounded-full transition-all duration-100 ease-linear"
                  style={{ width: `${activeUndo.progress}%` }}
                />
              </div>

              <p className="text-[11px] text-gray-600 leading-relaxed">
                Made a mistake? You have 10 seconds to recall this payment before it settles into the recipient's wallet.
              </p>

              {/* Undo Pill Button (PayPal sleek high-contrast button) */}
              <button
                onClick={handleUndoTransfer}
                disabled={activeUndo.isUndoing}
                className="w-full py-3 px-4 rounded-full bg-white hover:bg-rose-50 border-2 border-rose-600 text-rose-700 font-bold text-xs transition-colors flex items-center justify-center space-x-2 shadow-xs disabled:opacity-50"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${activeUndo.isUndoing ? 'animate-spin' : ''}`} />
                <span>{activeUndo.isUndoing ? 'Cancelling payment...' : 'Undo Payment Now'}</span>
              </button>
            </div>
          )}

          {/* Clean Receipt Breakdown Table */}
          <div className="divide-y divide-gray-100 text-xs">
            <div className="py-2.5 flex justify-between">
              <span className="text-gray-500">Recipient</span>
              <span className="font-bold text-gray-900">
                {activeUndo.receipt.transaction.receiverEmail || receiverEmail}
              </span>
            </div>

            <div className="py-2.5 flex justify-between">
              <span className="text-gray-500">Amount Sent</span>
              <span className="font-bold text-black text-sm tabular-numbers">
                {activeUndo.receipt.transaction.formattedAmount}
              </span>
            </div>

            <div className="py-2.5 flex justify-between">
              <span className="text-gray-500">Funding Source</span>
              <span className="font-semibold text-gray-900">PayFlow Digital Balance</span>
            </div>

            <div className="py-2.5 flex justify-between">
              <span className="text-gray-500">Transaction Fee</span>
              <span className="font-bold text-emerald-600">₹0.00 (Free)</span>
            </div>

            <div className="py-2.5 flex items-center justify-between">
              <span className="text-gray-500">Transaction ID</span>
              <div className="flex items-center space-x-1.5 font-mono text-gray-900">
                <span>{activeUndo.receipt.transaction.id}</span>
                <button
                  onClick={() => handleCopyTransactionId(activeUndo.receipt.transaction.id)}
                  className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-black transition-colors"
                  title="Copy ID"
                >
                  {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="py-2.5 flex justify-between">
              <span className="text-gray-500">Status</span>
              <span
                className={`font-bold ${
                  activeUndo.status === 'SETTLED'
                    ? 'text-emerald-600'
                    : activeUndo.status === 'CANCELLED'
                    ? 'text-gray-600'
                    : 'text-[#0047BA]'
                }`}
              >
                {activeUndo.status === 'SETTLED'
                  ? 'Completed'
                  : activeUndo.status === 'PENDING_UNDO'
                  ? 'Pending (10s Undo Window)'
                  : activeUndo.status}
              </span>
            </div>
          </div>

          {/* Action Buttons (PayPal style) */}
          <div className="space-y-3 pt-2">
            {(activeUndo.status === 'SETTLED' || activeUndo.status === 'CANCELLED') && (
              <button
                onClick={handleResetForm}
                className="w-full py-3.5 px-6 rounded-full bg-black hover:bg-neutral-800 text-white font-bold text-sm transition-all flex items-center justify-center space-x-2 shadow-sm"
              >
                <span>Send More Money</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={() => navigate('/transactions')}
              className="w-full py-3 px-6 rounded-full border border-gray-300 hover:bg-gray-50 text-xs font-bold text-gray-800 transition-colors"
            >
              Go to Activity
            </button>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* SEND & REQUEST FORM                                                       */
        /* ========================================================================= */
        <div className="space-y-6">
          {/* Top Switcher (Send | Request) */}
          <div className="flex items-center space-x-2 bg-gray-100 p-1 rounded-full w-fit mx-auto">
            <button
              onClick={() => {
                setSearchParams({ mode: 'send' });
                setRequestCreated(false);
              }}
              className={`px-6 py-2 rounded-full text-xs font-bold transition-all ${
                activeTab === 'send'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-gray-600 hover:text-black'
              }`}
            >
              Send
            </button>
            <button
              onClick={() => {
                setSearchParams({ mode: 'request' });
                setActiveUndo(null);
              }}
              className={`px-6 py-2 rounded-full text-xs font-bold transition-all ${
                activeTab === 'request'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-gray-600 hover:text-black'
              }`}
            >
              Request
            </button>
          </div>

          {activeTab === 'send' ? (
            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 sm:p-8 space-y-6">
              <div>
                <h1 className="text-2xl font-extrabold text-black tracking-tight">Send payments</h1>
                <p className="text-xs text-gray-500 mt-1">
                  Transfer instantly with 10-second PayFlow Undo protection
                </p>
              </div>

              {/* Available balance banner */}
              <div className="p-3.5 rounded-2xl bg-[#D6E6FE]/50 border border-blue-200/60 flex items-center justify-between text-xs">
                <span className="text-gray-600 font-medium">Available Balance:</span>
                <span className="font-extrabold text-black tabular-numbers text-sm">
                  {formatPaise(availablePaise)}
                </span>
              </div>

              {error && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleOpenReview} className="space-y-5">
                {/* Recipient email */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                      Recipient Email
                    </label>
                    {demoContacts.length > 0 && (
                      <div className="text-[11px] text-gray-500 flex items-center space-x-1.5">
                        <span>Quick:</span>
                        {demoContacts.map((c) => (
                          <button
                            key={c.email}
                            type="button"
                            onClick={() => setReceiverEmail(c.email)}
                            className="text-[#0047BA] font-bold hover:underline"
                          >
                            {c.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <input
                    type="email"
                    value={receiverEmail}
                    onChange={(e) => setReceiverEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:border-black focus:ring-1 focus:ring-black outline-none text-sm transition-all"
                  />
                </div>

                {/* Amount */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Amount (INR)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-gray-400">
                      ₹
                    </span>
                    <input
                      type="number"
                      min="1"
                      step="any"
                      value={inrAmount}
                      onChange={(e) => setInrAmount(e.target.value)}
                      placeholder="0.00"
                      required
                      className="w-full pl-9 pr-4 py-3 rounded-2xl border border-gray-300 focus:border-black focus:ring-1 focus:ring-black outline-none text-lg font-bold tabular-numbers transition-all"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-gray-400">
                    <span>Paise: {calculatedPaise.toLocaleString()}</span>
                    {calculatedPaise > availablePaise && (
                      <span className="text-rose-600 font-bold">Exceeds available balance</span>
                    )}
                  </div>
                </div>

                {/* Note */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    What's this payment for? (Optional)
                  </label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Dinner split, invoice, reimbursement..."
                    className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:border-black focus:ring-1 focus:ring-black outline-none text-sm transition-all"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || calculatedPaise > availablePaise || parsedInr <= 0}
                  className="w-full py-3.5 px-6 rounded-full bg-black hover:bg-neutral-800 text-white font-bold text-sm transition-all shadow-sm disabled:opacity-40 flex items-center justify-center space-x-2"
                >
                  <span>Review Transfer</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 sm:p-8 space-y-6">
              <div>
                <h1 className="text-2xl font-extrabold text-black tracking-tight">Request payments</h1>
                <p className="text-xs text-gray-500 mt-1">
                  Request payment from another PayFlow user
                </p>
              </div>

              {requestCreated ? (
                <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-emerald-950">
                    Request Sent to {requestPayerEmail}
                  </h3>
                  <p className="text-xs text-emerald-800">
                    Amount requested: ₹{parseFloat(requestAmount).toFixed(2)}
                  </p>
                  <button
                    onClick={() => setRequestCreated(false)}
                    className="px-6 py-2.5 rounded-full bg-black text-white text-xs font-bold"
                  >
                    Create Another Request
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setRequestCreated(true);
                    showToast(`Payment request for ₹${requestAmount} created`, 'success');
                  }}
                  className="space-y-5"
                >
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                      Request from (Email)
                    </label>
                    <input
                      type="email"
                      value={requestPayerEmail}
                      onChange={(e) => setRequestPayerEmail(e.target.value)}
                      placeholder="payer@example.com"
                      required
                      className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:border-black outline-none text-sm transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                      Amount (INR)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={requestAmount}
                      onChange={(e) => setRequestAmount(e.target.value)}
                      placeholder="0.00"
                      required
                      className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:border-black outline-none text-base font-bold tabular-numbers transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                      Note
                    </label>
                    <input
                      type="text"
                      value={requestNote}
                      onChange={(e) => setRequestNote(e.target.value)}
                      placeholder="Share for lunch..."
                      className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:border-black outline-none text-sm transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 px-6 rounded-full bg-black hover:bg-neutral-800 text-white font-bold text-sm transition-all shadow-sm"
                  >
                    Send Request
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      )}

      {/* Review Modal */}
      {isReviewOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-5 animate-in fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="font-extrabold text-base text-gray-900">Review and Send</h3>
              <button
                onClick={() => setIsReviewOpen(false)}
                className="p-1 rounded-full text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Recipient:</span>
                <span className="font-bold text-gray-900">{receiverEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Amount:</span>
                <span className="font-bold text-black text-sm">{formatINR(parsedInr)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Funding Source:</span>
                <span className="font-medium text-gray-900">PayFlow Wallet</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Fee:</span>
                <span className="font-bold text-emerald-600">₹0.00 Free</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#D6E6FE]/60 border border-blue-200 text-xs text-[#003087] flex items-start space-x-2">
              <Clock className="w-4 h-4 text-[#0047BA] mt-0.5 flex-shrink-0" />
              <span>
                Protected by <span className="font-bold">10-second PayFlow Undo</span>. You can cancel after sending.
              </span>
            </div>

            <div className="space-y-2 pt-1">
              <button
                onClick={handleExecuteTransfer}
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-full bg-black hover:bg-neutral-800 text-white font-bold text-sm transition-colors flex items-center justify-center space-x-2 shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>Send Payment Now</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
              <button
                onClick={() => setIsReviewOpen(false)}
                className="w-full py-2.5 px-4 rounded-full border border-gray-300 hover:bg-gray-50 text-xs font-semibold text-gray-600"
              >
                Edit Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
