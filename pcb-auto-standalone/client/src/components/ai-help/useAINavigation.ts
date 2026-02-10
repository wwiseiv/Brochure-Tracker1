import { useCallback, useState, useRef } from 'react';
import { useLocation } from 'wouter';
import { getNavTarget } from './navMap';

interface ToastState {
  visible: boolean;
  message: string;
  icon: string;
}

export function useAINavigation() {
  const [, setLocation] = useLocation();
  const [toast, setToast] = useState<ToastState>({ visible: false, message: '', icon: '' });
  const toastTimeout = useRef<ReturnType<typeof setTimeout>>();

  const showToast = useCallback((message: string, icon: string = '') => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    setToast({ visible: true, message, icon });
    toastTimeout.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 3000);
  }, []);

  const highlightElement = useCallback((elementId: string) => {
    setTimeout(() => {
      const el = document.getElementById(elementId);
      if (!el) return;

      el.scrollIntoView({ behavior: 'smooth', block: 'center' });

      el.classList.add('ai-nav-highlight');
      setTimeout(() => el.classList.remove('ai-nav-highlight'), 2500);
    }, 400);
  }, []);

  const navigateTo = useCallback(
    (key: string) => {
      const target = getNavTarget(key);
      if (!target) {
        console.warn(`[AI Nav] Unknown nav key: ${key}`);
        return;
      }

      const path = target.hash ? `${target.route}#${target.hash}` : target.route;

      setLocation(path);

      showToast(target.toast, target.icon || '');

      if (target.highlightId) {
        highlightElement(target.highlightId);
      }
    },
    [setLocation, showToast, highlightElement]
  );

  return { navigateTo, toast, showToast };
}
