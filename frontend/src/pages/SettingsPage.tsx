import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  Lock,
  Activity,
  Clock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { healthApi } from '../services/api.js';

export const SettingsPage: React.FC = () => {
  const { user, wallet } = useAuth();
  const [healthStatus, setHealthStatus] = useState<any>(null);

  useEffect(() => {
    healthApi
      .check()
      .then((res) => setHealthStatus(res))
      .catch((err) => setHealthStatus({ status: 'DEGRADED', error: err.message }));
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-150">
      <div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-black tracking-tight font-sans">
          Account Settings
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Profile information, security rules, and ledger health parameters
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left: Profile & Security (8 cols) */}
        <div className="md:col-span-8 space-y-6">
          {/* User Profile Card */}
          <div className="bg-white rounded-3xl border border-gray-200 p-7 shadow-sm space-y-6">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 rounded-full bg-[#001C60] text-white flex items-center justify-center font-bold text-lg shadow-sm">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">{user?.name}</h2>
                <p className="text-xs text-gray-500">{user?.email}</p>
                <div className="mt-1 flex items-center space-x-1.5 text-xs text-emerald-600 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Verified PayFlow Account</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200">
                <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px] block">
                  Full Name
                </span>
                <div className="font-bold text-gray-900 mt-1 text-sm">{user?.name}</div>
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200">
                <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px] block">
                  Email Address
                </span>
                <div className="font-bold text-gray-900 mt-1 font-mono text-sm truncate">
                  {user?.email}
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200">
                <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px] block">
                  User ID
                </span>
                <div className="font-mono text-gray-600 mt-1 text-xs truncate">
                  {user?.id}
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200">
                <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px] block">
                  Wallet ID
                </span>
                <div className="font-mono text-gray-600 mt-1 text-xs truncate">
                  {wallet?.id}
                </div>
              </div>
            </div>
          </div>

          {/* Security & Financial Guarantees */}
          <div className="bg-white rounded-3xl border border-gray-200 p-7 shadow-sm space-y-4">
            <h2 className="font-bold text-base text-gray-900 flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-[#0047BA]" />
              <span>Financial Security Guarantee</span>
            </h2>

            <div className="space-y-3 text-xs text-gray-600">
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1">
                <span className="font-bold text-amber-900 block text-xs flex items-center space-x-1.5">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>10-Second PayFlow Undo Protection</span>
                </span>
                <p className="text-amber-800 text-[11px] leading-relaxed">
                  Every outgoing peer transfer enters <span className="font-mono font-semibold">PENDING_UNDO</span>. During this 10-second window, the user can cancel the transfer with an atomic refund. If not cancelled, the background worker automatically settles it.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-1">
                <span className="font-bold text-gray-900 block text-xs flex items-center space-x-1.5">
                  <Lock className="w-4 h-4 text-gray-500" />
                  <span>Cryptographic Password Hashing</span>
                </span>
                <p className="text-gray-600 text-[11px] leading-relaxed">
                  Passwords are salted and hashed using bcrypt with cost factor 10.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Engine Health (4 cols) */}
        <div className="md:col-span-4 space-y-6">
          <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 text-gray-900 font-bold text-sm">
              <Activity className="w-4 h-4 text-[#0047BA]" />
              <span>Engine Status</span>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2.5 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Database:</span>
                <span className="font-bold text-emerald-600">
                  {healthStatus?.services?.database || 'CONNECTED'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Transactions:</span>
                <span className="font-bold">Multi-Doc ACID</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Precision:</span>
                <span className="font-bold">Integer Paise</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Replica Set:</span>
                <span className="font-bold">rs0 (Local)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
