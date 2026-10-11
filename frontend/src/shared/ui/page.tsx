import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import type { LucideIcon } from 'lucide-react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';

/* =============================================================================
 * Page — vertical rhythm wrapper for every routed page.
 * ========================================================================== */
export function Page({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex min-w-0 flex-col gap-4 sm:gap-6', className)} {...props} />;
}

/* =============================================================================
 * PageHeader — icon + title + subtitle on the left, actions on the right.
 * Stacks on phones, inlines on sm+. Optional back button for detail pages.
 * ========================================================================== */
export interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  description?: React.ReactNode;
  icon?: LucideIcon;
  /** Right-side actions (buttons, ResponsiveActions…). */
  actions?: React.ReactNode;
  /** Badges / meta rendered under the title (status, code, version…). */
  meta?: React.ReactNode;
  badge?: React.ReactNode;
  /** Show a back button. `true` = history back; string = navigate to path. */
  back?: boolean | string;
  /** Override back label (defaults to common.back). */
  backLabel?: string;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  description,
  icon: Icon,
  actions,
  meta,
  badge,
  back,
  backLabel,
  className,
}: PageHeaderProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const sub = subtitle ?? description;
  const m = meta ?? badge;

  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4', className)}>
      <div className="flex min-w-0 items-start gap-2 sm:gap-3">
        {back && (
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            aria-label={backLabel ?? t('common.back')}
            title={backLabel ?? t('common.back')}
            onClick={() => (typeof back === 'string' ? navigate(back) : navigate(-1))}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            {Icon && <Icon className="h-5 w-5 shrink-0 text-orange-600 sm:h-6 sm:w-6" />}
            <span className="min-w-0 break-words">{title}</span>
          </h1>
          {sub && <div className="mt-1 text-xs text-slate-500 sm:text-sm">{sub}</div>}
          {m && <div className="mt-2 flex flex-wrap items-center gap-1.5">{m}</div>}
        </div>
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2 max-sm:w-full max-sm:[&>button]:flex-1">
          {actions}
        </div>
      )}
    </div>
  );
}

/* =============================================================================
 * ResponsiveGrid — semantic column presets so pages never hand-roll breakpoints.
 * ========================================================================== */
const gridVariants = cva('grid min-w-0', {
  variants: {
    preset: {
      /** Content cards (recipes, trials). 1 → 2 → 3 → 4 columns. */
      cards: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4',
      /** Smaller tiles. 1 → 2 → 3 → 4 → 5. */
      dense: 'grid-cols-1 xs:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5',
      /** KPI / stat tiles. 2 → 3 → 4 → 6. */
      stats: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6',
      /** Two equal columns from md. */
      halves: 'grid-cols-1 md:grid-cols-2',
      /** Three equal columns from lg. */
      thirds: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
      /** Main + aside (detail pages): stacked → 2/3 + 1/3 from lg. */
      'main-aside': 'grid-cols-1 lg:grid-cols-3 [&>*:first-child]:lg:col-span-2',
      /** Aside + main: 1/3 + 2/3 from lg. */
      'aside-main': 'grid-cols-1 lg:grid-cols-3 [&>*:last-child]:lg:col-span-2',
      /** Form fields: 1 → 2 columns from sm. */
      form: 'grid-cols-1 sm:grid-cols-2',
      /** Form fields: 1 → 2 → 3 columns. */
      'form-3': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
      /** Auto-fit tiles with a 16rem minimum — fluid, no breakpoints. */
      auto: 'grid-cols-[repeat(auto-fill,minmax(min(100%,16rem),1fr))]',
    },
    gap: {
      sm: 'gap-2 sm:gap-3',
      md: 'gap-3 sm:gap-4 lg:gap-5',
      lg: 'gap-4 sm:gap-6',
    },
  },
  defaultVariants: { preset: 'cards', gap: 'md' },
});

export interface ResponsiveGridProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof gridVariants> {}

export function ResponsiveGrid({ preset, gap, className, ...props }: ResponsiveGridProps) {
  return <div className={cn(gridVariants({ preset, gap }), className)} {...props} />;
}

/* =============================================================================
 * Toolbar / FilterBar — search + filters; stacks on phones, row on md+.
 * ========================================================================== */
export function Toolbar({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-2xs md:flex-row md:items-center md:justify-between',
        className,
      )}
      {...props}
    />
  );
}

/* =============================================================================
 * ChipGroup / Chip — horizontally swipeable filter pills (never wrap off-screen).
 * ========================================================================== */
