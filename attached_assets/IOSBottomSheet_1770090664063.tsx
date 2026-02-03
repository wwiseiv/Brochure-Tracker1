/**
 * iOS-Optimized Bottom Sheet Component
 * =====================================
 * 
 * A bottom sheet component specifically designed to handle iOS Safari
 * scroll issues. Includes proper scroll containment, body scroll locking,
 * and smooth dismiss gestures.
 * 
 * INSTALLATION:
 *   Copy to: client/src/components/IOSBottomSheet.tsx
 * 
 * USAGE:
 *   <IOSBottomSheet open={isOpen} onOpenChange={setIsOpen}>
 *     <IOSBottomSheetContent>
 *       {scrollable content}
 *     </IOSBottomSheetContent>
 *   </IOSBottomSheet>
 */

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
  forwardRef,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import {
  useBodyScrollLock,
  useBottomSheetScroll,
  isIOS,
  isIOSSafari,
} from '@/hooks/use-ios-scroll-lock';

// ============================================
// CONTEXT
// ============================================

interface BottomSheetContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snapPoints?: number[];
  activeSnapPoint: number;
  setActiveSnapPoint: (point: number) => void;
}

const BottomSheetContext = createContext<BottomSheetContextValue | null>(null);

function useBottomSheetContext() {
  const context = useContext(BottomSheetContext);
  if (!context) {
    throw new Error('BottomSheet components must be used within IOSBottomSheet');
  }
  return context;
}

// ============================================
// ROOT COMPONENT
// ============================================

interface IOSBottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Snap points as percentages (e.g., [25, 50, 90]) */
  snapPoints?: number[];
  /** Default snap point index */
  defaultSnapPoint?: number;
  /** Allow dismiss by dragging down */
  dismissible?: boolean;
  children: React.ReactNode;
}

export function IOSBottomSheet({
  open,
  onOpenChange,
  snapPoints = [90],
  defaultSnapPoint = 0,
  dismissible = true,
  children,
}: IOSBottomSheetProps) {
  const [activeSnapPoint, setActiveSnapPoint] = useState(defaultSnapPoint);
  
  // Reset snap point when closed
  useEffect(() => {
    if (!open) {
      setActiveSnapPoint(defaultSnapPoint);
    }
  }, [open, defaultSnapPoint]);
  
  const contextValue: BottomSheetContextValue = {
    open,
    onOpenChange,
    snapPoints,
    activeSnapPoint,
    setActiveSnapPoint,
  };
  
  return (
    <BottomSheetContext.Provider value={contextValue}>
      {children}
    </BottomSheetContext.Provider>
  );
}

// ============================================
// PORTAL COMPONENT
// ============================================

interface IOSBottomSheetPortalProps {
  children: React.ReactNode;
  container?: HTMLElement;
}

export function IOSBottomSheetPortal({
  children,
  container,
}: IOSBottomSheetPortalProps) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) return null;
  
  return createPortal(
    children,
    container || document.body
  );
}

// ============================================
// OVERLAY COMPONENT
// ============================================

interface IOSBottomSheetOverlayProps {
  className?: string;
}

export const IOSBottomSheetOverlay = forwardRef<
  HTMLDivElement,
  IOSBottomSheetOverlayProps
>(({ className }, ref) => {
  const { open, onOpenChange } = useBottomSheetContext();
  
  if (!open) return null;
  
  return (
    <div
      ref={ref}
      className={cn(
        'fixed inset-0 z-50 bg-black/50',
        'animate-in fade-in-0',
        'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
        className
      )}
      onClick={() => onOpenChange(false)}
      data-state={open ? 'open' : 'closed'}
    />
  );
});

IOSBottomSheetOverlay.displayName = 'IOSBottomSheetOverlay';

// ============================================
// CONTENT COMPONENT (MAIN)
// ============================================

interface IOSBottomSheetContentProps {
  className?: string;
  children: React.ReactNode;
  /** Show drag handle */
  showHandle?: boolean;
  /** Called when dismiss gesture is triggered */
  onDismiss?: () => void;
}

export const IOSBottomSheetContent = forwardRef<
  HTMLDivElement,
  IOSBottomSheetContentProps
