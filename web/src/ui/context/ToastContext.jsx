import React, { createContext, useContext, useRef, useState, useCallback } from 'react';

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const [toastMessage, setToastMessage] = useState(null);
  const timeoutRef = useRef(null);
  const exitTimerRef = useRef(null);

  const dismissToast = useCallback(() => {
    if (exitTimerRef.current) window.clearTimeout(exitTimerRef.current);
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);

    setToastMessage((prev) => (prev ? { ...prev, isExiting: true } : null));

    exitTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 250);
  }, []);

  const showToast = useCallback((message, type = 'info', duration = 3500) => {
    if (exitTimerRef.current) window.clearTimeout(exitTimerRef.current);
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);

    setToastMessage({ message, type, isExiting: false });

    timeoutRef.current = window.setTimeout(() => {
      dismissToast();
    }, duration);
  }, [dismissToast]);

  return (
    <ToastContext.Provider value={{ toastMessage, showToast, dismissToast }}>
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
