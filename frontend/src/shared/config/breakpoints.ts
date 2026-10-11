/**
 * Responsive breakpoints — mirrors Tailwind v4 defaults plus the custom `xs` / `3xl`
 * declared in `src/index.css` (@theme). Keep both in sync; JS code must import from
 * here instead of hardcoding pixel values.
 */
export const BREAKPOINTS = {
  xs: 416, // 26rem  — large phones
  sm: 640, // 40rem  — small tablets / landscape phones
  md: 768, // 48rem  — tablets (sidebar rail appears)
  lg: 1024, // 64rem — laptops (full sidebar appears)
  xl: 1280, // 80rem
  '2xl': 1536, // 96rem
  '3xl': 1920, // 120rem — ultra-wide
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

/** Ordered from smallest to largest; useful for "current breakpoint" lookups. */
export const BREAKPOINT_ORDER: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'];

/** Media query string for `min-width` at a given breakpoint. */
export const mediaUp = (bp: Breakpoint) => `(min-width: ${BREAKPOINTS[bp]}px)`;

/** Media query string for "strictly below" a given breakpoint. */
export const mediaDown = (bp: Breakpoint) => `(max-width: ${BREAKPOINTS[bp] - 0.02}px)`;
