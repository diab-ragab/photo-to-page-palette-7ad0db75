import { useEffect, useRef } from 'react';

const isMobile = () =>
  typeof navigator !== 'undefined' &&
  /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) &&
  'vibrate' in navigator;

const COOLDOWN_MS = 80;

let lastVibration = 0;

function vibrate(pattern: number | number[]): void {
  if (!isMobile()) return;
  const now = Date.now();
  if (now - lastVibration < COOLDOWN_MS) return;
  lastVibration = now;
  try {
    navigator.vibrate(pattern);
  } catch {
    // silently fail
  }
}

/** Tap feedback – 20ms */
export const hapticTap = () => vibrate(20);

/** Page load – soft double pulse */
export const hapticPageLoad = () => vibrate([40, 30, 40]);

/** Success / reward – longer pattern */
export const hapticSuccess = () => vibrate([80, 40, 80]);

/**
 * Global hook: attach once at app root.
 * - Auto-vibrates on tap of any clickable element
 * - Vibrates on page load
 */
export function useHapticFeedback() {
  const mounted = useRef(false);

  useEffect(() => {
    if (!isMobile()) return;

    // Page-load vibration (only first mount)
    if (!mounted.current) {
      mounted.current = true;
      // Small delay so it feels intentional after paint
      setTimeout(hapticPageLoad, 300);
    }

    const CLICKABLE =
      'button, a, [role="button"], [role="tab"], [role="menuitem"], [role="link"], [role="checkbox"], [role="radio"], [role="switch"], input[type="submit"], input[type="button"], .cursor-pointer';

    const handlePointerDown = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      const target = e.target as Element | null;
      if (target?.closest(CLICKABLE)) {
        hapticTap();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown, { passive: true });

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, []);
}
