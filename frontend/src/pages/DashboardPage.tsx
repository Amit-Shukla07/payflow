import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  Building,
  CreditCard,
  Send,
  ArrowDownLeft,
  ArrowUpRight,
  MoreVertical,
  Pencil,
  Plus,
  RefreshCw,
  Clock,
  Layers,
  Code,
  FileText,
  Link as LinkIcon,
  ShoppingCart,
  ChevronRight,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { transactionApi } from '../services/api.js';
import { Transaction } from '../types/index.js';
import { formatPaise, formatDate } from '../utils/currency.js';
import { useToast } from '../context/ToastContext.js';

export const DashboardPage: React.FC = () => {
  const { user, wallet, refreshWallet } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState({
    totalSent: 0,
    totalReceived: 0,
    formattedTotalSent: '₹0.00',
    formattedTotalReceived: '₹0.00',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const res = await transactionApi.getTransactions({ limit: 5 });
      if (res.success && res.data) {
        setTransactions(res.data.items);
        setSummary(res.data.summary);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSync = async () => {
    setIsRefreshing(true);
    await Promise.all([refreshWallet(), loadData()]);
    setIsRefreshing(false);
    showToast('Ledger balance and activity synchronized', 'info');
  };

  const availablePaise = wallet?.availableBalance ?? wallet?.balance ?? 0;
  const heldPaise = wallet?.heldBalance ?? 0;

  return (
    <div className="space-y-10 animate-in fade-in duration-150">
      {/* ========================================================================= */}
      {/* 1. HUGE BALANCE + AVAILABLE BALANCE + ACTION BUTTON (Screenshot 1)        */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-baseline gap-2 sm:gap-3">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-black tracking-tight tabular-numbers font-sans break-words">
            {formatPaise(availablePaise).replace('₹', '₹ ')}
          </h1>
          <span className="text-lg sm:text-2xl font-bold text-gray-900 tracking-tight">
            INR
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600">
          <span>Available balance</span>
          {heldPaise > 0 && (
            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-semibold">
              <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
              <span>{formatPaise(heldPaise)} in 10s Undo hold</span>
            </span>
          )}
          <button
            onClick={handleSync}
            disabled={isRefreshing}
            className="text-gray-400 hover:text-black transition-colors"
            title="Sync Ledger"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>

        {/* Action Button: View Payment page / Send Money */}
        <div className="pt-2 flex flex-wrap items-center gap-2 sm:gap-3">
          <Link
            to="/transfer"
            className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-full border border-gray-300 bg-white hover:bg-gray-50 text-sm font-semibold text-gray-900 transition-colors shadow-sm"
          >
            <span>Send Money</span>
          </Link>
          <Link
            to="/transfer?mode=request"
            className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-full border border-gray-300 bg-white hover:bg-gray-50 text-sm font-semibold text-gray-900 transition-colors shadow-sm"
          >
            <span>Request Money</span>
          </Link>
          <Link
            to="/wallet/topup"
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-full border border-gray-300 bg-white hover:bg-gray-50 text-sm font-semibold text-gray-900 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4 text-gray-600" />
            <span>Add Money</span>
          </Link>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. THREE ACTION CARDS IN A ROW (Exact PayPal Screenshot 1)                */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Complete profile */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-full bg-blue-50 text-[#0047BA] flex items-center justify-center">
                <User className="w-5 h-5 stroke-[2]" />
              </div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded-md bg-amber-400 text-black text-[11px] font-bold">
                  Verified
                </span>
                <button className="text-gray-400 hover:text-gray-600">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>

            <h3 className="mt-4 font-bold text-sm text-gray-900">
              <Link to="/settings" className="hover:underline text-[#0047BA]">
                Account Profile
              </Link>
            </h3>
            <p className="text-xs text-gray-600 mt-1 leading-relaxed">
              Signed in as <span className="font-semibold text-gray-900">{user?.name}</span> ({user?.email}).
            </p>
          </div>
        </div>

        {/* Card 2: Link bank account */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-full bg-blue-50 text-[#0047BA] flex items-center justify-center">
                <Building className="w-5 h-5 stroke-[2]" />
              </div>
              <button className="text-gray-400 hover:text-gray-600">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>

            <h3 className="mt-4 font-bold text-sm text-gray-900">
              <Link to="/wallet" className="hover:underline text-[#0047BA]">
                Link a bank account
              </Link>
            </h3>
            <p className="text-xs text-gray-600 mt-1 leading-relaxed">
              State Bank of India (•••• 4291) linked for simulated deposits.
            </p>
          </div>
        </div>

        {/* Card 3: 10-Second Undo Protection */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-full bg-blue-50 text-[#0047BA] flex items-center justify-center">
                <Clock className="w-5 h-5 stroke-[2]" />
              </div>
              <button className="text-gray-400 hover:text-gray-600">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>

            <h3 className="mt-4 font-bold text-sm text-gray-900">
              <Link to="/transfer" className="hover:underline text-[#0047BA]">
                10-Second PayFlow Undo
              </Link>
            </h3>
            <p className="text-xs text-gray-600 mt-1 leading-relaxed">
              Every peer transfer gives you 10 seconds to cancel before final settlement.
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. QUICK ACCESS SECTION (Exact PayPal Screenshot 1)                       */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <h2 className="font-bold text-base text-gray-900">Quick access</h2>
          <Pencil className="w-3.5 h-3.5 text-gray-500 cursor-pointer hover:text-black" />
        </div>

        <div className="flex items-center space-x-6 sm:space-x-8 overflow-x-auto pb-2 select-none">
          {/* 1. Business Tools */}
          <Link
            to="/wallet"
            className="flex flex-col items-center space-y-2 group flex-shrink-0 text-center"
          >
            <div className="w-14 h-14 rounded-full bg-gray-100 group-hover:bg-gray-200 flex items-center justify-center text-gray-700 transition-colors">
              <Layers className="w-6 h-6 stroke-[1.8]" />
            </div>
            <span className="text-[11px] font-semibold text-gray-800 max-w-[70px] leading-tight">
              Business Tools
            </span>
          </Link>

          {/* 2. Payment Links & Buttons */}
          <Link
            to="/transfer?mode=request"
            className="flex flex-col items-center space-y-2 group flex-shrink-0 text-center"
          >
            <div className="w-14 h-14 rounded-full bg-gray-100 group-hover:bg-gray-200 flex items-center justify-center text-gray-700 transition-colors">
              <Code className="w-6 h-6 stroke-[1.8]" />
            </div>
            <span className="text-[11px] font-semibold text-gray-800 max-w-[80px] leading-tight">
              Payment Links & Buttons
            </span>
          </Link>

          {/* 3. Invoicing / Add Money */}
          <Link
            to="/wallet/topup"
            className="flex flex-col items-center space-y-2 group flex-shrink-0 text-center"
          >
            <div className="w-14 h-14 rounded-full bg-gray-100 group-hover:bg-gray-200 flex items-center justify-center text-gray-700 transition-colors">
              <FileText className="w-6 h-6 stroke-[1.8]" />
            </div>
            <span className="text-[11px] font-semibold text-gray-800 max-w-[70px] leading-tight">
              Invoicing
            </span>
          </Link>

          {/* 4. Request payments */}
          <Link
            to="/transfer?mode=request"
            className="flex flex-col items-center space-y-2 group flex-shrink-0 text-center"
          >
            <div className="w-14 h-14 rounded-full bg-gray-100 group-hover:bg-gray-200 flex items-center justify-center text-gray-700 transition-colors">
              <ArrowDownLeft className="w-6 h-6 stroke-[1.8]" />
            </div>
            <span className="text-[11px] font-semibold text-gray-800 max-w-[70px] leading-tight">
              Request payments
            </span>
          </Link>

          {/* 5. Send payments */}
          <Link
            to="/transfer"
            className="flex flex-col items-center space-y-2 group flex-shrink-0 text-center"
          >
            <div className="w-14 h-14 rounded-full bg-gray-100 group-hover:bg-gray-200 flex items-center justify-center text-gray-700 transition-colors">
              <Send className="w-6 h-6 stroke-[1.8]" />
            </div>
            <span className="text-[11px] font-semibold text-gray-800 max-w-[70px] leading-tight">
              Send payments
            </span>
          </Link>

          {/* 6. PayFlow.Me */}
          <Link
            to="/wallet"
            className="flex flex-col items-center space-y-2 group flex-shrink-0 text-center"
          >
            <div className="w-14 h-14 rounded-full bg-gray-100 group-hover:bg-gray-200 flex items-center justify-center text-gray-700 transition-colors">
              <LinkIcon className="w-6 h-6 stroke-[1.8]" />
            </div>
            <span className="text-[11px] font-semibold text-gray-800 max-w-[70px] leading-tight">
              PayFlow.Me
            </span>
          </Link>

          {/* 7. PayFlow Checkout */}
          <Link
            to="/transactions"
            className="flex flex-col items-center space-y-2 group flex-shrink-0 text-center"
          >
            <div className="w-14 h-14 rounded-full bg-gray-100 group-hover:bg-gray-200 flex items-center justify-center text-gray-700 transition-colors">
              <ShoppingCart className="w-6 h-6 stroke-[1.8]" />
            </div>
            <span className="text-[11px] font-semibold text-gray-800 max-w-[70px] leading-tight">
              PayFlow Checkout
            </span>
          </Link>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. BUSINESS PERFORMANCE SECTION (Exact PayPal Screenshot 1)               */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-base text-gray-900">Financial performance</h2>
            <p className="text-xs text-gray-500 mt-0.5">All comparisons to previous 30 days</p>
          </div>
          <Link
            to="/transactions"
            className="text-xs font-semibold text-[#0047BA] hover:underline"
          >
            View more
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Card 1 */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-2">
            <span className="text-xs font-bold text-gray-900 underline cursor-pointer">
              Total sent volume
            </span>
            <div className="text-2xl font-bold text-black tabular-numbers">
              {summary.formattedTotalSent || '₹0.00'}
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-2">
            <span className="text-xs font-bold text-gray-900 underline cursor-pointer">
              Total received volume
            </span>
            <div className="text-2xl font-bold text-black tabular-numbers">
              {summary.formattedTotalReceived || '₹0.00'}
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-2">
            <span className="text-xs font-bold text-gray-900 underline cursor-pointer">
              Verified counterparties
            </span>
            <div className="text-2xl font-bold text-black tabular-numbers">
              3
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-2">
            <span className="text-xs font-bold text-gray-900 underline cursor-pointer">
              Total transactions
            </span>
            <div className="text-2xl font-bold text-black tabular-numbers">
              {transactions.length}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. RECENT ACTIVITY LIST                                                   */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-base text-gray-900">Recent activity</h2>
          <Link to="/transactions" className="text-xs font-semibold text-[#0047BA] hover:underline">
            See all
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          {transactions.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-500">
              No recent transactions
            </div>
          ) : (
            <div className="divide-y divide-gray-100 text-xs">
              {transactions.slice(0, 4).map((tx) => {
                const isDebit = tx.sender?.id === user?.id && tx.type !== 'TOPUP';
                const counterparty = tx.type === 'TOPUP'
                  ? 'Bank Deposit'
                  : isDebit
                  ? tx.receiver?.name || tx.receiver?.email
                  : tx.sender?.name || tx.sender?.email;

                return (
                  <div
                    key={tx.id}
                    onClick={() => navigate(`/transactions/${tx.id}`)}
                    className="p-4 hover:bg-gray-50 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-700">
                        {isDebit ? <ArrowUpRight className="w-4 h-4 text-gray-700" /> : <ArrowDownLeft className="w-4 h-4 text-emerald-600" />}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 text-sm">{counterparty}</div>
                        <div className="text-gray-500 text-[11px]">{formatDate(tx.createdAt)}</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className={`font-bold text-sm tabular-numbers ${isDebit ? 'text-black' : 'text-emerald-600'}`}>
                        {isDebit ? `- ${tx.formattedAmount}` : `+ ${tx.formattedAmount}`}
                      </div>
                      <span className="text-[10px] uppercase font-semibold text-gray-400">
                        {tx.status === 'SETTLED' ? 'Completed' : tx.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
