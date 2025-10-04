import { useRef, useCallback } from 'react';

export interface GestureHandlers {
  onTap?: () => void;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onTwoFingerTap?: () => void;
}

export const useEnhancedGestures = (handlers: GestureHandlers) => {
  const touchStartRef = useRef<{
    x: number;
    y: number;
    time: number;
    touchCount: number;
  } | null>(null);
  const lastTapRef = useRef<number>(0);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    const touchCount = e.touches.length;

    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
      touchCount
    };

    // Handle long press
    if (touchCount === 1 && handlers.onLongPress) {
      longPressTimerRef.current = setTimeout(() => {
        handlers.onLongPress?.();
      }, 500); // 500ms for long press
    }

    // Handle two-finger tap
    if (touchCount === 2 && handlers.onTwoFingerTap) {
      handlers.onTwoFingerTap();
    }
  }, [handlers]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (!touchStartRef.current) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const deltaTime = Date.now() - touchStartRef.current.time;
    const touchCount = touchStartRef.current.touchCount;

    // Only process single-touch gestures for swipe and tap
    if (touchCount === 1) {
      const swipeThreshold = 50;
      const timeThreshold = 500;

      // Check for swipe
      if (Math.abs(deltaX) > swipeThreshold || Math.abs(deltaY) > swipeThreshold) {
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          // Horizontal swipe
          if (deltaX > 0) {
            handlers.onSwipeRight?.();
          } else {
            handlers.onSwipeLeft?.();
          }
        } else {
          // Vertical swipe
          if (deltaY > 0) {
            handlers.onSwipeDown?.();
          } else {
            handlers.onSwipeUp?.();
          }
        }
      } else if (deltaTime < 300 && Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
        // Quick tap - check for double tap
        const now = Date.now();
        if (now - lastTapRef.current < 300) {
          handlers.onDoubleTap?.();
          lastTapRef.current = 0;
        } else {
          lastTapRef.current = now;
          // Single tap with slight delay to detect double tap
          setTimeout(() => {
            if (lastTapRef.current === now) {
              handlers.onTap?.();
            }
          }, 300);
        }
      }
    }

    touchStartRef.current = null;
  }, [handlers]);

  const handleTouchCancel = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    touchStartRef.current = null;
  }, []);

  return {
    handleTouchStart,
    handleTouchEnd,
    handleTouchCancel
  };
};
