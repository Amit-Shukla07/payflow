import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  CheckCircle2,
  AlertCircle,
  Building,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { walletApi } from '../services/api.js';
import { formatPaise, inrToPaise, formatINR } from '../utils/currency.js';
import { useToast } from '../context/ToastContext.js';

export const TopupPage: React.FC = () => {
  const { wallet, refreshWallet } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [inrAmount, setInrAmount] = useState<string>('1000');
  const [note, setNote] = useState<string>('Bank Deposit');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successReceipt, setSuccessReceipt] = useState<any | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => crypto.randomUUID());

  const presetAmounts = [500, 1000, 2500, 5000, 10000];
  const parsedInr = parseFloat(inrAmount) || 0;
  const calculatedPaise = inrToPaise(parsedInr);
  const availablePaise = wallet?.availableBalance ?? wallet?.balance ?? 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (parsedInr <= 0 || isNaN(parsedInr)) {
      return setError('Please enter a valid deposit amount greater than ₹0');
    }
    if (parsedInr > 100000) {
      return setError('Maximum simulated deposit per transaction is ₹1,00,000');
    }

    try {
      setIsSubmitting(true);
      const res = await walletApi.topup(
        { amount: calculatedPaise, note: note.trim() || 'Bank Deposit' },
        idempotencyKey
      );

      if (res.success) {
        setSuccessReceipt(res.data);
        showToast(`Successfully added ${formatINR(parsedInr)}`, 'success');
        await refreshWallet();
        setIdempotencyKey(crypto.randomUUID());
      }
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Failed to add funds. Please retry.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 animate-in fade-in duration-150">
      <div>
        <Link
          to="/wallet"
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-gray-500 hover:text-black transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Wallet</span>
        </Link>
      </div>

      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 sm:p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-black tracking-tight">Add Money</h1>
          <p className="text-xs text-gray-500 mt-1">
            Direct deposit from your linked bank to your PayFlow balance
          </p>
        </div>

        {/* Current Available Balance */}
        <div className="p-3.5 rounded-2xl bg-[#D6E6FE]/50 border border-blue-200/60 flex items-center justify-between text-xs">
          <span className="text-gray-600 font-medium">Current Available Balance:</span>
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

        {successReceipt ? (
          <div className="space-y-6 text-center animate-in fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center border-2 border-emerald-200">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-xl font-extrabold text-black">Deposit Successful!</h2>
              <p className="text-xs text-gray-500 mt-1">
                {formatINR(parsedInr)} has been credited to your available balance
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSuccessReceipt(null);
                  setInrAmount('1000');
                }}
                className="w-full py-3.5 px-6 rounded-full bg-black hover:bg-neutral-800 text-white font-bold text-sm shadow-sm transition-colors"
              >
                Add More Funds
              </button>
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="w-full py-2.5 px-4 rounded-full border border-gray-300 hover:bg-gray-50 text-xs font-semibold text-gray-700"
              >
                Go to Home
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Bank source */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Deposit From
              </label>
              <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50 flex items-center space-x-3.5">
                <div className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-700">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900">State Bank of India</div>
                  <div className="text-xs text-gray-500">Checking •••• 4291 · Fee: ₹0.00</div>
                </div>
              </div>
            </div>

            {/* Amount */}
            <div className="space-y-2">
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
                  max="100000"
                  step="any"
                  value={inrAmount}
                  onChange={(e) => setInrAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  className="w-full pl-9 pr-4 py-3 rounded-2xl border border-gray-300 focus:border-black outline-none text-lg font-bold tabular-numbers transition-all"
                />
              </div>

              {/* Presets */}
              <div className="flex flex-wrap gap-2 pt-1">
                {presetAmounts.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setInrAmount(amt.toString())}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                      parsedInr === amt
                        ? 'bg-black text-white shadow-sm'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    + ₹{amt.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting || parsedInr <= 0}
              className="w-full py-3.5 px-6 rounded-full bg-black hover:bg-neutral-800 text-white font-bold text-sm transition-all shadow-sm flex items-center justify-center space-x-2 disabled:opacity-40"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>Deposit {formatINR(parsedInr)}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
