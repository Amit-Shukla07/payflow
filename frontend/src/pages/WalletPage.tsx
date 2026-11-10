import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Send,
  Building,
  CreditCard,
  Clock,
  Cpu,
  Copy,
  Check,
  CheckCircle2,
  MoreVertical,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { formatPaise } from '../utils/currency.js';
import { useToast } from '../context/ToastContext.js';

export const WalletPage: React.FC = () => {
  const { user, wallet } = useAuth();
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopyWalletId = () => {
    if (wallet?.id) {
      navigator.clipboard.writeText(wallet.id);
      setCopied(true);
      showToast('Wallet ID copied to clipboard', 'info');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const availablePaise = wallet?.availableBalance ?? wallet?.balance ?? 0;
  const heldPaise = wallet?.heldBalance ?? 0;
  const totalPaise = availablePaise + heldPaise;

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-in fade-in duration-150">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-black tracking-tight font-sans">
            Wallet
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Manage your digital balances, linked banks, and ledger identification
          </p>
        </div>

        <Link
          to="/wallet/topup"
          className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-full bg-black hover:bg-neutral-800 text-white text-xs font-bold transition-all shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Money</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Balances & Payment Methods (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Balance Breakdown Card */}
          <div className="bg-white rounded-3xl border border-gray-200 p-7 shadow-sm space-y-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                PayFlow Balance Breakdown
              </span>
              <div className="mt-2 text-4xl font-extrabold text-black tabular-numbers">
                {formatPaise(availablePaise)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Available to transfer immediately with zero loss
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-[#D6E6FE]/60 border border-blue-200/80">
                <span className="text-xs font-bold text-[#003087]">Available</span>
                <div className="text-lg font-bold text-black tabular-numbers mt-1">
                  {formatPaise(availablePaise)}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
                <span className="text-xs font-bold text-amber-900 flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Held in Undo</span>
                </span>
                <div className="text-lg font-bold text-amber-900 tabular-numbers mt-1">
                  {formatPaise(heldPaise)}
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200 text-xs flex items-center justify-between">
              <span className="text-gray-600">Total Account Funds (Available + Held):</span>
              <span className="font-extrabold text-black tabular-numbers">
                {formatPaise(totalPaise)}
              </span>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <Link
                to="/wallet/topup"
                className="flex-1 py-3 rounded-full bg-black hover:bg-neutral-800 text-white text-xs font-bold text-center transition-colors shadow-sm"
              >
                Add Money
              </Link>
              <Link
                to="/transfer"
                className="flex-1 py-3 rounded-full border border-gray-300 hover:bg-gray-50 text-black text-xs font-bold text-center transition-colors"
              >
                Send Money
              </Link>
            </div>
          </div>

          {/* Banks & Cards */}
          <div className="bg-white rounded-3xl border border-gray-200 p-7 shadow-sm space-y-4">
            <h2 className="font-bold text-base text-gray-900">Payment methods</h2>

            <div className="space-y-3">
              {/* PayFlow Balance */}
              <div className="p-4 rounded-2xl border border-blue-200 bg-[#D6E6FE]/30 flex items-center justify-between">
                <div className="flex items-center space-x-3.5">
                  <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center font-bold text-sm">
                    PF
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900 flex items-center space-x-2">
                      <span>PayFlow Balance</span>
                      <span className="text-[10px] bg-blue-100 text-[#0047BA] font-bold px-2 py-0.5 rounded-full">
                        Preferred
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      Digital Cash · {formatPaise(availablePaise)}
                    </div>
                  </div>
                </div>
                <CheckCircle2 className="w-5 h-5 text-[#0047BA]" />
              </div>

              {/* State Bank of India */}
              <div className="p-4 rounded-2xl border border-gray-200 hover:border-gray-300 transition-colors flex items-center justify-between">
                <div className="flex items-center space-x-3.5">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center">
                    <Building className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900">State Bank of India</div>
                    <div className="text-xs text-gray-500 mt-0.5">Checking •••• 4291 · Linked</div>
                  </div>
                </div>
                <span className="text-xs text-gray-400 font-medium">Bank</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Digital Card Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card Graphic */}
          <div className="w-full aspect-[1.586/1] rounded-3xl bg-black text-white p-7 shadow-xl flex flex-col justify-between relative overflow-hidden border border-neutral-800">
            <div className="flex items-center justify-between z-10 text-xs">
              <span className="font-black tracking-tight text-white text-base italic">
                Pay<span className="text-blue-400">Flow</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-[10px] font-mono tracking-wider">
                INR DIGITAL
              </span>
            </div>

            {/* Chip */}
            <div className="flex items-center space-x-3 my-1 z-10">
              <div className="w-10 h-7 rounded bg-amber-200 border border-amber-300 flex items-center justify-center shadow-inner">
                <div className="w-7 h-5 border border-amber-400 rounded-sm" />
              </div>
              <Cpu className="w-4 h-4 text-gray-400" />
            </div>

            {/* Number */}
            <div className="z-10">
              <div className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
                Wallet Identifier
              </div>
              <div className="font-mono text-base tracking-widest text-white font-bold mt-0.5">
                {wallet?.id ? `${wallet.id.slice(0, 4)} •••• •••• ${wallet.id.slice(-4)}` : '•••• •••• •••• ••••'}
              </div>
            </div>

            {/* Bottom Row */}
            <div className="flex items-end justify-between pt-2 border-t border-white/10 z-10 text-xs">
              <div>
                <div className="text-[9px] uppercase tracking-wider text-gray-400">Account Holder</div>
                <div className="font-bold text-white truncate max-w-[140px]">
                  {user?.name || 'Member'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[9px] uppercase tracking-wider text-gray-400">Balance</div>
                <div className="font-extrabold text-white tabular-numbers">
                  {formatPaise(availablePaise)}
                </div>
              </div>
            </div>
          </div>

          {/* Copy Identifier */}
          <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block">
              Ledger Identifier
            </span>
            <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-between">
              <span className="font-mono text-xs text-gray-900 truncate mr-2">
                {wallet?.id}
              </span>
              <button
                onClick={handleCopyWalletId}
                className="p-1 hover:bg-gray-200 rounded text-gray-500 hover:text-black transition-colors"
                title="Copy Wallet ID"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Mapped to your atomic ledger document in MongoDB replica set.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
