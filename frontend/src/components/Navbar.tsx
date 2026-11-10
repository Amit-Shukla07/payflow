import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  CreditCard,
  Send,
  ArrowDownLeft,
  ShieldCheck,
  CheckCircle2,
  Clock,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { formatPaise } from '../utils/currency.js';
import { healthApi } from '../services/api.js';
import { useToast } from '../context/ToastContext.js';

export const Navbar: React.FC = () => {
  const { user, wallet, logout } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);

  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    healthApi
      .check()
      .then((res) => setIsHealthy(res.success))
      .catch(() => setIsHealthy(false));
  }, []);

  // Close notifications dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
    showToast('Signed out of PayFlow', 'info');
  };

  const navLinks = [
    { label: 'Home', path: '/dashboard' },
    { label: 'Send & Request', path: '/transfer' },
    { label: 'Wallet', path: '/wallet' },
    { label: 'Activity', path: '/transactions' },
  ];

  const isActive = (path: string) => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

  const availablePaise = wallet?.availableBalance ?? wallet?.balance ?? 0;
  const heldPaise = wallet?.heldBalance ?? 0;

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#001C60] text-white shadow-paypal select-none">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Left: Brand & Desktop Nav */}
            <div className="flex items-center space-x-8">
              {/* PayFlow Logo */}
              <Link to="/dashboard" className="flex items-center space-x-2.5 group">
                <div className="w-8 h-8 rounded-lg bg-[#0070BA] flex items-center justify-center shadow-inner group-hover:bg-[#009CDE] transition-colors">
                  <span className="font-extrabold text-base tracking-tighter text-white italic">P</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-lg tracking-tight text-white leading-none">
                    Pay<span className="text-[#009CDE]">Flow</span>
                  </span>
                  <span className="text-[10px] text-blue-200 tracking-wider uppercase font-medium">
                    FINTECH
                  </span>
                </div>
              </Link>

              {/* Desktop Navigation Links (PayPal style) */}
              <nav className="hidden md:flex items-center space-x-1">
                {navLinks.map((link) => {
                  const active = isActive(link.path);
                  return (
                    <Link
                      key={link.path}
                      to={link.path}
                      className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-150 ${
                        active
                          ? 'bg-[#002C8A] text-white shadow-sm font-semibold'
                          : 'text-blue-100 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Right: Quick Balance, Status, Notifications, Settings, Logout */}
            <div className="flex items-center space-x-3">
              {/* Available Balance Pill (Desktop) */}
              {wallet && (
                <Link
                  to="/wallet"
                  className="hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-[#002C8A]/70 border border-blue-400/20 hover:bg-[#002C8A] transition-colors text-xs"
                >
                  <span className="text-blue-200">Balance:</span>
                  <span className="font-bold text-white tracking-tight">
                    {formatPaise(availablePaise)}
                  </span>
                  {heldPaise > 0 && (
                    <span
                      title="Funds held in 10-second Undo window"
                      className="px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-semibold flex items-center space-x-1"
                    >
                      <Clock className="w-2.5 h-2.5" />
                      <span>{formatPaise(heldPaise)}</span>
                    </span>
                  )}
                </Link>
              )}

              {/* Health Indicator (subtle) */}
              <div
                title={isHealthy ? 'Ledger Engine: Online & Connected' : 'Connecting to Ledger...'}
                className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-blue-200 font-mono"
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isHealthy === true
                      ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                      : 'bg-amber-400'
                  }`}
                />
                <span>{isHealthy ? 'Online' : 'Syncing'}</span>
              </div>

              {/* Help Button */}
              <button
                onClick={() => setIsHelpOpen(true)}
                className="p-2 rounded-full text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
                title="Help & Protection"
                aria-label="Help"
              >
                <HelpCircle className="w-5 h-5" />
              </button>

              {/* Notifications Dropdown */}
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                  className="relative p-2 rounded-full text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400 border border-[#001C60]" />
                </button>

                {isNotificationsOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-paypal-dropdown border border-paypal-border py-2 text-paypal-text z-50 animate-in fade-in duration-150">
                    <div className="px-4 py-2.5 border-b border-paypal-borderLight flex items-center justify-between">
                      <span className="font-semibold text-sm text-paypal-text">Notifications</span>
                      <span className="text-[11px] bg-blue-50 text-paypal-blue font-semibold px-2 py-0.5 rounded-full">
                        Live Ledger
                      </span>
                    </div>

                    <div className="max-h-64 overflow-y-auto divide-y divide-paypal-borderLight">
                      <div className="p-3 hover:bg-slate-50 transition-colors text-left flex items-start space-x-3">
                        <div className="p-1.5 rounded-full bg-blue-50 text-paypal-blue mt-0.5">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-paypal-text">
                            PayFlow Undo Protection Active
                          </p>
                          <p className="text-[11px] text-paypal-textMuted mt-0.5">
                            Transfers provide an atomic 10-second grace window before final settlement.
                          </p>
                          <span className="text-[10px] text-paypal-textSubtle mt-1 block">
                            System Policy
                          </span>
                        </div>
                      </div>

                      {heldPaise > 0 && (
                        <div className="p-3 hover:bg-slate-50 transition-colors text-left flex items-start space-x-3 bg-amber-50/50">
                          <div className="p-1.5 rounded-full bg-amber-100 text-amber-700 mt-0.5">
                            <Clock className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-amber-900">
                              Active Hold: {formatPaise(heldPaise)}
                            </p>
                            <p className="text-[11px] text-amber-800 mt-0.5">
                              An outgoing transfer is within its 10-second cancellation window.
                            </p>
                            <Link
                              to="/transfer"
                              onClick={() => setIsNotificationsOpen(false)}
                              className="text-[11px] font-semibold text-paypal-blue hover:underline mt-1 block"
                            >
                              View Transfer Status →
                            </Link>
                          </div>
                        </div>
                      )}

                      <div className="p-3 hover:bg-slate-50 transition-colors text-left flex items-start space-x-3">
                        <div className="p-1.5 rounded-full bg-emerald-50 text-paypal-success mt-0.5">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-paypal-text">
                            Wallet Verified: {user?.email}
                          </p>
                          <p className="text-[11px] text-paypal-textMuted mt-0.5">
                            Zero-drift ledger balance with atomic concurrency guarantee.
                          </p>
                          <span className="text-[10px] text-paypal-textSubtle mt-1 block">
                            Just now
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="px-4 py-2 border-t border-paypal-borderLight text-center">
                      <Link
                        to="/transactions"
                        onClick={() => setIsNotificationsOpen(false)}
                        className="text-xs font-semibold text-paypal-blue hover:underline"
                      >
                        View all activity
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Settings Gear */}
              <Link
                to="/settings"
                className="p-2 rounded-full text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
                title="Account Settings"
                aria-label="Settings"
              >
                <Settings className="w-5 h-5" />
              </Link>

              {/* PayPal-style LOG OUT button */}
              <button
                onClick={handleLogout}
                className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold text-blue-100 hover:text-white hover:bg-white/10 border border-white/20 transition-all uppercase tracking-wider"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>

              {/* Mobile menu hamburger */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 rounded-full text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Toggle mobile menu"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-[#001445] border-t border-blue-900/60 px-4 pt-2 pb-5 space-y-2 animate-in slide-in-from-top-2">
            <div className="py-2 border-b border-blue-900/40 mb-2">
              <div className="text-xs text-blue-300">Signed in as</div>
              <div className="text-sm font-semibold text-white">{user?.name}</div>
              <div className="text-xs text-blue-200">{user?.email}</div>
              {wallet && (
                <div className="mt-2 p-2 rounded-lg bg-blue-900/40 text-xs flex justify-between items-center">
                  <span className="text-blue-300">Available:</span>
                  <span className="font-bold text-white">{formatPaise(availablePaise)}</span>
                </div>
              )}
            </div>

            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(link.path)
                    ? 'bg-[#0070BA] text-white font-semibold'
                    : 'text-blue-200 hover:text-white hover:bg-white/5'
                }`}
              >
                {link.label}
              </Link>
            ))}

            <Link
              to="/settings"
              className="block px-3 py-2 rounded-lg text-sm font-medium text-blue-200 hover:text-white hover:bg-white/5 transition-colors"
            >
              Account Settings
            </Link>

            <button
              onClick={handleLogout}
              className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-rose-300 hover:bg-rose-900/20 transition-colors flex items-center space-x-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </div>
        )}
      </header>

      {/* Help Modal */}
      {isHelpOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-paypal-dropdown border border-paypal-border space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-paypal-borderLight">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-blue-50 text-paypal-blue flex items-center justify-center">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-paypal-text">PayFlow Help & Protection</h3>
                  <p className="text-xs text-paypal-textMuted">Enterprise-grade digital wallet architecture</p>
                </div>
              </div>
              <button
                onClick={() => setIsHelpOpen(false)}
                className="p-1 rounded-full text-paypal-textSubtle hover:text-paypal-text hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-paypal-textMuted leading-relaxed">
              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 space-y-1">
                <span className="font-bold text-paypal-blue block text-xs">
                  🛡️ 10-Second PayFlow Undo
                </span>
                <p>
                  Every outgoing transfer is temporarily placed in <span className="font-mono font-semibold">PENDING_UNDO</span> status.
                  Funds are held from your available balance. You have 10 seconds to cancel before automated settlement.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-100 space-y-1">
                <span className="font-bold text-emerald-800 block text-xs">
                  ⚡ ACID Transaction Ledger
                </span>
                <p>
                  Balances are recorded in integer paise to eliminate floating-point precision loss. Multi-document MongoDB transactions ensure either both sender and receiver update, or neither does.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="font-bold text-paypal-text block text-xs">
                  🔒 Concurrency & Idempotency
                </span>
                <p>
                  Each transfer carries a unique idempotency key to prevent accidental double-submits or race conditions on flaky network connections.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setIsHelpOpen(false)}
                className="px-5 py-2 rounded-full bg-[#0070BA] hover:bg-[#003087] text-white text-xs font-semibold transition-colors shadow-sm"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
