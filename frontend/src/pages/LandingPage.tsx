import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ShieldCheck,
  Clock,
  RotateCcw,
  CheckCircle2,
  Lock,
  ArrowUpRight,
  ArrowDownLeft,
  Building,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-gray-900 flex flex-col font-sans select-none">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-1.5">
            <span className="text-2xl font-black tracking-tight text-black">
              Pay<span className="text-[#0047BA]">Flow</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center space-x-6 text-sm font-semibold text-gray-600">
            <a href="#features" className="hover:text-black transition-colors">
              Features
            </a>
            <a href="#undo" className="hover:text-black transition-colors">
              PayFlow Undo
            </a>
            <a href="#security" className="hover:text-black transition-colors">
              Security
            </a>
          </nav>

          <div className="flex items-center space-x-3">
            <Link
              to="/login"
              className="px-5 py-2 rounded-full border border-gray-300 hover:bg-gray-50 text-xs font-bold text-gray-900 transition-colors"
            >
              Log In
            </Link>
            <Link
              to="/register"
              className="px-5 py-2 rounded-full bg-black hover:bg-neutral-800 text-white text-xs font-bold transition-colors shadow-sm"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="py-16 sm:py-20 px-6 max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left */}
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#D6E6FE] text-[#003087] text-xs font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Simulated Financial Digital Wallet</span>
              </div>

              <h1 className="text-4xl sm:text-5xl font-black text-black tracking-tight leading-[1.12]">
                The simpler, safer way to pay and get paid.
              </h1>

              <p className="text-base text-gray-600 leading-relaxed max-w-lg">
                Transfer money instantly to anyone with an email address. Backed by our signature <span className="font-bold text-black">10-second PayFlow Undo</span> cancellation window and zero-drift ledger guarantee.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <Link
                  to="/register"
                  className="px-8 py-3.5 rounded-full bg-black hover:bg-neutral-800 text-white text-sm font-bold transition-all shadow-sm text-center flex items-center justify-center space-x-2"
                >
                  <span>Sign Up for Free</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  to="/login"
                  className="px-8 py-3.5 rounded-full bg-white border border-gray-300 hover:bg-gray-50 text-black text-sm font-bold transition-all text-center"
                >
                  Explore Demo Logins
                </Link>
              </div>

              <div className="pt-4 flex items-center space-x-6 text-xs text-gray-500 font-medium">
                <div className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Instant Account</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>₹10,000 Starter Balance</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Zero Fees</span>
                </div>
              </div>
            </div>

            {/* Right: Balance & Undo Preview matching screenshot */}
            <div className="lg:col-span-6">
              <div className="bg-white rounded-3xl border border-gray-200 shadow-xl p-8 space-y-6">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    PayFlow Balance
                  </span>
                  <div className="text-4xl sm:text-5xl font-black text-black mt-1 tabular-numbers">
                    ₹ 18,350.00 <span className="text-lg font-bold text-gray-500">INR</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Available balance</p>
                </div>

                {/* Undo Demo Pill */}
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                    <span className="flex items-center space-x-1.5">
                      <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
                      <span>Transfer to Bob: ₹1,000.00</span>
                    </span>
                    <span className="font-mono text-amber-800">8.4s to cancel</span>
                  </div>
                  <div className="w-full bg-amber-200/60 rounded-full h-2 overflow-hidden">
                    <div className="bg-amber-500 h-2 rounded-full w-4/5" />
                  </div>
                  <div className="flex justify-between items-center pt-1 text-[11px]">
                    <span className="text-amber-800">Funds held in escrow</span>
                    <span className="px-3 py-1 rounded-full bg-rose-600 text-white font-bold text-[10px]">
                      Undo Payment
                    </span>
                  </div>
                </div>

                {/* Quick preview rows */}
                <div className="space-y-3 pt-1">
                  <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                        <ArrowDownLeft className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">Alice Smith</div>
                        <div className="text-gray-500 text-[11px]">Payment received</div>
                      </div>
                    </div>
                    <span className="font-bold text-emerald-600 text-sm">+ ₹5,000.00</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3 Value Cards */}
        <section id="features" className="py-16 bg-white border-t border-gray-200">
          <div className="max-w-6xl mx-auto px-6 space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <h2 className="text-3xl font-extrabold text-black tracking-tight">
                Built for security, speed, and simplicity
              </h2>
              <p className="text-sm text-gray-500">
                Engineered with enterprise financial principles and an authentic interface.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-7 rounded-3xl border border-gray-200 bg-[#FAFAFA] space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-[#0047BA] flex items-center justify-center">
                  <RotateCcw className="w-6 h-6 stroke-[2]" />
                </div>
                <h3 className="font-bold text-base text-black">10-Second PayFlow Undo</h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Mistyped a recipient or entered the wrong amount? Cancel within 10 seconds to restore funds immediately.
                </p>
              </div>

              <div className="p-7 rounded-3xl border border-gray-200 bg-[#FAFAFA] space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6 stroke-[2]" />
                </div>
                <h3 className="font-bold text-base text-black">ACID Ledger Correctness</h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Every transaction executes within a MongoDB replica set transaction. Balances update atomically.
                </p>
              </div>

              <div className="p-7 rounded-3xl border border-gray-200 bg-[#FAFAFA] space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Lock className="w-6 h-6 stroke-[2]" />
                </div>
                <h3 className="font-bold text-base text-black">Zero Float Drift</h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Currency is handled in integer paise to eliminate floating-point rounding errors.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-6 px-8 text-xs text-gray-500">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <span className="font-bold text-black">PayFlow</span>
            <span>·</span>
            <span>Digital Wallet Simulation Platform</span>
          </div>
          <div className="flex items-center space-x-4 text-[11px]">
            <span>Help</span>
            <span>Contact</span>
            <span>Security</span>
            <span>Terms</span>
            <span>Privacy</span>
            <span>Copyright © 1999-2026 PayFlow. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
