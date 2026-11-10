import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CreditCard,
  Send,
  PlusCircle,
  Receipt,
  Settings,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { logout } = useAuth();

  const navigation = [
    { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { name: 'My Wallet', href: '/wallet', icon: CreditCard },
    { name: 'Send Money', href: '/transfer', icon: Send },
    { name: 'Add Money', href: '/wallet/topup', icon: PlusCircle },
    { name: 'Transactions', href: '/transactions', icon: Receipt },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-40 h-screen w-60 bg-[#FAFAFB] border-r border-fintech-border flex flex-col justify-between transition-transform duration-150 ease-in-out md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Logo on Mobile */}
          <div className="h-14 flex items-center px-5 border-b border-fintech-border md:hidden">
            <span className="font-semibold text-sm tracking-tight text-fintech-dark">
              PayFlow
            </span>
          </div>

          {/* Navigation Links */}
          <div className="px-3 py-5 space-y-1">
            <div className="px-2.5 pb-2 text-[11px] font-medium tracking-wider text-fintech-textSubtle uppercase">
              Menu
            </div>

            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center space-x-2.5 px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                      isActive
                        ? 'bg-white text-fintech-dark shadow-subtle border border-fintech-border font-medium'
                        : 'text-fintech-textMuted hover:text-fintech-dark hover:bg-slate-100/70'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 flex-shrink-0 text-fintech-textSubtle" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-3 border-t border-fintech-border">
          <button
            onClick={() => {
              logout();
              if (onClose) onClose();
            }}
            className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-fintech-textMuted hover:text-fintech-danger hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
