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

  const showToast = useCallback((msgOrObj, type = 'info', duration = 4000) => {
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
  }, [dismissToast]);

  return (
    <ToastContext.Provider value={{ toastMessage, showToast, dismissToast }}>
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