>(({ className, children, showHandle = true, onDismiss }, ref) => {
  const { open, onOpenChange, snapPoints, activeSnapPoint } = useBottomSheetContext();
  
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(0);
  const currentHeight = useRef(0);
  
  // Get current snap point height
  const snapHeight = snapPoints?.[activeSnapPoint] ?? 90;
  
  // Lock body scroll when open
  useBodyScrollLock({ isLocked: open });
  
  // Handle drag to dismiss
  const handleDismiss = useCallback(() => {
    onDismiss?.();
    onOpenChange(false);
  }, [onDismiss, onOpenChange]);
  
  // Drag handlers for the handle area
  useEffect(() => {
    const handle = dragRef.current;
    const container = containerRef.current;
    if (!handle || !container || !open) return;
    
    const handleTouchStart = (e: TouchEvent) => {
      isDragging.current = true;
      startY.current = e.touches[0].clientY;
      startHeight.current = container.getBoundingClientRect().height;
      currentHeight.current = startHeight.current;
      
      // Remove transition during drag for smooth feel
      container.style.transition = 'none';
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging.current) return;
      
      const currentY = e.touches[0].clientY;
      const deltaY = currentY - startY.current;
      
      // Only allow dragging down (positive deltaY)
      if (deltaY > 0) {
        const newHeight = startHeight.current - deltaY;
        const minHeight = window.innerHeight * 0.1; // 10% minimum
        
        currentHeight.current = Math.max(minHeight, newHeight);
        container.style.height = `${currentHeight.current}px`;
        
        // Add visual feedback (opacity)
        const progress = deltaY / (startHeight.current * 0.5);
        container.style.opacity = String(Math.max(0.5, 1 - progress * 0.5));
      }
      
      e.preventDefault();
    };
    
    const handleTouchEnd = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      
      // Restore transition
      container.style.transition = '';
      container.style.opacity = '';
      
      // Check if should dismiss
      const dismissThreshold = startHeight.current * 0.3;
      const dragDistance = startHeight.current - currentHeight.current;
      
      if (dragDistance > dismissThreshold) {
        handleDismiss();
      } else {
        // Snap back
        container.style.height = '';
      }
    };
    
    handle.addEventListener('touchstart', handleTouchStart, { passive: true });
    handle.addEventListener('touchmove', handleTouchMove, { passive: false });
    handle.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    return () => {
      handle.removeEventListener('touchstart', handleTouchStart);
      handle.removeEventListener('touchmove', handleTouchMove);
      handle.removeEventListener('touchend', handleTouchEnd);
    };
  }, [open, handleDismiss]);
  
  if (!open) return null;
  
  return (
    <IOSBottomSheetPortal>
      <IOSBottomSheetOverlay />
      <div
        ref={containerRef}
        className={cn(
          // Base styles
          'fixed inset-x-0 bottom-0 z-50',
          'bg-background rounded-t-2xl shadow-xl',
          'flex flex-col',
          
          // Animation
          'animate-in slide-in-from-bottom',
          'duration-300 ease-out',
          
          // iOS-specific scroll fixes
          'ios-bottom-sheet',
          
          className
        )}
        style={{
          height: `${snapHeight}vh`,
          maxHeight: `calc(100vh - env(safe-area-inset-top) - 20px)`,
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
        data-state={open ? 'open' : 'closed'}
      >
        {/* Drag handle */}
        {showHandle && (
          <div
            ref={dragRef}
            className={cn(
              'flex-shrink-0 py-4 cursor-grab active:cursor-grabbing',
              'touch-none select-none'
            )}
          >
            <div className="mx-auto w-12 h-1.5 rounded-full bg-muted-foreground/30" />
          </div>
        )}
        
        {/* Content wrapper */}
        <div
          ref={ref}
          className={cn(
            'flex-1 overflow-hidden',
            'flex flex-col'
          )}
        >
          {children}
        </div>
      </div>
    </IOSBottomSheetPortal>
  );
});

IOSBottomSheetContent.displayName = 'IOSBottomSheetContent';

// ============================================
// SCROLLABLE AREA COMPONENT
// ============================================

interface IOSBottomSheetScrollAreaProps {
  className?: string;
  children: React.ReactNode;
}

export const IOSBottomSheetScrollArea = forwardRef<
  HTMLDivElement,
  IOSBottomSheetScrollAreaProps
