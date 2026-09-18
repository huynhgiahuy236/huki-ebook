import React, { createContext, useContext, useRef, useState, useCallback } from 'react';

export interface ToastOptions {
  title?: string;
  message?: string;
  desc?: string;
  type?: 'success' | 'error' | 'warning' | 'info';
}

export interface ToastMessageState {
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  isExiting: boolean;
}

export interface ToastContextType {
  toastMessage: ToastMessageState | null;
  showToast: (msgOrObj: string | ToastOptions, type?: 'success' | 'error' | 'warning' | 'info', duration?: number) => void;
  dismissToast: () => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toastMessage, setToastMessage] = useState<ToastMessageState | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const exitTimerRef = useRef<number | null>(null);

  const dismissToast = useCallback(() => {
    if (exitTimerRef.current) window.clearTimeout(exitTimerRef.current);
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);

    setToastMessage((prev) => (prev ? { ...prev, isExiting: true } : null));

    exitTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 250);
  }, []);

  const showToast = useCallback(
    (msgOrObj: string | ToastOptions, type: 'success' | 'error' | 'warning' | 'info' = 'info', duration = 4000) => {
      if (exitTimerRef.current) window.clearTimeout(exitTimerRef.current);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);

      let title = '';
      let message = '';
      let toastType = type;

      if (typeof msgOrObj === 'object' && msgOrObj !== null) {
        title = msgOrObj.title || '';
        message = msgOrObj.message || msgOrObj.desc || '';
        toastType = msgOrObj.type || type;
      } else {
        message = String(msgOrObj || '');
      }

      setToastMessage({ title, message, type: toastType, isExiting: false });

      timeoutRef.current = window.setTimeout(() => {
        dismissToast();
      }, duration);
    },
    [dismissToast]
  );

  return (
    <ToastContext.Provider value={{ toastMessage, showToast, dismissToast }}>
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      toastMessage: null,
      showToast: () => {},
      dismissToast: () => {},
    };
  }
  return context;
};
