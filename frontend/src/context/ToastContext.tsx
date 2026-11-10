import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast viewport */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center space-x-2.5 px-3.5 py-2.5 rounded-lg border text-[13px] font-medium shadow-elevated transition-all animate-in slide-in-from-bottom-2 fade-in duration-200 ${
              toast.type === 'success'
                ? 'bg-white border-fintech-border text-fintech-dark'
                : toast.type === 'error'
                ? 'bg-white border-fintech-dangerBorder text-fintech-danger'
                : 'bg-white border-fintech-border text-fintech-dark'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-fintech-success flex-shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-fintech-danger flex-shrink-0" />}
            {toast.type === 'info' && <Info className="w-4 h-4 text-fintech-blue flex-shrink-0" />}
            <span className="flex-1">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-fintech-textSubtle hover:text-fintech-dark transition-colors p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

