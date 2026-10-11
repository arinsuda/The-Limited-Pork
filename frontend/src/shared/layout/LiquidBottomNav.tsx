import React, { useCallback } from 'react';
import { NavLink } from 'react-router';
import type { LucideIcon } from 'lucide-react';

export interface LiquidNavItem {
  id: string;
  to?: string;
  end?: boolean;
  label: string;
  icon: LucideIcon;
  badge?: number;
  onClick?: () => void;
}

export interface LiquidBottomNavProps {
  items: LiquidNavItem[];
  activeId: string;
  onSelect?: (item: LiquidNavItem) => void;
  className?: string;
}

/**
 * LiquidBottomNav
 * 
 * High-performance mobile bottom navigation bar featuring:
 * 1. An elevated circular active indicator that overflows cleanly above the menu bar.
 * 2. Silky-smooth gradual fade & sink/emerge transition (ค่อยๆ เฟด และยุบ/ผุดตัวอย่างนุ่มนวล):
 *    - On deselect: Circle shrinks, sinks gently into the bar, and gradually fades away.
 *    - On select: Circle gracefully rises from the bar, expands, and gradually fades in like a water bubble surfacing.
 *    - Zero warping / zero snapping across tabs.
 * 3. 100% Shadow-free (Zero shadow around the circle: crisp, clean, minimalist).
 * 4. Zero hardcoded coordinates (100% dynamic responsive percentages).
 */

/* --------------------------------------------------------------------------
 * Motion tokens (single source of truth for every timing in this component).
 * Note: Tailwind v4 drives `-translate-*` / `scale-*` through the individual
 * CSS `translate` and `scale` properties, so those are what we transition.
 * Reduced-motion users are covered by the global rule in index.css.
 * ------------------------------------------------------------------------ */
const EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)'; // easeOutQuint – soft, long settle
const EASE_IN = 'cubic-bezier(0.55, 0, 1, 0.45)'; // easeInCirc – quick, quiet exit

const MOTION = {
  enter: 560, // circle rising / settling
  enterFade: 320,
  exit: 240, // circle sinking away
  exitFade: 180,
  handoff: 70, // new circle waits a beat so the old one can start leaving
  iconPop: 420,
  restIcon: 280,
  label: 300,
} as const;

const transition = (props: readonly string[], ms: number, ease: string, delay = 0) =>
  props.map((p) => `${p} ${ms}ms ${ease} ${delay}ms`).join(', ');

const MOVE = ['translate', 'scale'] as const;
export const LiquidBottomNav: React.FC<LiquidBottomNavProps> = ({
  items,
  activeId,
  onSelect,
  className = '',
}) => {
  const handleItemClick = useCallback(
    (item: LiquidNavItem) => {
      if (item.onClick) {
        item.onClick();
      }
      if (onSelect) {
        onSelect(item);
      }
    },
    [onSelect],
  );

  return (
    <nav
      aria-label="Mobile Navigation"
      role="tablist"
      className={`md:hidden fixed bottom-0 inset-x-0 z-40 h-(--bottom-nav-height) bg-white/95 backdrop-blur-md border-t border-slate-200/90 pb-safe overflow-visible select-none ${className}`}
    >
      <div className="flex items-stretch justify-around h-full px-1 relative">
        {items.map((item) => {
          const isActive = item.id === activeId;
          const Icon = item.icon;

          const content = (
            <>
              {/* ======================================================= */}
              {/* A. FLOATING CIRCLE (Raised above navbar, Zero Shadow)   */}
              {/* Gradual liquid fade & sink/emerge (ค่อยๆ เฟด นุ่มนวล)     */}
              {/* ======================================================= */}
              <div
                className={`absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none z-20 flex items-center justify-center transform-gpu will-change-[translate,scale,opacity] ${
                  isActive
                    ? 'opacity-100 -translate-y-5.5 scale-100'
                    : 'opacity-0 translate-y-2 scale-60 pointer-events-none'
                }`}
                style={{
                  transition: isActive
                    ? `${transition(MOVE, MOTION.enter, EASE_OUT, MOTION.handoff)}, ${transition(['opacity'], MOTION.enterFade, EASE_OUT, MOTION.handoff)}`
                    : `${transition(MOVE, MOTION.exit, EASE_IN)}, ${transition(['opacity'], MOTION.exitFade, EASE_IN)}`,
                }}
                aria-hidden="true"
              >
                <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-orange-600 via-orange-500 to-amber-500 ring-4 ring-white shadow-none flex items-center justify-center text-white relative">
                  {/* Subtle glossy liquid specular highlight */}
                  <span className="absolute inset-x-2.5 top-1 h-3 rounded-full from-white/35 to-transparent pointer-events-none" />

                  {/* Active white icon */}
                  <Icon
                    className={`w-6 h-6 text-white ${isActive ? 'scale-100' : 'scale-75'}`}
                    style={{
                      transition: isActive
                        ? transition(['scale'], MOTION.iconPop, EASE_OUT, MOTION.handoff * 2)
                        : transition(['scale'], MOTION.exit, EASE_IN),
                    }}
                  />
                </div>
              </div>

              {/* ======================================================= */}
              {/* B. RESTING INACTIVE ICON (Inside navbar body)          */}
              {/* Leaves instantly when activated; returns only after the */}
              {/* circle has sunk, so the two never visually overlap.     */}
              {/* ======================================================= */}
              <div
                className={`h-7 w-12 flex items-center justify-center rounded-full ${
                  isActive
                    ? 'opacity-0 scale-60 pointer-events-none'
                    : 'text-slate-400 group-hover:text-slate-700 opacity-100 scale-100'
                }`}
                style={{
                  transition: isActive
                    ? transition([...MOVE, 'opacity'], MOTION.exitFade, EASE_IN)
                    : `${transition([...MOVE, 'opacity'], MOTION.restIcon, EASE_OUT, MOTION.exit / 2)}, ${transition(['color'], MOTION.label, EASE_OUT)}`,
                }}
              >
                <Icon className="h-5 w-5" />
              </div>

              {/* ======================================================= */}
              {/* C. LABEL BELOW ICON                                    */}
              {/* ======================================================= */}
              <span
                className={`text-[10px] leading-tight truncate max-w-full px-1 text-center ${
                  isActive
                    ? 'font-bold text-orange-600 translate-y-0.5'
                    : 'font-medium text-slate-500 group-hover:text-slate-700 translate-y-0'
                }`}
                style={{ transition: transition(['color', 'translate'], MOTION.label, EASE_OUT) }}
              >
                {item.label}
              </span>
            </>
          );

          if (item.to) {
            return (
              <NavLink
                key={item.id}
                to={item.to}
                end={item.end}
                role="tab"
                aria-selected={isActive}
                aria-label={item.label}
                onClick={() => handleItemClick(item)}
                className="group flex flex-1 flex-col items-center justify-center py-1 transition-transform duration-150 ease-out relative min-w-0 cursor-pointer active:scale-95"
              >
                {content}  
              </NavLink>
            );
          }

          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={item.label}
              onClick={() => handleItemClick(item)}
              className="group flex flex-1 flex-col items-center justify-center py-1 transition-transform duration-150 ease-out relative min-w-0 cursor-pointer active:scale-95 bg-transparent border-0"
            >
              {content}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
