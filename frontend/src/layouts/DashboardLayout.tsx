import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Clock,
  Send,
  ArrowDownLeft,
  ChevronDown,
  ChevronRight,
  Plus,
  Bell,
  Code,
  LogOut,
  Settings,
  HelpCircle,
  CreditCard,
  Building,
  ShieldCheck,
  CheckCircle2,
  X,
  FileText,
  Star,
  Layers,
  Search,
  Menu,
  User,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { formatPaise } from '../utils/currency.js';
import { healthApi } from '../services/api.js';
import { useToast } from '../context/ToastContext.js';

export const DashboardLayout: React.FC = () => {
  const { user, wallet, logout } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  // Mobile drawer state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Sidebar expanded sections
  const [isActivityOpen, setIsActivityOpen] = useState(
    location.pathname.startsWith('/transactions')
  );
  const [isPayOpen, setIsPayOpen] = useState(
    location.pathname.startsWith('/transfer') || location.pathname.startsWith('/wallet')
  );

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isDevModalOpen, setIsDevModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);

  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    healthApi
      .check()
      .then((res) => setIsHealthy(res.success))
      .catch(() => setIsHealthy(false));
  }, []);

  // Sync open state with location & close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    if (location.pathname.startsWith('/transactions')) {
      setIsActivityOpen(true);
    }
    if (location.pathname.startsWith('/transfer') || location.pathname.startsWith('/wallet')) {
      setIsPayOpen(true);
    }
  }, [location.pathname]);

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
    showToast('Logged out of PayFlow', 'info');
  };

  const getInitials = (name?: string) => {
    if (!name) return 'PF';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const availablePaise = wallet?.availableBalance ?? wallet?.balance ?? 0;
  const heldPaise = wallet?.heldBalance ?? 0;

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-gray-900 flex font-sans antialiased">
      {/* ========================================================================= */}
      {/* DESKTOP SIDEBAR (Visible on md: and up)                                   */}
      {/* ========================================================================= */}
      <aside className="hidden md:flex w-64 border-r border-gray-200 bg-white flex-col flex-shrink-0 min-h-screen select-none sticky top-0 h-screen overflow-y-auto">
        {/* Brand Logo */}
        <div className="p-6 pb-5">
          <Link to="/dashboard" className="flex items-center space-x-1.5 group">
            <span className="text-2xl font-black tracking-tight text-black font-sans">
              Pay<span className="text-[#0047BA]">Flow</span>
            </span>
          </Link>

          {/* + Create Button */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="mt-6 w-full py-2.5 px-4 rounded-full bg-black hover:bg-neutral-800 text-white text-sm font-semibold flex items-center justify-center space-x-2 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Create</span>
          </button>
        </div>

        {/* Sidebar Nav Items */}
        <nav className="flex-1 px-3 space-y-1 text-sm font-medium">
          {/* 1. Home */}
          <Link
            to="/dashboard"
            className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl transition-colors ${
              location.pathname === '/dashboard'
                ? 'bg-[#D6E6FE] text-[#003087] font-semibold'
                : 'text-gray-700 hover:bg-gray-100 hover:text-black'
            }`}
          >
            <Home className="w-4 h-4" />
            <span>Home</span>
          </Link>

          {/* 2. Activity */}
          <div>
            <button
              onClick={() => setIsActivityOpen(!isActivityOpen)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-colors ${
                location.pathname.startsWith('/transactions')
                  ? 'text-[#003087] font-semibold'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-black'
              }`}
            >
              <div className="flex items-center space-x-3">
                <FileText className="w-4 h-4" />
                <span>Activity</span>
              </div>
              {isActivityOpen ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
            </button>

            {isActivityOpen && (
              <div className="pl-4 pr-1 py-1 space-y-0.5 text-xs animate-in fade-in duration-100">
                <Link
                  to="/transactions"
                  className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                    location.pathname === '/transactions' && !location.search.includes('type=')
                      ? 'bg-[#D6E6FE] text-[#003087] font-semibold'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-black'
                  }`}
                >
                  <span>All transactions</span>
                  <Star className="w-3.5 h-3.5 text-blue-500 fill-blue-500" />
                </Link>
                <Link
                  to="/transactions?type=DEBIT"
                  className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                    location.search.includes('type=DEBIT')
                      ? 'bg-[#D6E6FE] text-[#003087] font-semibold'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-black'
                  }`}
                >
                  <span>Sent payments</span>
                </Link>
                <Link
                  to="/transactions?type=CREDIT"
                  className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                    location.search.includes('type=CREDIT')
                      ? 'bg-[#D6E6FE] text-[#003087] font-semibold'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-black'
                  }`}
                >
                  <span>Received payments</span>
                </Link>
                <Link
                  to="/transactions?type=TOPUP"
                  className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                    location.search.includes('type=TOPUP')
                      ? 'bg-[#D6E6FE] text-[#003087] font-semibold'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-black'
                  }`}
                >
                  <span>Top-ups & deposits</span>
                </Link>
              </div>
            )}
          </div>

          {/* 3. Pay & Get paid */}
          <div>
            <button
              onClick={() => setIsPayOpen(!isPayOpen)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-colors ${
                location.pathname.startsWith('/transfer') || location.pathname.startsWith('/wallet')
                  ? 'text-[#003087] font-semibold'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-black'
              }`}
            >
              <div className="flex items-center space-x-3">
                <CreditCard className="w-4 h-4" />
                <span>Pay & Get paid</span>
              </div>
              {isPayOpen ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
            </button>

            {isPayOpen && (
              <div className="pl-4 pr-1 py-1 space-y-0.5 text-xs animate-in fade-in duration-100">
                <Link
                  to="/transfer"
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                    location.pathname === '/transfer' && !location.search.includes('mode=request')
                      ? 'bg-[#D6E6FE] text-[#003087] font-semibold'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-black'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send payments</span>
                </Link>
                <Link
                  to="/transfer?mode=request"
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                    location.search.includes('mode=request')
                      ? 'bg-[#D6E6FE] text-[#003087] font-semibold'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-black'
                  }`}
                >
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                  <span>Request payments</span>
                </Link>
                <Link
                  to="/wallet"
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                    location.pathname === '/wallet'
                      ? 'bg-[#D6E6FE] text-[#003087] font-semibold'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-black'
                  }`}
                >
                  <Building className="w-3.5 h-3.5" />
                  <span>Banks & Cards</span>
                </Link>
                <Link
                  to="/wallet/topup"
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                    location.pathname === '/wallet/topup'
                      ? 'bg-[#D6E6FE] text-[#003087] font-semibold'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-black'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Money</span>
                </Link>
              </div>
            )}
          </div>

          {/* 4. Settings */}
          <Link
            to="/settings"
            className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl transition-colors ${
              location.pathname === '/settings'
                ? 'bg-[#D6E6FE] text-[#003087] font-semibold'
                : 'text-gray-700 hover:bg-gray-100 hover:text-black'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Account Settings</span>
          </Link>
        </nav>

        {/* Sidebar Footer: Undo Active Pill */}
        {heldPaise > 0 && (
          <div className="p-3 m-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs">
            <div className="flex items-center space-x-1.5 text-amber-900 font-bold">
              <Clock className="w-3.5 h-3.5 animate-pulse text-amber-600" />
              <span>In-Flight Undo</span>
            </div>
            <p className="text-[11px] text-amber-800 mt-0.5">
              {formatPaise(heldPaise)} held in 10-second grace window.
            </p>
            <Link
              to="/transfer"
              className="text-[11px] font-semibold text-blue-600 hover:underline block mt-1"
            >
              View countdown →
            </Link>
          </div>
        )}
      </aside>

      {/* ========================================================================= */}
      {/* MOBILE DRAWER OVERLAY (Visible on < md when open)                         */}
      {/* ========================================================================= */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Drawer content */}
          <div className="relative w-4/5 max-w-xs bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
            {/* Top Bar of Drawer */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <span className="text-xl font-black text-black">
                Pay<span className="text-[#0047BA]">Flow</span>
              </span>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 text-gray-400 hover:text-black rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User Profile in Drawer */}
            <div className="p-4 bg-gray-50 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-[#001C60] text-white flex items-center justify-center font-bold text-xs">
                  {getInitials(user?.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-sm text-gray-900 truncate">{user?.name}</div>
                  <div className="text-xs text-gray-500 truncate">{user?.email}</div>
                </div>
              </div>
              <div className="mt-3 p-2.5 rounded-xl bg-white border border-gray-200 flex justify-between items-center text-xs">
                <span className="text-gray-500">Available:</span>
                <span className="font-extrabold text-black tabular-numbers">
                  {formatPaise(availablePaise)}
                </span>
              </div>
            </div>

            {/* Quick Action Button */}
            <div className="p-4 border-b border-gray-100">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsCreateModalOpen(true);
                }}
                className="w-full py-2.5 px-4 rounded-full bg-black text-white text-xs font-bold flex items-center justify-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Create New</span>
              </button>
            </div>

            {/* Drawer Navigation Links */}
            <nav className="flex-1 p-3 space-y-1 text-sm font-medium overflow-y-auto">
              <Link
                to="/dashboard"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl ${
                  location.pathname === '/dashboard'
                    ? 'bg-[#D6E6FE] text-[#003087] font-semibold'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Home className="w-4 h-4" />
                <span>Home</span>
              </Link>

              <Link
                to="/transactions"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl ${
                  location.pathname === '/transactions'
                    ? 'bg-[#D6E6FE] text-[#003087] font-semibold'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Activity & Transactions</span>
              </Link>

              <Link
                to="/transfer"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl ${
                  location.pathname === '/transfer'
                    ? 'bg-[#D6E6FE] text-[#003087] font-semibold'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Send className="w-4 h-4" />
                <span>Send Money</span>
              </Link>

              <Link
                to="/transfer?mode=request"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-gray-700 hover:bg-gray-100"
              >
                <ArrowDownLeft className="w-4 h-4" />
                <span>Request Money</span>
              </Link>

              <Link
                to="/wallet"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl ${
                  location.pathname === '/wallet'
                    ? 'bg-[#D6E6FE] text-[#003087] font-semibold'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Building className="w-4 h-4" />
                <span>Banks & Cards</span>
              </Link>

              <Link
                to="/wallet/topup"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-gray-700 hover:bg-gray-100"
              >
                <Plus className="w-4 h-4" />
                <span>Add Money</span>
              </Link>

              <Link
                to="/settings"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl ${
                  location.pathname === '/settings'
                    ? 'bg-[#D6E6FE] text-[#003087] font-semibold'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>Account Settings</span>
              </Link>
            </nav>

            {/* Logout at bottom of drawer */}
            <div className="p-4 border-t border-gray-100">
              <button
                onClick={handleLogout}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center justify-center space-x-2 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MAIN VIEWPORT WRAPPER                                                     */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#FAFAFA] pb-16 md:pb-0">
        {/* Top Header Bar */}
        <header className="h-16 px-4 sm:px-8 flex items-center justify-between border-b border-gray-200/80 bg-white select-none sticky top-0 z-30">
          {/* Left on Mobile: Hamburger button + Brand */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 -ml-2 text-gray-700 hover:text-black hover:bg-gray-100 rounded-lg"
              aria-label="Open mobile navigation"
            >
              <Menu className="w-5 h-5 stroke-[2]" />
            </button>

            <Link to="/dashboard" className="md:hidden flex items-center space-x-1">
              <span className="text-xl font-black text-black">
                Pay<span className="text-[#0047BA]">Flow</span>
              </span>
            </Link>
          </div>

          {/* Right Header Items (Exact PayPal style) */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Developer </> Icon */}
            <button
              onClick={() => setIsDevModalOpen(true)}
              className="p-2 text-gray-700 hover:text-black hover:bg-gray-100 rounded-full transition-colors"
              title="Ledger Diagnostics & API Details"
            >
              <Code className="w-5 h-5 stroke-[2]" />
            </button>

            {/* Notification Bell */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="relative p-2 text-gray-700 hover:text-black hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5 stroke-[2]" />
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
                  {heldPaise > 0 ? '1' : '0'}
                </span>
              </button>

              {/* Notification Popover */}
              {isNotifOpen && (
                <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-xl border border-gray-200 py-3 text-gray-900 z-50 animate-in fade-in">
                  <div className="px-4 pb-2 border-b border-gray-100 flex items-center justify-between">
                    <span className="font-bold text-sm">Notifications</span>
                    <span className="text-[11px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">
                      Ledger Connected
                    </span>
                  </div>
                  <div className="max-h-60 overflow-y-auto divide-y divide-gray-100 text-xs">
                    {heldPaise > 0 ? (
                      <div className="p-3 bg-amber-50/60">
                        <span className="font-semibold text-amber-900 block">
                          Active Undo Window: {formatPaise(heldPaise)}
                        </span>
                        <p className="text-amber-800 text-[11px] mt-0.5">
                          An outgoing transfer is within its 10-second grace window.
                        </p>
                        <Link
                          to="/transfer"
                          onClick={() => setIsNotifOpen(false)}
                          className="text-blue-600 font-semibold mt-1 inline-block"
                        >
                          View Transfer →
                        </Link>
                      </div>
                    ) : (
                      <div className="p-4 text-center text-gray-500">
                        No pending notifications
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Divider Line */}
            <div className="h-6 w-px bg-gray-300" />

            {/* User Initials Circle */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="w-9 h-9 rounded-full bg-[#001C60] hover:bg-[#002C8A] text-white flex items-center justify-center text-xs font-bold transition-transform active:scale-95 shadow-sm"
              >
                {getInitials(user?.name)}
              </button>

              {/* Profile Menu Dropdown */}
              {isProfileMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-200 py-2 z-50 animate-in fade-in">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-xs text-gray-500">Signed in as</p>
                    <p className="text-sm font-bold text-gray-900 truncate">{user?.name}</p>
                    <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                  </div>
                  <div className="py-1 text-xs">
                    <Link
                      to="/settings"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="block px-4 py-2 hover:bg-gray-100 text-gray-700"
                    >
                      Account Settings
                    </Link>
                    <Link
                      to="/wallet"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="block px-4 py-2 hover:bg-gray-100 text-gray-700"
                    >
                      Wallet & Linked Banks
                    </Link>
                  </div>
                  <div className="pt-1 border-t border-gray-100">
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center space-x-2"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic Page Outlet with Responsive Padding */}
        <main className="flex-1 p-4 sm:p-8 lg:p-10 max-w-6xl w-full mx-auto">
          <Outlet />
        </main>

        {/* PayPal Footer (Responsive) */}
        <footer className="border-t border-gray-200 bg-white mt-auto py-6 px-4 sm:px-8 text-xs text-gray-500 select-none">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 sm:gap-4">
              <span className="font-semibold text-gray-700 hover:underline cursor-pointer">Help</span>
              <span className="font-semibold text-gray-700 hover:underline cursor-pointer">Contact</span>
              <span className="font-semibold text-gray-700 hover:underline cursor-pointer">Sitemap</span>
              <span className="font-semibold text-gray-700 hover:underline cursor-pointer">Fees</span>
              <span className="font-semibold text-gray-700 hover:underline cursor-pointer">Security</span>
              <span className="font-semibold text-gray-700 hover:underline cursor-pointer">About</span>
              <span className="font-semibold text-gray-700 hover:underline cursor-pointer">Developers</span>
              <span className="font-semibold text-gray-700 hover:underline cursor-pointer">Partners</span>
            </div>

            <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 sm:gap-4 text-[11px]">
              <span className="font-bold text-gray-800">English</span>
              <span>Copyright © 1999-2026 PayFlow. All rights reserved.</span>
              <span className="hover:underline cursor-pointer">Privacy</span>
              <span className="hover:underline cursor-pointer">Legal</span>
              <span className="hover:underline cursor-pointer">Policy updates</span>
            </div>
          </div>
        </footer>

        {/* ========================================================================= */}
        {/* MOBILE BOTTOM NAVIGATION BAR (Exact modern PayPal mobile app experience) */}
        {/* ========================================================================= */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 flex items-center justify-around py-2 px-1 select-none shadow-lg">
          {/* Home */}
          <Link
            to="/dashboard"
            className={`flex flex-col items-center py-1 px-3 rounded-lg text-[10px] font-bold ${
              location.pathname === '/dashboard' ? 'text-[#0047BA]' : 'text-gray-500'
            }`}
          >
            <Home className="w-5 h-5 mb-0.5" />
            <span>Home</span>
          </Link>

          {/* Activity */}
          <Link
            to="/transactions"
            className={`flex flex-col items-center py-1 px-3 rounded-lg text-[10px] font-bold ${
              location.pathname.startsWith('/transactions') ? 'text-[#0047BA]' : 'text-gray-500'
            }`}
          >
            <FileText className="w-5 h-5 mb-0.5" />
            <span>Activity</span>
          </Link>

          {/* Send / Pay Center CTA */}
          <Link
            to="/transfer"
            className="flex flex-col items-center py-1 px-3 -mt-3 text-[10px] font-bold text-white group"
          >
            <div className="w-11 h-11 rounded-full bg-black flex items-center justify-center shadow-md group-active:scale-95 transition-transform">
              <Send className="w-5 h-5 text-white" />
            </div>
            <span className="text-gray-800 font-bold text-[10px] mt-0.5">Send</span>
          </Link>

          {/* Wallet */}
          <Link
            to="/wallet"
            className={`flex flex-col items-center py-1 px-3 rounded-lg text-[10px] font-bold ${
              location.pathname === '/wallet' ? 'text-[#0047BA]' : 'text-gray-500'
            }`}
          >
            <CreditCard className="w-5 h-5 mb-0.5" />
            <span>Wallet</span>
          </Link>

          {/* Profile / Settings */}
          <Link
            to="/settings"
            className={`flex flex-col items-center py-1 px-3 rounded-lg text-[10px] font-bold ${
              location.pathname === '/settings' ? 'text-[#0047BA]' : 'text-gray-500'
            }`}
          >
            <User className="w-5 h-5 mb-0.5" />
            <span>Profile</span>
          </Link>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* QUICK + CREATE MODAL                                                      */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-200 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="font-bold text-base text-gray-900">Create New</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-sm">
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  navigate('/transfer');
                }}
                className="w-full p-3 rounded-2xl hover:bg-blue-50/70 border border-transparent hover:border-blue-100 flex items-center space-x-3 text-left transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-[#0047BA] flex items-center justify-center">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">Send Payment</div>
                  <div className="text-xs text-gray-500">Transfer with 10s PayFlow Undo</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  navigate('/transfer?mode=request');
                }}
                className="w-full p-3 rounded-2xl hover:bg-emerald-50/70 border border-transparent hover:border-emerald-100 flex items-center space-x-3 text-left transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <ArrowDownLeft className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">Request Payment</div>
                  <div className="text-xs text-gray-500">Request from registered user</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  navigate('/wallet/topup');
                }}
                className="w-full p-3 rounded-2xl hover:bg-purple-50/70 border border-transparent hover:border-purple-100 flex items-center space-x-3 text-left transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">Add Money</div>
                  <div className="text-xs text-gray-500">Deposit from linked bank</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DEV & LEDGER HEALTH MODAL (</>)                                           */}
      {/* ========================================================================= */}
      {isDevModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center space-x-2">
                <Code className="w-5 h-5 text-[#0047BA]" />
                <h3 className="font-bold text-base text-gray-900">PayFlow Engine Diagnostics</h3>
              </div>
              <button
                onClick={() => setIsDevModalOpen(false)}
                className="p-1 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-gray-700">
              <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200 space-y-2 font-mono">
                <div className="flex justify-between">
                  <span>Ledger Status:</span>
                  <span className="font-bold text-emerald-600">
                    {isHealthy ? 'HEALTHY (rs0)' : 'CONNECTING'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Transaction Semantics:</span>
                  <span className="font-bold">Multi-Doc ACID</span>
                </div>
                <div className="flex justify-between">
                  <span>Currency Representation:</span>
                  <span className="font-bold">Integer Paise (Zero Drift)</span>
                </div>
                <div className="flex justify-between">
                  <span>PayFlow Undo Window:</span>
                  <span className="font-bold text-amber-700">10,000 ms</span>
                </div>
              </div>
              <p className="text-gray-500 leading-relaxed text-[11px]">
                Built with MongoDB 7 transactional sessions. Every transfer is atomic and immutable.
              </p>
            </div>

            <button
              onClick={() => setIsDevModalOpen(false)}
              className="w-full py-2.5 rounded-full bg-black text-white text-xs font-semibold hover:bg-neutral-800"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
