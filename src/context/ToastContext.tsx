'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (type: ToastType, title: string, message?: string, duration?: number) => void;
  removeToast: (id: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const recentToastsRef = useRef<Map<string, number>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastType, title: string, message?: string, duration = 4000) => {
      const now = Date.now();
      const dedupKey = `${type}:${title}:${message || ''}`;
      const lastShown = recentToastsRef.current.get(dedupKey) || 0;

      // Deduplicate identical toasts within a 2.5-second cooldown window
      if (now - lastShown < 2500) {
        return;
      }
      recentToastsRef.current.set(dedupKey, now);

      // Clean up old cooldown entries periodically
      if (recentToastsRef.current.size > 50) {
        for (const [key, timestamp] of recentToastsRef.current.entries()) {
          if (now - timestamp > 10000) {
            recentToastsRef.current.delete(key);
          }
        }
      }

      const id = `toast-${now}-${Math.random().toString(36).substring(2, 6)}`;
      const newToast: Toast = { id, type, title, message, duration };

      setToasts((prev) => {
        // Also ensure not already present in the current visible list
        if (prev.some((t) => t.type === type && t.title === title && t.message === message)) {
          return prev;
        }
        return [...prev, newToast];
      });

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = useCallback((title: string, message?: string) => showToast('success', title, message), [showToast]);
  const error = useCallback((title: string, message?: string) => showToast('error', title, message), [showToast]);
  const info = useCallback((title: string, message?: string) => showToast('info', title, message), [showToast]);
  const warning = useCallback((title: string, message?: string) => showToast('warning', title, message), [showToast]);

  return (
    <ToastContext.Provider
      value={{ toasts, showToast, removeToast, success, error, info, warning }}
    >
      {children}
      {/* Toast container */}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2 max-w-md w-full pointer-events-none px-4"
      >
        {toasts.map((toast) => {
          const config = {
            success: {
              icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />,
              border: 'border-emerald-200 dark:border-emerald-800',
              bg: 'bg-white dark:bg-slate-900',
            },
            error: {
              icon: <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />,
              border: 'border-red-200 dark:border-red-800',
              bg: 'bg-white dark:bg-slate-900',
            },
            info: {
              icon: <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />,
              border: 'border-blue-200 dark:border-blue-800',
              bg: 'bg-white dark:bg-slate-900',
            },
            warning: {
              icon: <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />,
              border: 'border-amber-200 dark:border-amber-800',
              bg: 'bg-white dark:bg-slate-900',
            },
          }[toast.type];

          return (
            <div
              key={toast.id}
              role="alert"
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg ${config.bg} ${config.border} transition-all animate-slide-down`}
            >
              {config.icon}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{toast.title}</p>
                {toast.message && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                    {toast.message}
                  </p>
                )}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded focus:outline-none focus:ring-1 focus:ring-slate-400"
                aria-label="Close notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

