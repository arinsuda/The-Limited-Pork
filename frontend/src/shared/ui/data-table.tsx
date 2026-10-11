import * as React from 'react';
import { cn } from '@/shared/lib/utils';
import { Skeleton } from '@/shared/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { useBreakpointUp } from '@/shared/hooks/use-media-query';
import type { Breakpoint } from '@/shared/config/breakpoints';

export interface DataColumn<T> {
  key: string;
  header: React.ReactNode;
  cell: (row: T, index: number) => React.ReactNode;
  /** Classes for both <th> and <td> in table mode (alignment, width). */
  className?: string;
  headerClassName?: string;
  /** Hide this column in table mode below the breakpoint (it still appears in mobile cards). */
  hideBelow?: Breakpoint;
  /**
   * Role in mobile card mode:
   *  - 'title'    → card heading (bold, first line)
   *  - 'subtitle' → muted line under the title
   *  - 'badge'    → top-right corner (status pill)
   *  - 'actions'  → card footer, right-aligned
   *  - 'field'    → label/value row (default)
   *  - 'hidden'   → not shown in cards
   */
  mobile?: 'title' | 'subtitle' | 'badge' | 'actions' | 'field' | 'hidden';
}

export interface DataTableProps<T> {
  columns: DataColumn<T>[];
  data: T[];
  rowKey: (row: T, index: number) => string;
  isLoading?: boolean;
  skeletonRows?: number;
  /** Rendered when not loading and `data` is empty. */
  empty?: React.ReactNode;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string | undefined;
  /** Width at which the real table replaces the card list. */
  tableFrom?: Breakpoint;
  className?: string;
}

const HIDE_BELOW: Record<Breakpoint, string> = {
  xs: 'max-xs:hidden',
  sm: 'max-sm:hidden',
  md: 'max-md:hidden',
  lg: 'max-lg:hidden',
  xl: 'max-xl:hidden',
  '2xl': 'max-2xl:hidden',
  '3xl': 'max-3xl:hidden',
};

/**
 * Responsive data table. Renders a semantic <table> from `tableFrom` (default md) and a
 * stacked card list below it, driven by the same column definitions.
 */
export function DataTable<T>({
  columns,
  data,
  rowKey,
  isLoading = false,
  skeletonRows = 5,
  empty,
  onRowClick,
  rowClassName,
  tableFrom = 'md',
  className,
}: DataTableProps<T>) {
  const isTable = useBreakpointUp(tableFrom);

  if (!isLoading && data.length === 0 && empty) return <>{empty}</>;

  if (isTable) {
    return (
      <div className={cn('overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm', className)}>
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => (
                <TableHead
                  key={c.key}
                  className={cn(c.className, c.headerClassName, c.hideBelow && HIDE_BELOW[c.hideBelow])}
                >
                  {c.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: skeletonRows }).map((_, r) => (
                  <TableRow key={`sk-${r}`}>
                    {columns.map((c) => (
                      <TableCell key={c.key} className={cn(c.hideBelow && HIDE_BELOW[c.hideBelow])}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : data.map((row, i) => (
                  <TableRow
                    key={rowKey(row, i)}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn(onRowClick && 'cursor-pointer', rowClassName?.(row))}
                  >
                    {columns.map((c) => (
                      <TableCell key={c.key} className={cn(c.className, c.hideBelow && HIDE_BELOW[c.hideBelow])}>
                        {c.cell(row, i)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  // ---- Mobile card list ----
  const by = (role: DataColumn<T>['mobile']) => columns.filter((c) => (c.mobile ?? 'field') === role);
  const titleCols = by('title');
  const subtitleCols = by('subtitle');
  const badgeCols = by('badge');
  const actionCols = by('actions');
  const fieldCols = by('field');

  return (
    <ul className={cn('flex flex-col gap-2.5', className)}>
      {isLoading
        ? Array.from({ length: Math.min(skeletonRows, 4) }).map((_, r) => (
            <li key={`sk-${r}`} className="space-y-2 rounded-xl border border-slate-200 bg-white p-3.5">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-full" />
            </li>
          ))
        : data.map((row, i) => (
            <li
              key={rowKey(row, i)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                'rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs',
                onRowClick && 'cursor-pointer active:bg-slate-50',
                rowClassName?.(row),
              )}
            >
              {(titleCols.length > 0 || badgeCols.length > 0) && (
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-0.5">
                    {titleCols.map((c) => (
                      <div key={c.key} className="break-words text-sm font-semibold text-slate-900">
                        {c.cell(row, i)}
                      </div>
                    ))}
                    {subtitleCols.map((c) => (
                      <div key={c.key} className="break-words text-xs text-slate-500">
                        {c.cell(row, i)}
                      </div>
                    ))}
                  </div>
                  {badgeCols.length > 0 && (
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {badgeCols.map((c) => (
                        <div key={c.key}>{c.cell(row, i)}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {fieldCols.length > 0 && (
                <dl className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-slate-100 pt-2.5">
                  {fieldCols.map((c) => (
                    <div key={c.key} className="min-w-0">
                      <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{c.header}</dt>
                      <dd className="mt-0.5 break-words text-xs text-slate-800">{c.cell(row, i)}</dd>
                    </div>
                  ))}
                </dl>
              )}

              {actionCols.length > 0 && (
                <div
                  className="mt-3 flex items-center justify-end gap-2 border-t border-slate-100 pt-2.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  {actionCols.map((c) => (
                    <React.Fragment key={c.key}>{c.cell(row, i)}</React.Fragment>
                  ))}
                </div>
              )}
            </li>
          ))}
    </ul>
  );
}
