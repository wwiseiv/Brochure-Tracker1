/**
 * PCB Auto — useNavigation hook
 * 
 * Handles AI-triggered navigation: route changes via Wouter,
 * scroll-to-section, element highlighting, and toast notifications.
 */

import { useCallback, useState, useRef } from 'react';
import { useLocation } from 'wouter';
import { getNavTarget, type NavTarget } from './navMap';

interface ToastState {
  visible: boolean;
  message: string;
  icon: string;
}

export function useAINavigation() {
  const [, setLocation] = useLocation();
  const [toast, setToast] = useState<ToastState>({ visible: false, message: '', icon: '' });
  const toastTimeout = useRef<ReturnType<typeof setTimeout>>();

  const showToast = useCallback((message: string, icon: string = '📍') => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    setToast({ visible: true, message, icon });
    toastTimeout.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 3000);
  }, []);

  const highlightElement = useCallback((elementId: string) => {
    // Wait for route transition + render
    setTimeout(() => {
      const el = document.getElementById(elementId);
      if (!el) return;

      // Scroll into view
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Add highlight class (CSS handles the animation)
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

      // Build full path
      const path = target.hash ? `${target.route}#${target.hash}` : target.route;

      // Navigate via Wouter
      setLocation(path);

      // Show toast
      showToast(target.toast, target.icon || '📍');

      // Highlight target element if specified
      if (target.highlightId) {
        highlightElement(target.highlightId);
      }
    },
    [setLocation, showToast, highlightElement]
  );

  return { navigateTo, toast, showToast };
}

/**
 * CSS to add to your global styles (or Tailwind @layer)
 * for the highlight animation and toast.
 * 
 * Add this to your global CSS file:
 * 
 * .ai-nav-highlight {
 *   outline: 3px solid rgba(59, 130, 246, 0.5) !important;
 *   outline-offset: 4px;
 *   border-radius: 12px;
 *   box-shadow: 0 0 0 6px rgba(59, 130, 246, 0.1) !important;
 *   transition: outline 0.3s ease, box-shadow 0.3s ease;
 *   animation: ai-nav-pulse 0.6s ease-in-out 2;
 * }
 * 
 * @keyframes ai-nav-pulse {
 *   0%, 100% { outline-color: rgba(59, 130, 246, 0.5); }
 *   50% { outline-color: rgba(59, 130, 246, 0.8); }
 * }
 */