>(({ className, children }, forwardedRef) => {
  const { open, onOpenChange } = useBottomSheetContext();
  
  // Use the scroll hook for iOS handling
  const { scrollRef } = useBottomSheetScroll<HTMLDivElement>({
    isOpen: open,
    onScrollPastTop: () => {
      // Optional: dismiss on overscroll
      // onOpenChange(false);
    },
    dismissThreshold: 80,
  });
  
  // Merge refs
  const ref = useCallback((node: HTMLDivElement) => {
    (scrollRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    if (typeof forwardedRef === 'function') {
      forwardedRef(node);
    } else if (forwardedRef) {
      forwardedRef.current = node;
    }
  }, [scrollRef, forwardedRef]);
  
  return (
    <div
      ref={ref}
      className={cn(
        // Scrollable container
        'flex-1 overflow-y-auto overflow-x-hidden',
        
        // iOS scroll fixes
        'overscroll-contain',
        '-webkit-overflow-scrolling-touch',
        'ios-scroll-container',
        
        // Prevent text selection during scroll
        'select-none md:select-auto',
        
        className
      )}
      style={{
        // Ensure proper scroll containment
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'contain',
        touchAction: 'pan-y',
      }}
    >
      {children}
    </div>
  );
});

IOSBottomSheetScrollArea.displayName = 'IOSBottomSheetScrollArea';

// ============================================
// HEADER COMPONENT
// ============================================

interface IOSBottomSheetHeaderProps {
  className?: string;
  children: React.ReactNode;
}

export const IOSBottomSheetHeader = forwardRef<
  HTMLDivElement,
  IOSBottomSheetHeaderProps
>(({ className, children }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        'flex-shrink-0 px-4 pb-4',
        'border-b border-border',
        className
      )}
    >
      {children}
    </div>
  );
});

IOSBottomSheetHeader.displayName = 'IOSBottomSheetHeader';

// ============================================
// FOOTER COMPONENT
// ============================================

interface IOSBottomSheetFooterProps {
  className?: string;
  children: React.ReactNode;
}

export const IOSBottomSheetFooter = forwardRef<
  HTMLDivElement,
  IOSBottomSheetFooterProps
>(({ className, children }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        'flex-shrink-0 px-4 pt-4',
        'border-t border-border',
        'bg-background',
        className
      )}
      style={{
        paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
      }}
    >
      {children}
    </div>
  );
});

IOSBottomSheetFooter.displayName = 'IOSBottomSheetFooter';

// ============================================
// TITLE & DESCRIPTION
// ============================================

interface IOSBottomSheetTitleProps {
  className?: string;
  children: React.ReactNode;
}

export const IOSBottomSheetTitle = forwardRef<
  HTMLHeadingElement,
  IOSBottomSheetTitleProps
>(({ className, children }, ref) => {
  return (
    <h2
      ref={ref}
      className={cn('text-lg font-semibold', className)}
    >
      {children}
    </h2>
  );
});

IOSBottomSheetTitle.displayName = 'IOSBottomSheetTitle';

interface IOSBottomSheetDescriptionProps {
  className?: string;
  children: React.ReactNode;
}

export const IOSBottomSheetDescription = forwardRef<
  HTMLParagraphElement,
  IOSBottomSheetDescriptionProps
>(({ className, children }, ref) => {
  return (
    <p
      ref={ref}
      className={cn('text-sm text-muted-foreground mt-1', className)}
    >
      {children}
    </p>
  );
});

IOSBottomSheetDescription.displayName = 'IOSBottomSheetDescription';

// ============================================
// CLOSE BUTTON
// ============================================

interface IOSBottomSheetCloseProps {
  className?: string;
  children?: React.ReactNode;
}

export const IOSBottomSheetClose = forwardRef<
  HTMLButtonElement,
  IOSBottomSheetCloseProps
>(({ className, children }, ref) => {
  const { onOpenChange } = useBottomSheetContext();
  
  return (
    <button
      ref={ref}
      onClick={() => onOpenChange(false)}
      className={cn(
        'absolute right-4 top-4',
        'rounded-full p-2',
        'hover:bg-muted',
        'focus:outline-none focus:ring-2 focus:ring-ring',
        className
      )}
    >
      {children || (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      )}
    </button>
  );
});

IOSBottomSheetClose.displayName = 'IOSBottomSheetClose';

// ============================================
// EXPORTS
// ============================================

export {
  IOSBottomSheet as Root,
  IOSBottomSheetPortal as Portal,
  IOSBottomSheetOverlay as Overlay,
  IOSBottomSheetContent as Content,
  IOSBottomSheetScrollArea as ScrollArea,
  IOSBottomSheetHeader as Header,
  IOSBottomSheetFooter as Footer,
  IOSBottomSheetTitle as Title,
  IOSBottomSheetDescription as Description,
  IOSBottomSheetClose as Close,
};

export default IOSBottomSheet;