export function ChipGroup({
  label,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { label?: React.ReactNode }) {
  return (
    <div
      role="group"
      className={cn(
        // bleed to the screen edge on phones so the swipe affordance is obvious
        'flex min-w-0 items-center gap-1.5 scroll-x-touch scrollbar-none max-md:-mx-(--page-gutter) max-md:px-(--page-gutter) pb-0.5',
        className,
      )}
      {...props}
    >
      {label && <span className="mr-1 shrink-0 whitespace-nowrap text-xs font-medium text-slate-400">{label}</span>}
      {children}
    </div>
  );
}

const chipVariants = cva(
  'touch-target inline-flex shrink-0 snap-start items-center gap-1 whitespace-nowrap border text-xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500',
  {
    variants: {
      shape: {
        pill: 'rounded-full px-3 py-1',
        tab: 'rounded-lg px-3 py-1.5 border-transparent',
      },
      active: { true: '', false: '' },
      tone: { primary: '', dark: '' },
    },
    compoundVariants: [
      { active: true, tone: 'primary', class: 'bg-orange-600 text-white border-orange-600 font-semibold shadow-xs' },
      { active: true, tone: 'dark', class: 'bg-slate-800 text-white border-slate-800 shadow-xs' },
      { active: false, shape: 'pill', class: 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50' },
      { active: false, shape: 'tab', class: 'text-slate-600 hover:bg-slate-100' },
    ],
    defaultVariants: { shape: 'pill', active: false, tone: 'primary' },
  },
);

export interface ChipProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'>,
    Omit<VariantProps<typeof chipVariants>, 'active'> {
  active?: boolean;
}

export function Chip({ className, shape, tone, active = false, ...props }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(chipVariants({ shape, tone, active }), className)}
      {...props}
    />
  );
}

/* =============================================================================
 * EmptyState
 * ========================================================================== */
export interface EmptyStateProps {
  icon?: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center sm:px-8 sm:py-16',
        className,
      )}
    >
      {Icon && (
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-orange-600">
          <Icon className="h-6 w-6" />
        </div>
      )}
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {description && <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500 sm:text-sm">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

/* =============================================================================
 * StickyActionBar — primary actions pinned above the mobile bottom nav on phones,
 * rendered inline (static) from md up. Use for detail-page / long-form CTAs.
 * ========================================================================== */
export function StickyActionBar({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <>
      {/* spacer so content isn't hidden behind the fixed bar on phones */}
      <div aria-hidden className="h-16 md:hidden" />
      <div
        className={cn(
          'fixed inset-x-0 z-30 flex items-center gap-2 border-t border-slate-200 bg-white/95 px-(--page-gutter) py-2.5 shadow-[0_-4px_12px_-6px_rgb(0_0_0/0.08)] backdrop-blur-md',
          'bottom-[calc(var(--bottom-nav-height)+var(--safe-bottom))] [&>*]:flex-1',
          'md:static md:z-auto md:justify-end md:border-0 md:bg-transparent md:p-0 md:shadow-none md:backdrop-blur-none md:[&>*]:flex-none',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </>
  );
}

/* =============================================================================
 * SectionCard header helper — title + optional actions that wrap nicely.
 * ========================================================================== */
export function SectionHeader({
  title,
  icon: Icon,
  description,
  actions,
  className,
}: {
  title: React.ReactNode;
  icon?: LucideIcon;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-2', className)}>
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 sm:text-base">
          {Icon && <Icon className="h-4 w-4 shrink-0 text-orange-600" />}
          <span className="min-w-0 break-words">{title}</span>
        </h2>
        {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* =============================================================================
 * DescriptionList — label/value pairs. Stacks on phones, 2-col grid from sm.
 * ========================================================================== */
export function DescriptionList({
  items,
  columns = 2,
  className,
}: {
  items: { key: string; label: React.ReactNode; value: React.ReactNode; fullWidth?: boolean }[];
  columns?: 1 | 2 | 3;
  className?: string;
}) {
  const cols = { 1: '', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-2 lg:grid-cols-3' }[columns];
  return (
    <dl className={cn('grid grid-cols-1 gap-x-4 gap-y-3', cols, className)}>
      {items.map((it) => (
        <div key={it.key} className={cn('min-w-0', it.fullWidth && 'sm:col-span-full')}>
          <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{it.label}</dt>
          <dd className="mt-0.5 break-words text-sm text-slate-800">{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}
