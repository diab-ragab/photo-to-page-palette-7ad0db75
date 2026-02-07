import { useState, useRef, useCallback, useEffect } from 'react';

/** Trigger haptic feedback - supports both Vibration API (Android) and iOS haptics */
function haptic(style: 'light' | 'medium' | 'heavy' = 'light') {
  if (navigator.vibrate) {
    const durations = { light: 10, medium: 20, heavy: 30 };
    navigator.vibrate(durations[style]);
  }
}

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  maxPull?: number;
  enabled?: boolean;
}

interface UsePullToRefreshReturn {
  isRefreshing: boolean;
  pullDistance: number;
  containerProps: {
    ref: React.RefCallback<HTMLElement>;
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
  };
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
  const [showSuccess, setShowSuccess] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);
  const passedThreshold = useRef(false);
  const containerRef = useRef<HTMLElement | null>(null);

  const setRef = useCallback((node: HTMLElement | null) => {
    containerRef.current = node;
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled || isRefreshing) return;
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
      const distance = Math.min(diff * 0.5, maxPull);
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
  }, [enabled, isRefreshing, maxPull, threshold]);

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
        setShowSuccess(true);
        setPullDistance(0);
        setTimeout(() => setShowSuccess(false), 1200);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, threshold, onRefresh, enabled]);

  useEffect(() => {
    return () => {
      setPullDistance(0);
      pulling.current = false;
    };
  }, []);

  const progress = Math.min(pullDistance / threshold, 1);
  const ready = progress >= 1;

  const PullIndicator: React.FC = () => {
    if (pullDistance === 0 && !isRefreshing && !showSuccess) return null;

    return (
      <div
        className="flex flex-col items-center justify-center overflow-hidden"
        style={{
          height: showSuccess ? 48 : isRefreshing ? 48 : pullDistance,
          transition: pulling.current ? 'none' : 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Success checkmark after refresh */}
        {showSuccess ? (
          <div className="flex items-center gap-2 text-sm font-medium text-primary animate-scale-in">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
            <span>Updated!</span>
          </div>
        ) : (
          <>
            {/* Animated pull indicator */}
            <div
              className="relative flex items-center justify-center"
              style={{
                transform: `scale(${0.6 + progress * 0.4})`,
                transition: pulling.current ? 'none' : 'transform 0.3s ease-out',
              }}
            >
              {/* Outer ring that fills as you pull */}
              <svg className="h-8 w-8" viewBox="0 0 36 36">
                {/* Background circle */}
                <circle
                  cx="18" cy="18" r="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-muted-foreground/20"
                />
                {/* Progress arc */}
                <circle
                  cx="18" cy="18" r="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  className={ready ? 'text-primary' : 'text-muted-foreground/60'}
                  style={{
                    strokeDasharray: `${progress * 88} 88`,
                    transform: 'rotate(-90deg)',
                    transformOrigin: 'center',
                    transition: isRefreshing ? 'none' : 'stroke-dasharray 0.1s ease-out',
                    animation: isRefreshing ? 'spin 0.8s linear infinite' : 'none',
                  }}
                />
                {/* Arrow icon in center */}
                {!isRefreshing && (
                  <g
                    style={{
                      transform: `rotate(${progress * 360}deg)`,
                      transformOrigin: 'center',
                      transition: pulling.current ? 'none' : 'transform 0.2s ease-out',
                    }}
                  >
                    <path
                      d="M18 12v8M15 17l3 3 3-3"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={ready ? 'text-primary' : 'text-muted-foreground'}
                      style={{
                        transform: ready ? 'rotate(180deg)' : 'none',
                        transformOrigin: 'center',
                        transition: 'transform 0.2s ease-out',
                      }}
                    />
                  </g>
                )}
              </svg>
            </div>

            {/* Text label */}
            <span
              className={`mt-1 text-xs font-medium transition-all duration-200 ${
                ready
                  ? 'text-primary'
                  : isRefreshing
                  ? 'text-muted-foreground animate-pulse'
                  : 'text-muted-foreground/60'
              }`}
              style={{
                opacity: progress > 0.3 || isRefreshing ? 1 : 0,
                transform: `translateY(${progress > 0.3 || isRefreshing ? 0 : 4}px)`,
                transition: 'opacity 0.2s, transform 0.2s',
              }}
            >
              {isRefreshing ? 'Refreshing…' : ready ? 'Release ↑' : 'Pull down'}
            </span>
          </>
        )}
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
