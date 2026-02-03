/**
 * iOS-Optimized Bottom Sheet Component
 * =====================================
 * 
 * A bottom sheet component specifically designed to handle iOS Safari
 * scroll issues. Includes proper scroll containment, body scroll locking,
 * and smooth dismiss gestures.
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
import { X } from 'lucide-react';
import {
  useBodyScrollLock,
  useBottomSheetScroll,
  isIOS,
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
  snapPoints?: number[];
  defaultSnapPoint?: number;
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
  showHandle?: boolean;
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
  
  const snapHeight = snapPoints?.[activeSnapPoint] ?? 90;
  
  useBodyScrollLock({ isLocked: open });
  
  const handleDismiss = useCallback(() => {
    onDismiss?.();
    onOpenChange(false);
  }, [onDismiss, onOpenChange]);
  
  useEffect(() => {
    const handle = dragRef.current;
    const container = containerRef.current;
    if (!handle || !container || !open) return;
    
    const handleTouchStart = (e: TouchEvent) => {
      isDragging.current = true;
      startY.current = e.touches[0].clientY;
      startHeight.current = container.getBoundingClientRect().height;
      currentHeight.current = startHeight.current;
      
      container.style.transition = 'none';
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging.current) return;
      
      const currentY = e.touches[0].clientY;
      const deltaY = currentY - startY.current;
      
      if (deltaY > 0) {
        const newHeight = startHeight.current - deltaY;
        const minHeight = window.innerHeight * 0.1;
        
        currentHeight.current = Math.max(minHeight, newHeight);
        container.style.height = `${currentHeight.current}px`;
        
        const progress = deltaY / (startHeight.current * 0.5);
        container.style.opacity = String(Math.max(0.5, 1 - progress * 0.5));
      }
      
      e.preventDefault();
    };
    
    const handleTouchEnd = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      
      container.style.transition = '';
      container.style.opacity = '';
      
      const dismissThreshold = startHeight.current * 0.3;
      const dragDistance = startHeight.current - currentHeight.current;
      
      if (dragDistance > dismissThreshold) {
        handleDismiss();
      } else {
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
          'fixed inset-x-0 bottom-0 z-50',
          'bg-background rounded-t-2xl shadow-xl',
          'flex flex-col',
          'animate-in slide-in-from-bottom',
          'duration-300 ease-out',
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
  const { open } = useBottomSheetContext();
  
  const { scrollRef } = useBottomSheetScroll<HTMLDivElement>({
    isOpen: open,
    dismissThreshold: 80,
  });
  
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
        'flex-1 overflow-y-auto overflow-x-hidden',
        'overscroll-contain',
        'ios-scroll-container',
        'select-none md:select-auto',
        className
      )}
      style={{
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
      className={cn('text-sm text-muted-foreground', className)}
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
}

export const IOSBottomSheetClose = forwardRef<
  HTMLButtonElement,
  IOSBottomSheetCloseProps
>(({ className }, ref) => {
  const { onOpenChange } = useBottomSheetContext();
  
  return (
    <button
      ref={ref}
      onClick={() => onOpenChange(false)}
      className={cn(
        'absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background',
        'transition-opacity hover:opacity-100',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        'disabled:pointer-events-none',
        className
      )}
      data-testid="button-close-bottom-sheet"
    >
      <X className="h-4 w-4" />
      <span className="sr-only">Close</span>
    </button>
  );
});

IOSBottomSheetClose.displayName = 'IOSBottomSheetClose';

export default IOSBottomSheet;
