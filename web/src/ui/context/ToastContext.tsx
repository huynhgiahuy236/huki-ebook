import React, { createContext, useContext, useRef, useState, useCallback } from 'react';
import { soundEffects } from '../utils/soundEffects';

export type ToastCategory = 'success' | 'error' | 'warning' | 'info' | 'order' | 'system' | 'finance';

export interface ToastOptions {
  id?: string;
  title?: string;
  message?: string;
  desc?: string;
  type?: ToastCategory;
  duration?: number;
  actionUrl?: string;
  actionLabel?: string;
  playSound?: boolean;
}

export interface ToastMessageState {
  id: string;
  title: string;
  message: string;
  type: ToastCategory;
  duration: number;
  actionUrl?: string;
  actionLabel?: string;
  isExiting: boolean;
  createdAt: number;
}

export interface ToastContextType {
  toastMessage: ToastMessageState | null;
  toasts: ToastMessageState[];
  showToast: (msgOrObj: string | ToastOptions, type?: ToastCategory, duration?: number) => void;
  dismissToast: (id?: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessageState[]>([]);
  const timeoutsMap = useRef<Map<string, number>>(new Map());

  const dismissToast = useCallback((id?: string) => {
    setToasts((prev) => {
      if (prev.length === 0) return prev;
      const targetId = id || prev[prev.length - 1]?.id;
      if (!targetId) return prev;

      // Mark exiting
      return prev.map((t) => (t.id === targetId ? { ...t, isExiting: true } : t));
    });

    // Remove from array after animation completes
    window.setTimeout(() => {
      setToasts((prev) => {
        const targetId = id || prev.find((t) => t.isExiting)?.id;
        if (!targetId) return prev;
        const timer = timeoutsMap.current.get(targetId);
        if (timer) {
          window.clearTimeout(timer);
          timeoutsMap.current.delete(targetId);
        }
        return prev.filter((t) => t.id !== targetId);
      });
    }, 280);
  }, []);

  const showToast = useCallback(
    (msgOrObj: string | ToastOptions, type: ToastCategory = 'info', duration = 5000) => {
      let title = '';
      let message = '';
      let toastType: ToastCategory = type;
      let toastDuration = duration;
      let actionUrl: string | undefined;
      let actionLabel: string | undefined;
      let shouldPlaySound = true;

      if (typeof msgOrObj === 'object' && msgOrObj !== null) {
        title = msgOrObj.title || '';
        message = msgOrObj.message || msgOrObj.desc || '';
        toastType = msgOrObj.type || type;
        toastDuration = msgOrObj.duration || duration;
        actionUrl = msgOrObj.actionUrl;
        actionLabel = msgOrObj.actionLabel;
        if (msgOrObj.playSound === false) shouldPlaySound = false;
      } else {
        message = String(msgOrObj || '');
      }

      const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const newToast: ToastMessageState = {
        id,
        title,
        message,
        type: toastType,
        duration: toastDuration,
        actionUrl,
        actionLabel,
        isExiting: false,
        createdAt: Date.now(),
      };

      // Play chime according to type
      if (shouldPlaySound) {
        if (toastType === 'order') {
          soundEffects.playOrderChime();
        } else {
          soundEffects.playChime();
        }
      }

      setToasts((prev) => {
        // Keep max 3 toasts to prevent screen crowding
        const updated = [...prev, newToast];
        if (updated.length > 3) {
          return updated.slice(updated.length - 3);
        }
        return updated;
      });

      // Auto dismiss timer
      const timer = window.setTimeout(() => {
        dismissToast(id);
      }, toastDuration);
      timeoutsMap.current.set(id, timer);
    },
    [dismissToast]
  );

  const activeToast = toasts[toasts.length - 1] || null;

  return (
    <ToastContext.Provider value={{ toastMessage: activeToast, toasts, showToast, dismissToast }}>
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      toastMessage: null,
      toasts: [],
      showToast: () => {},
      dismissToast: () => {},
    };
  }
  return context;
};
