'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  showToast: (toast: Omit<Toast, 'id'>) => void;
  hideToast: (id: string) => void;
  toasts: Toast[];
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: Toast = {
      id,
      duration: 5000,
      ...toast,
    };

    setToasts(prev => [...prev, newToast]);

    // Auto-hide after duration
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        hideToast(id);
      }, newToast.duration);
    }
  }, []);

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, hideToast, toasts }}>
      {children}
      <ToastContainer toasts={toasts} onHide={hideToast} />
    </ToastContext.Provider>
  );
};

const ToastContainer: React.FC<{ toasts: Toast[]; onHide: (id: string) => void }> = ({ toasts, onHide }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onHide={onHide} />
      ))}
    </div>,
    document.body
  );
};

const ToastItem: React.FC<{ toast: Toast; onHide: (id: string) => void }> = ({ toast, onHide }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleHide = () => {
    setIsLeaving(true);
    setTimeout(() => onHide(toast.id), 300);
  };

  const getToastStyles = () => {
    const baseStyles = "max-w-sm w-full pointer-events-auto overflow-hidden transform transition-all duration-300 ease-in-out border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]";
    
    if (isLeaving) {
      return `${baseStyles} translate-x-full opacity-0 scale-95`;
    }
    
    if (isVisible) {
      return `${baseStyles} translate-x-0 opacity-100 scale-100`;
    }
    
    return `${baseStyles} translate-x-full opacity-0 scale-95`;
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return (
          <div className="flex-shrink-0">
            <div className="w-6 h-6 bg-green-500 border border-black flex items-center justify-center shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
              <svg className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        );
      case 'error':
        return (
          <div className="flex-shrink-0">
            <div className="w-6 h-6 bg-red-500 border border-black flex items-center justify-center shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
              <svg className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        );
      case 'warning':
        return (
          <div className="flex-shrink-0">
            <div className="w-6 h-6 bg-yellow-500 border border-black flex items-center justify-center shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
              <svg className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.725-1.36 3.49 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        );
      case 'info':
        return (
          <div className="flex-shrink-0">
            <div className="w-6 h-6 bg-blue-500 border border-black flex items-center justify-center shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
              <svg className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        );
    }
  };

  const getBackgroundColor = () => {
    switch (toast.type) {
      case 'success': return 'bg-green-300 text-black';
      case 'error': return 'bg-red-300 text-black';
      case 'warning': return 'bg-yellow-300 text-black';
      case 'info': return 'bg-blue-300 text-black';
    }
  };

  return (
    <div className={getToastStyles()}>
      <div className={`p-4 ${getBackgroundColor()}`}>
        <div className="flex items-start">
          {getIcon()}
          <div className="ml-3 w-0 flex-1">
            <p className="text-sm font-bold text-black font-mono uppercase tracking-wide">
              {toast.title}
            </p>
            {toast.message && (
              <p className="mt-1 text-xs text-black font-mono">
                {toast.message}
              </p>
            )}
            {toast.action && (
              <div className="mt-2">
                <button
                  onClick={toast.action.onClick}
                  className="text-xs font-bold text-black hover:text-blue-600 bg-white hover:bg-blue-200 px-2 py-1 border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all duration-200 font-mono"
                >
                  {toast.action.label}
                </button>
              </div>
            )}
          </div>
          <div className="ml-3 flex-shrink-0 flex">
            <button
              onClick={handleHide}
              className="bg-white hover:bg-red-200 inline-flex text-black hover:text-red-600 focus:outline-none p-1 transition-all duration-200 hover:scale-110 border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
            >
              <span className="sr-only">Close</span>
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Convenience hooks for common toast types
export const useToastNotifications = () => {
  const { showToast } = useToast();

  return {
    success: (title: string, message?: string) => 
      showToast({ type: 'success', title, message }),
    error: (title: string, message?: string) => 
      showToast({ type: 'error', title, message }),
    warning: (title: string, message?: string) => 
      showToast({ type: 'warning', title, message }),
    info: (title: string, message?: string) => 
      showToast({ type: 'info', title, message }),
    connection: (message: string) => 
      showToast({ 
        type: 'info', 
        title: 'Connection Status', 
        message,
        duration: 3000 
      }),
    message: (message: string, from: string) => 
      showToast({ 
        type: 'info', 
        title: `New message from ${from}`, 
        message,
        duration: 4000 
      }),
  };
};
