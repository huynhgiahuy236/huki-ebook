import { useEffect, useRef } from 'react';

export interface UseSmartFormOptions {
  isOpen: boolean;
  onClose: () => void;
  isDirty: boolean;
  autoScroll?: boolean;
}

/**
 * Custom hook for smart in-page admin forms:
 * 1. Automatically smooth-scrolls to the form when it opens.
 * 2. Closes form when clicking outside IF no data was entered (!isDirty).
 * 3. Keeps form open if user has entered data to prevent accidental work loss.
 */
export function useSmartFormCollapse<T extends HTMLElement = HTMLDivElement>({
  isOpen,
  onClose,
  isDirty,
  autoScroll = true,
}: UseSmartFormOptions) {
  const formRef = useRef<T | null>(null);

  // 1. Auto smooth scroll when opening
  useEffect(() => {
    if (isOpen && autoScroll && formRef.current) {
      const timer = setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoScroll]);

  // 2. Auto close on outside click if untouched
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (formRef.current && !formRef.current.contains(e.target as Node)) {
        // If untouched, close automatically
        if (!isDirty) {
          onClose();
        }
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen, isDirty, onClose]);

  return formRef;
}
