import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { MoreHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/utils';
import { Button, type ButtonProps } from '@/shared/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { useBreakpointUp } from '@/shared/hooks/use-media-query';
import type { Breakpoint } from '@/shared/config/breakpoints';

export interface ResponsiveAction {
  key: string;
  label: React.ReactNode;
  icon?: LucideIcon;
  onClick?: () => void;
  variant?: ButtonProps['variant'];
  /** Visually flags destructive actions (red) inside the overflow menu. */
  destructive?: boolean;
  disabled?: boolean;
  /** Hide entirely (e.g. missing permission). */
  hidden?: boolean;
  /** Keep visible as a button even on small screens (the primary CTA). */
  pinned?: boolean;
  /** Priority alias (high = pinned). */
  priority?: 'high' | 'medium' | 'low';
  /** Optional custom node rendered instead of a Button on wide screens (e.g. a wrapped dialog trigger). */
  render?: React.ReactNode;
  className?: string;
}

export type ResponsiveActionItem = ResponsiveAction;

interface ResponsiveActionsProps {
  actions?: ResponsiveAction[];
  items?: ResponsiveAction[];
  /** Breakpoint at which all actions render inline. Below it, non-pinned actions collapse into a "more" menu. */
  collapseBelow?: Breakpoint;
  collapseAt?: Breakpoint | string;
  size?: ButtonProps['size'];
  className?: string;
  /** Make pinned buttons stretch to fill the row on phones. */
  stretchOnMobile?: boolean;
}

/**
 * Renders a row of action buttons that gracefully collapses into an overflow ("⋯") menu
 * on narrow viewports, keeping only `pinned` actions as visible buttons.
 */
export function ResponsiveActions({
  actions,
  items,
  collapseBelow,
  collapseAt,
  size = 'sm',
  className,
  stretchOnMobile = false,
}: ResponsiveActionsProps) {
  const { t } = useTranslation();
  const bp = (collapseBelow ?? (collapseAt as Breakpoint) ?? 'md');
  const isWide = useBreakpointUp(bp);
  const actionList = (actions ?? items ?? []).map((a) => ({
    ...a,
    pinned: a.pinned ?? a.priority === 'high',
  }));
  const visible = actionList.filter((a) => !a.hidden);
  if (visible.length === 0) return null;

  const inline = isWide ? visible : visible.filter((a) => a.pinned);
  const overflow = isWide ? [] : visible.filter((a) => !a.pinned);

  return (
    <div className={cn('flex items-center gap-2 min-w-0', stretchOnMobile && 'max-sm:w-full', className)}>
      {inline.map((a) => {
        if (a.render) return <React.Fragment key={a.key}>{a.render}</React.Fragment>;
        const Icon = a.icon;
        return (
          <Button
            key={a.key}
            size={size}
            variant={a.variant ?? 'outline'}
            onClick={a.onClick}
            disabled={a.disabled}
            className={cn(stretchOnMobile && 'max-sm:flex-1', a.className)}
          >
            {Icon && <Icon className="h-4 w-4" />}
            <span className="truncate">{a.label}</span>
          </Button>
        );
      })}

      {overflow.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" aria-label={t('common.more')}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-48">
            {overflow.map((a, i) => {
              const Icon = a.icon;
              const prevDestructive = i > 0 && Boolean(overflow[i - 1]?.destructive);
              return (
                <React.Fragment key={a.key}>
                  {a.destructive && !prevDestructive && i > 0 && <DropdownMenuSeparator />}
                  <DropdownMenuItem
                    disabled={a.disabled}
                    onClick={a.onClick}
                    className={cn(
                      'cursor-pointer gap-2 py-2.5 sm:py-1.5',
                      a.destructive && 'text-red-600 focus:bg-red-50 focus:text-red-700',
                    )}
                  >
                    {Icon && <Icon className="h-4 w-4" />}
                    {a.label}
                  </DropdownMenuItem>
                </React.Fragment>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
