/**
 * iOS Scroll Management Hooks
 * ===========================
 * 
 * Handles body scroll locking and iOS Safari scroll quirks.
 * Prevents background scrolling when modals/sheets are open.
 * 
 * INSTALLATION:
 *   Copy to: client/src/hooks/use-ios-scroll-lock.ts
 */

import { useEffect, useRef, useCallback } from 'react';

// ============================================
// DEVICE DETECTION
// ============================================

/**
 * Detect if running on iOS
 */
export function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/**
 * Detect if running on iOS Safari specifically
 */
export function isIOSSafari(): boolean {
  if (typeof window === 'undefined') return false;
  
  const ua = navigator.userAgent;
  const isIos = isIOS();
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS/.test(ua);
  
  return isIos && isSafari;
}

/**
 * Get iOS version number
 */
export function getIOSVersion(): number | null {
  if (!isIOS()) return null;
  
  const match = navigator.userAgent.match(/OS (\d+)_/);
  return match ? parseInt(match[1], 10) : null;
}

// ============================================
// SCROLL POSITION TRACKING
// ============================================

let scrollPosition = 0;
let lockCount = 0;

/**
 * Lock body scroll (supports nested locks)
 */
function lockBodyScroll(): void {
  lockCount++;
  
  if (lockCount === 1) {
    // Store current scroll position
    scrollPosition = window.pageYOffset;
    
    // Apply scroll lock styles
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollPosition}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    
    // iOS specific
    if (isIOS()) {
      document.body.style.height = '100%';
      // Prevent iOS rubber-banding on body
      document.documentElement.style.overflow = 'hidden';
      document.documentElement.style.height = '100%';
    }
  }
}

/**
 * Unlock body scroll
 */
function unlockBodyScroll(): void {
  lockCount = Math.max(0, lockCount - 1);
  
  if (lockCount === 0) {
    // Remove scroll lock styles
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    
    // iOS specific cleanup
    if (isIOS()) {
      document.body.style.height = '';
      document.documentElement.style.overflow = '';
      document.documentElement.style.height = '';
    }
    
    // Restore scroll position
    window.scrollTo(0, scrollPosition);
  }
}

// ============================================
// BODY SCROLL LOCK HOOK
// ============================================

interface UseBodyScrollLockOptions {
  /** Whether scroll lock is active */
  isLocked: boolean;
  /** Reserve space for scrollbar to prevent layout shift */
  reserveScrollBarGap?: boolean;
}

/**
 * Hook to lock body scroll when a modal/sheet is open
 */
export function useBodyScrollLock({ 
  isLocked, 
  reserveScrollBarGap = true 
}: UseBodyScrollLockOptions): void {
  useEffect(() => {
    if (!isLocked) return;
    
    // Calculate scrollbar width before locking
    const scrollBarWidth = reserveScrollBarGap 
      ? window.innerWidth - document.documentElement.clientWidth 
      : 0;
    
    if (scrollBarWidth > 0) {
      document.body.style.paddingRight = `${scrollBarWidth}px`;
    }
    
    lockBodyScroll();
    
    return () => {
      unlockBodyScroll();
      if (scrollBarWidth > 0) {
        document.body.style.paddingRight = '';
      }
    };
  }, [isLocked, reserveScrollBarGap]);
}

// ============================================
// iOS SCROLL CONTAINMENT HOOK
// ============================================

interface UseIOSScrollContainmentOptions {
  /** Whether containment is active */
  enabled?: boolean;
  /** Allow scrolling past boundaries briefly (iOS feel) */
  allowBounce?: boolean;
}

/**
 * Hook to handle iOS scroll containment for a scrollable element
 * Prevents scroll chaining and rubber-banding issues
 */
export function useIOSScrollContainment<T extends HTMLElement>(
  options: UseIOSScrollContainmentOptions = {}
) {
  const { enabled = true, allowBounce = false } = options;
  const ref = useRef<T>(null);
  const startY = useRef(0);
  const startScrollTop = useRef(0);
  
  useEffect(() => {
    const element = ref.current;
    if (!element || !enabled || !isIOS()) return;
    
    const handleTouchStart = (e: TouchEvent) => {
      startY.current = e.touches[0].clientY;
      startScrollTop.current = element.scrollTop;
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      const currentY = e.touches[0].clientY;
      const deltaY = startY.current - currentY;
      const scrollTop = element.scrollTop;
      const scrollHeight = element.scrollHeight;
      const clientHeight = element.clientHeight;
      
      const isAtTop = scrollTop <= 0;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight;
      const isScrollingUp = deltaY < 0;
      const isScrollingDown = deltaY > 0;
      
      // Prevent scroll chaining at boundaries
      if ((isAtTop && isScrollingUp) || (isAtBottom && isScrollingDown)) {
        if (!allowBounce) {
          e.preventDefault();
        }
      }
      
      // If content doesn't need scrolling, prevent all scroll
      if (scrollHeight <= clientHeight) {
        e.preventDefault();
      }
    };
    
    // Use passive: false to allow preventDefault
    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    
    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
    };
  }, [enabled, allowBounce]);
  
  return ref;
}

