import { useCallback, useSyncExternalStore } from 'react';
import { BREAKPOINT_ORDER, BREAKPOINTS, mediaDown, mediaUp, type Breakpoint } from '@/shared/config/breakpoints';

/**
 * Subscribe to a CSS media query. SSR/test-safe (returns `false` when `matchMedia` is missing).
 * Uses `useSyncExternalStore` so all subscribers update in the same render (no tearing).
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    [query],
  );

  const getSnapshot = () =>
    typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(query).matches;

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

/** `true` when viewport width >= breakpoint. */
export const useBreakpointUp = (bp: Breakpoint) => useMediaQuery(mediaUp(bp));

/** `true` when viewport width < breakpoint. */
export const useBreakpointDown = (bp: Breakpoint) => useMediaQuery(mediaDown(bp));

/** Phones (< md). Matches the layout switch to bottom-nav + bottom-sheet dialogs. */
export const useIsMobile = () => useBreakpointDown('md');

/** Tablets (md → lg). Sidebar renders as an icon rail. */
export const useIsTablet = () => useMediaQuery(`${mediaUp('md')} and ${mediaDown('lg')}`);

/** Laptops and larger (>= lg). */
export const useIsDesktop = () => useBreakpointUp('lg');

/** Primary pointer is touch (phones/tablets) — useful to enlarge hit areas or disable hover-only UI. */
export const useIsTouch = () => useMediaQuery('(pointer: coarse)');

/** Returns the largest breakpoint currently matched, or `'base'` below `xs`. */
export function useCurrentBreakpoint(): Breakpoint | 'base' {
  const matches = BREAKPOINT_ORDER.map((bp) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- fixed-length, stable order
    return useMediaQuery(`(min-width: ${BREAKPOINTS[bp]}px)`);
  });
  for (let i = BREAKPOINT_ORDER.length - 1; i >= 0; i--) {
    const bp = BREAKPOINT_ORDER[i];
    if (matches[i] && bp) return bp;
  }
  return 'base';
}
