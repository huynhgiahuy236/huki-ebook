import React, { createContext, useContext, useRef, useState, useCallback } from 'react';

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const [toastMessage, setToastMessage] = useState(null);
  const timeoutRef = useRef(null);

  const showToast = useCallback((message, type = 'info') => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    setToastMessage({ message, type });
    timeoutRef.current = window.setTimeout(() => setToastMessage(null), 3500);
  }, []);

  const dismissToast = useCallback(() => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    setToastMessage(null);
  }, []);

  return (
    <ToastContext.Provider value={{ toastMessage, showToast, dismissToast }}>
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