// ============================================
// BOTTOM SHEET SCROLL HOOK
// ============================================

interface UseBottomSheetScrollOptions {
  /** Whether the sheet is open */
  isOpen: boolean;
  /** Callback when user tries to scroll past top (for dismiss gesture) */
  onScrollPastTop?: () => void;
  /** Threshold in pixels to trigger onScrollPastTop */
  dismissThreshold?: number;
}

interface UseBottomSheetScrollReturn<T extends HTMLElement> {
  /** Ref to attach to scrollable content container */
  scrollRef: React.RefObject<T>;
  /** Whether content is at the top */
  isAtTop: boolean;
  /** Whether content is at the bottom */
  isAtBottom: boolean;
  /** Current scroll progress (0-1) */
  scrollProgress: number;
}

/**
 * Comprehensive hook for bottom sheet scroll handling
 * Handles iOS quirks, scroll containment, and dismiss gestures
 */
export function useBottomSheetScroll<T extends HTMLElement = HTMLDivElement>(
  options: UseBottomSheetScrollOptions
): UseBottomSheetScrollReturn<T> {
  const { isOpen, onScrollPastTop, dismissThreshold = 50 } = options;
  
  const scrollRef = useRef<T>(null);
  const touchStartY = useRef(0);
  const scrollStartTop = useRef(0);
  const isAtTopRef = useRef(true);
  const isAtBottomRef = useRef(false);
  const scrollProgressRef = useRef(0);
  
  // Lock body scroll when open
  useBodyScrollLock({ isLocked: isOpen });
  
  useEffect(() => {
    const element = scrollRef.current;
    if (!element || !isOpen) return;
    
    const updateScrollState = () => {
      const { scrollTop, scrollHeight, clientHeight } = element;
      isAtTopRef.current = scrollTop <= 0;
      isAtBottomRef.current = scrollTop + clientHeight >= scrollHeight - 1;
      scrollProgressRef.current = scrollHeight > clientHeight 
        ? scrollTop / (scrollHeight - clientHeight) 
        : 0;
    };
    
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY;
      scrollStartTop.current = element.scrollTop;
      updateScrollState();
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      const currentY = e.touches[0].clientY;
      const deltaY = touchStartY.current - currentY; // positive = scrolling down
      const { scrollTop, scrollHeight, clientHeight } = element;
      
      updateScrollState();
      
      const isScrollingUp = deltaY < 0;
      const isScrollingDown = deltaY > 0;
      const canScrollUp = scrollTop > 0;
      const canScrollDown = scrollTop < scrollHeight - clientHeight;
      
      // Handle dismiss gesture (pull down when at top)
      if (isAtTopRef.current && isScrollingUp && onScrollPastTop) {
        const overscroll = Math.abs(deltaY);
        if (overscroll > dismissThreshold) {
          onScrollPastTop();
          return;
        }
      }
      
      // Prevent scroll chaining to body
      if (isIOS()) {
        // At top, trying to scroll up
        if (!canScrollUp && isScrollingUp) {
          e.preventDefault();
        }
        // At bottom, trying to scroll down
        if (!canScrollDown && isScrollingDown) {
          e.preventDefault();
        }
        // Content doesn't scroll at all
        if (scrollHeight <= clientHeight) {
          e.preventDefault();
        }
      }
    };
    
    const handleScroll = () => {
      updateScrollState();
    };
    
    // Initial state
    updateScrollState();
    
    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('scroll', handleScroll);
    };
  }, [isOpen, onScrollPastTop, dismissThreshold]);
  
  return {
    scrollRef,
    get isAtTop() { return isAtTopRef.current; },
    get isAtBottom() { return isAtBottomRef.current; },
    get scrollProgress() { return scrollProgressRef.current; },
  };
}

// ============================================
// SAFE AREA HOOK
// ============================================

interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * Hook to get iOS safe area insets
 */
export function useSafeAreaInsets(): SafeAreaInsets {
  const getInsets = useCallback((): SafeAreaInsets => {
    if (typeof window === 'undefined') {
      return { top: 0, right: 0, bottom: 0, left: 0 };
    }
    
    const style = getComputedStyle(document.documentElement);
    
    return {
      top: parseInt(style.getPropertyValue('--sat') || '0', 10) || 
           parseInt(style.getPropertyValue('env(safe-area-inset-top)') || '0', 10),
      right: parseInt(style.getPropertyValue('--sar') || '0', 10) ||
             parseInt(style.getPropertyValue('env(safe-area-inset-right)') || '0', 10),
      bottom: parseInt(style.getPropertyValue('--sab') || '0', 10) ||
              parseInt(style.getPropertyValue('env(safe-area-inset-bottom)') || '0', 10),
      left: parseInt(style.getPropertyValue('--sal') || '0', 10) ||
            parseInt(style.getPropertyValue('env(safe-area-inset-left)') || '0', 10),
    };
  }, []);
  
  return getInsets();
}

// ============================================
// EXPORTS
// ============================================

export {
  lockBodyScroll,
  unlockBodyScroll,
};

export default useBodyScrollLock;
