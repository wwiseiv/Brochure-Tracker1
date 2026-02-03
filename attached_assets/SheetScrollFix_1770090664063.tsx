/**
 * Sheet Scroll Fix Wrapper
 * ========================
 * 
 * A drop-in wrapper that fixes iOS scroll issues in existing shadcn/ui
 * Sheet components without requiring a full rewrite.
 * 
 * INSTALLATION:
 *   Copy to: client/src/components/SheetScrollFix.tsx
 * 
 * USAGE:
 *   Wrap your existing Sheet content:
 *   
 *   <Sheet>
 *     <SheetContent>
 *       <SheetScrollFix>
 *         {your existing content}
 *       </SheetScrollFix>
 *     </SheetContent>
 *   </Sheet>
 */

import React, { useRef, useEffect, forwardRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { 
  useBodyScrollLock, 
  isIOS,
  isIOSSafari 
} from '@/hooks/use-ios-scroll-lock';

// ============================================
// SHEET SCROLL FIX WRAPPER
// ============================================

interface SheetScrollFixProps {
  children: React.ReactNode;
  /** Whether the sheet is open (for body scroll lock) */
  isOpen?: boolean;
  /** Additional className for the scroll container */
  className?: string;
  /** Fixed header content (stays at top) */
  header?: React.ReactNode;
  /** Fixed footer content (stays at bottom) */
  footer?: React.ReactNode;
  /** Padding for the scrollable content */
  contentPadding?: string;
  /** Enable debug outline (dev only) */
  debug?: boolean;
}

export const SheetScrollFix = forwardRef<HTMLDivElement, SheetScrollFixProps>(
  (
    {
      children,
      isOpen = true,
      className,
      header,
      footer,
      contentPadding = 'p-4',
      debug = false,
    },
    forwardedRef
  ) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const startY = useRef(0);
    const startScrollTop = useRef(0);
    
    // Lock body scroll
    useBodyScrollLock({ isLocked: isOpen });
    
    // iOS scroll containment
    useEffect(() => {
      const element = scrollRef.current;
      if (!element || !isIOS()) return;
      
      const handleTouchStart = (e: TouchEvent) => {
        startY.current = e.touches[0].clientY;
        startScrollTop.current = element.scrollTop;
      };
      
      const handleTouchMove = (e: TouchEvent) => {
        const currentY = e.touches[0].clientY;
        const deltaY = startY.current - currentY;
        const { scrollTop, scrollHeight, clientHeight } = element;
        
        const isAtTop = scrollTop <= 0;
        const isAtBottom = scrollTop + clientHeight >= scrollHeight;
        const isScrollingUp = deltaY < 0;
        const isScrollingDown = deltaY > 0;
        
        // Content doesn't need scrolling
        if (scrollHeight <= clientHeight) {
          e.preventDefault();
          return;
        }
        
        // At boundaries, prevent overscroll
        if ((isAtTop && isScrollingUp) || (isAtBottom && isScrollingDown)) {
          e.preventDefault();
        }
      };
      
      element.addEventListener('touchstart', handleTouchStart, { passive: true });
      element.addEventListener('touchmove', handleTouchMove, { passive: false });
      
      return () => {
        element.removeEventListener('touchstart', handleTouchStart);
        element.removeEventListener('touchmove', handleTouchMove);
      };
    }, []);
    
    // Merge refs
    const mergedRef = useCallback(
      (node: HTMLDivElement) => {
        scrollRef.current = node;
        if (typeof forwardedRef === 'function') {
          forwardedRef(node);
        } else if (forwardedRef) {
          forwardedRef.current = node;
        }
      },
      [forwardedRef]
    );
    
    return (
      <div 
        className={cn(
          'flex flex-col h-full',
          debug && 'outline outline-2 outline-blue-500'
        )}
      >
        {/* Fixed header */}
        {header && (
          <div className={cn(
            'flex-shrink-0',
            debug && 'outline outline-2 outline-green-500'
          )}>
            {header}
          </div>
        )}
        
        {/* Scrollable content */}
        <div
          ref={mergedRef}
          className={cn(
            // Layout
            'flex-1 min-h-0',
            
            // Scrolling
            'overflow-y-auto overflow-x-hidden',
            
            // iOS fixes
            'overscroll-contain',
            'ios-scroll-container',
            
            // Content padding
            contentPadding,
            
            // Debug
            debug && 'outline outline-2 outline-red-500',
            
            className
          )}
          style={{
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
          }}
        >
          {children}
        </div>
        
        {/* Fixed footer */}
        {footer && (
          <div 
            className={cn(
              'flex-shrink-0',
              debug && 'outline outline-2 outline-yellow-500'
            )}
            style={{
              paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    );
  }
);

SheetScrollFix.displayName = 'SheetScrollFix';

// ============================================
// SIMPLE FIX HOC (For Quick Fixes)
// ============================================

/**
 * Higher-order component to wrap any content with scroll fixes
 */
export function withIOSScrollFix<P extends object>(
  Component: React.ComponentType<P>
): React.FC<P & { sheetOpen?: boolean }> {
  return function WrappedComponent({ sheetOpen = true, ...props }) {
    useBodyScrollLock({ isLocked: sheetOpen });
    
    return (
      <div 
        className="h-full overflow-y-auto overscroll-contain ios-scroll-container"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <Component {...(props as P)} />
      </div>
    );
  };
}

// ============================================
// SCROLL AREA COMPONENT (Standalone)
// ============================================

interface FixedScrollAreaProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Simple scroll area with iOS fixes applied
 */
export const FixedScrollArea = forwardRef<HTMLDivElement, FixedScrollAreaProps>(
  ({ children, className }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'overflow-y-auto overflow-x-hidden',
          'overscroll-contain',
          'ios-scroll-container',
          className
        )}
        style={{
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
        }}
      >
        {children}
      </div>
    );
  }
);

FixedScrollArea.displayName = 'FixedScrollArea';

// ============================================
// UTILITY: Apply fixes to existing element
// ============================================

/**
 * Apply iOS scroll fixes to an existing DOM element
 * Useful for third-party components you can't modify
 */
export function applyIOSScrollFix(element: HTMLElement): () => void {
  if (!isIOS() || !element) return () => {};
  
  let startY = 0;
  let startScrollTop = 0;
  
  const handleTouchStart = (e: TouchEvent) => {
    startY = e.touches[0].clientY;
    startScrollTop = element.scrollTop;
  };
  
  const handleTouchMove = (e: TouchEvent) => {
    const currentY = e.touches[0].clientY;
    const deltaY = startY - currentY;
    const { scrollTop, scrollHeight, clientHeight } = element;
    
    const isAtTop = scrollTop <= 0;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight;
    const isScrollingUp = deltaY < 0;
    const isScrollingDown = deltaY > 0;
    
    if (scrollHeight <= clientHeight) {
      e.preventDefault();
      return;
    }
    
    if ((isAtTop && isScrollingUp) || (isAtBottom && isScrollingDown)) {
      e.preventDefault();
    }
  };
  
  // Apply styles
  element.style.overscrollBehavior = 'contain';
  element.style.webkitOverflowScrolling = 'touch';
  
  // Add listeners
  element.addEventListener('touchstart', handleTouchStart, { passive: true });
  element.addEventListener('touchmove', handleTouchMove, { passive: false });
  
  // Return cleanup function
  return () => {
    element.removeEventListener('touchstart', handleTouchStart);
    element.removeEventListener('touchmove', handleTouchMove);
    element.style.overscrollBehavior = '';
    element.style.webkitOverflowScrolling = '';
  };
}

// ============================================
// HOOK: Apply fixes via ref
// ============================================

/**
 * Hook to apply iOS scroll fixes to any element via ref
 */
export function useIOSScrollFix<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  
  useEffect(() => {
    if (!ref.current) return;
    return applyIOSScrollFix(ref.current);
  }, []);
  
  return ref;
}

export default SheetScrollFix;
