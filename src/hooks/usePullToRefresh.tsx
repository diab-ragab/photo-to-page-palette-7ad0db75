import { useState, useRef, useCallback, useEffect } from 'react';

/** Trigger haptic feedback if the Vibration API is available */
function haptic(style: 'light' | 'medium' | 'heavy' = 'light') {
  if (!navigator.vibrate) return;
  const durations = { light: 10, medium: 20, heavy: 30 };
  navigator.vibrate(durations[style]);
}

interface UsePullToRefreshOptions {
  /** Callback to execute on pull refresh */
  onRefresh: () => Promise<void>;
  /** Minimum pull distance in px to trigger refresh (default: 80) */
  threshold?: number;
  /** Maximum pull indicator distance in px (default: 120) */
  maxPull?: number;
  /** Whether pull-to-refresh is enabled (default: true) */
  enabled?: boolean;
}

interface UsePullToRefreshReturn {
  /** Whether a refresh is currently in progress */
  isRefreshing: boolean;
  /** Current pull distance (0 when not pulling) */
  pullDistance: number;
  /** Props to spread on the scrollable container */
  containerProps: {
    ref: React.RefCallback<HTMLElement>;
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
  };
  /** The pull indicator component - render at top of container */
  PullIndicator: React.FC;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  maxPull = 120,
  enabled = true,
}: UsePullToRefreshOptions): UsePullToRefreshReturn {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const pulling = useRef(false);
  const passedThreshold = useRef(false);
  const containerRef = useRef<HTMLElement | null>(null);

  const setRef = useCallback((node: HTMLElement | null) => {
    containerRef.current = node;
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled || isRefreshing) return;
    // Only activate if scrolled to top
    const el = containerRef.current;
    const scrollTop = el ? el.scrollTop : window.scrollY;
    if (scrollTop <= 0) {
      startY.current = e.touches[0].clientY;
      pulling.current = true;
      passedThreshold.current = false;
    }
  }, [enabled, isRefreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling.current || !enabled || isRefreshing) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    if (diff > 0) {
      // Apply resistance curve
      const distance = Math.min(diff * 0.5, maxPull);
      // Haptic when crossing threshold
      if (distance >= threshold && !passedThreshold.current) {
        passedThreshold.current = true;
        haptic('medium');
      } else if (distance < threshold && passedThreshold.current) {
        passedThreshold.current = false;
        haptic('light');
      }
      setPullDistance(distance);
    } else {
      pulling.current = false;
      setPullDistance(0);
    }
  }, [enabled, isRefreshing, maxPull]);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current || !enabled) return;
    pulling.current = false;

    if (pullDistance >= threshold) {
      haptic('heavy');
      setIsRefreshing(true);
      setPullDistance(threshold * 0.5);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, threshold, onRefresh, enabled]);

  // Reset on unmount
  useEffect(() => {
    return () => {
      setPullDistance(0);
      pulling.current = false;
    };
  }, []);

  const progress = Math.min(pullDistance / threshold, 1);

  const PullIndicator: React.FC = () => {
    if (pullDistance === 0 && !isRefreshing) return null;

    return (
      <div
        className="flex items-center justify-center overflow-hidden transition-[height] duration-200 ease-out"
        style={{ height: isRefreshing ? 48 : pullDistance }}
      >
        <div
          className={`flex items-center gap-2 text-sm text-muted-foreground ${
            isRefreshing ? 'animate-pulse' : ''
          }`}
        >
          <svg
            className={`h-5 w-5 transition-transform duration-200 ${
              isRefreshing ? 'animate-spin' : ''
            }`}
            style={{
              transform: isRefreshing
                ? undefined
                : `rotate(${progress * 360}deg)`,
            }}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
          </svg>
          <span>
            {isRefreshing
              ? 'Refreshing...'
              : progress >= 1
              ? 'Release to refresh'
              : 'Pull to refresh'}
          </span>
        </div>
      </div>
    );
  };

  return {
    isRefreshing,
    pullDistance,
    containerProps: {
      ref: setRef,
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    PullIndicator,
  };
}
