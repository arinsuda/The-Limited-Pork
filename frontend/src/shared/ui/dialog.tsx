import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/utils';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogPortal = DialogPrimitive.Portal;
export const DialogClose = DialogPrimitive.Close;

export type DialogMobileVariant = 'fullPage' | 'sheet';

interface DialogContextValue {
  mobileVariant: DialogMobileVariant;
  hideClose?: boolean;
}

const DialogContext = React.createContext<DialogContextValue>({
  mobileVariant: 'fullPage',
  hideClose: false,
});

export const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn('fixed inset-0 z-50 bg-black/60 backdrop-blur-xs animate-fade-in', className)}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

/**
 * Responsive dialog surface.
 *  - Full-page mobile variant ('fullPage'): full new page view taking 100% of the mobile screen.
 *  - Sheet mobile variant ('sheet'): compact bottom sheet for confirm dialogs.
 *  - sm and up: centered modal with a width preset from `size`.
 */
const dialogContentVariants = cva(
  [
    'fixed z-50 grid w-full border border-slate-200 bg-white shadow-lg overscroll-contain',
    // tablet / desktop (sm and up): centered modal
    'sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:animate-zoom-in sm:overflow-y-auto sm:max-h-[90dvh] sm:p-6 sm:gap-4',
  ],
  {
    variants: {
      mobileVariant: {
        // Mobile (< sm): Full page experience (a new page view, NOT a floating modal)
        fullPage: [
          'max-sm:inset-0 max-sm:h-[100dvh] max-sm:max-h-none max-sm:w-full max-sm:max-w-none',
          'max-sm:rounded-none max-sm:border-none max-sm:bg-slate-50 max-sm:p-0 max-sm:gap-0',
          'max-sm:flex max-sm:flex-col max-sm:overflow-y-auto max-sm:overflow-x-hidden max-sm:overscroll-x-none max-sm:animate-fade-in',
        ],
        // Mobile (< sm): Bottom sheet (for compact confirm modals)
        sheet: [
          'max-sm:inset-x-0 max-sm:bottom-0 max-sm:max-w-none max-sm:rounded-t-2xl max-sm:border-x-0 max-sm:border-b-0',
          'max-sm:p-4 max-sm:pt-6 max-sm:pb-[calc(1rem+var(--safe-bottom))] max-sm:max-h-[92dvh] max-sm:overflow-y-auto max-sm:gap-4 max-sm:animate-sheet-in-bottom',
        ],
      },
      size: {
        sm: 'sm:max-w-sm',
        md: 'sm:max-w-lg',
        lg: 'sm:max-w-2xl',
        xl: 'sm:max-w-4xl',
        '2xl': 'sm:max-w-6xl',
        full: 'sm:max-w-[calc(100vw-2rem)] sm:h-[calc(100dvh-2rem)] sm:max-h-none',
      },
    },
    defaultVariants: {
      mobileVariant: 'fullPage',
      size: 'md',
    },
  },
);

export interface DialogContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
    VariantProps<typeof dialogContentVariants> {
  /** Hide the built-in close (X / Back) button. */
  hideClose?: boolean;
  /** Responsive mobile rendering: 'fullPage' = full new page view; 'sheet' = bottom sheet. Defaults to 'fullPage'. */
  mobileVariant?: DialogMobileVariant;
}

export const DialogContent = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Content>, DialogContentProps>(
  ({ className, children, size, mobileVariant = 'fullPage', hideClose = false, ...props }, ref) => {
    const { t } = useTranslation();
    return (
      <DialogPortal>
        <DialogOverlay className={cn(mobileVariant === 'fullPage' && 'max-sm:bg-slate-50 max-sm:backdrop-blur-none')} />
        <DialogPrimitive.Content
          ref={ref}
          className={cn(dialogContentVariants({ size, mobileVariant }), className)}
          {...props}
        >
          <DialogContext.Provider value={{ mobileVariant, hideClose }}>
            {/* Grab handle affordance for the mobile bottom sheet only */}
            {mobileVariant === 'sheet' && (
              <span
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-2 h-1.5 w-10 -translate-x-1/2 rounded-full bg-slate-300 sm:hidden"
              />
            )}
            {children}
            {!hideClose && (
              <DialogPrimitive.Close
                className={cn(
                  'touch-target inline-flex items-center justify-center text-slate-500 transition hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 cursor-pointer',
                  mobileVariant === 'fullPage'
                    ? 'max-sm:hidden'
                    : 'max-sm:absolute max-sm:right-2 max-sm:top-2 max-sm:p-1.5 max-sm:rounded-md max-sm:hover:bg-slate-100',
                  'sm:absolute sm:right-3 sm:top-3 sm:rounded-md sm:p-1.5 sm:opacity-80 sm:hover:bg-slate-100 sm:hover:opacity-100',
                )}
              >
                <X className="h-4 w-4 sm:h-4 sm:w-4 text-slate-500" />
                <span className="sr-only">{t('common.close')}</span>
              </DialogPrimitive.Close>
            )}
          </DialogContext.Provider>
        </DialogPrimitive.Content>
      </DialogPortal>
    );
  },
);
DialogContent.displayName = DialogPrimitive.Content.displayName;

export const DialogHeader = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  const { mobileVariant, hideClose } = React.useContext(DialogContext);
  const { t } = useTranslation();

  if (mobileVariant === 'fullPage') {
    return (
      <div
        className={cn(
          'max-sm:sticky max-sm:top-0 max-sm:z-30 max-sm:bg-white max-sm:border-b max-sm:border-slate-200 max-sm:px-4 max-sm:pt-[calc(0.75rem+var(--safe-top))] max-sm:pb-3 max-sm:shadow-2xs max-sm:w-full max-sm:max-w-full max-sm:overflow-hidden sm:pr-8',
          className,
        )}
        {...props}
      >
        <div className="flex items-center justify-between gap-3 sm:block">
          <div className="flex flex-col space-y-1.5 text-left flex-1 min-w-0">
            {children}
          </div>
          {!hideClose && (
            <DialogPrimitive.Close
              className="sm:hidden touch-target shrink-0 inline-flex items-center justify-center h-9 w-9 rounded-full bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-600 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 cursor-pointer"
            >
              <X className="h-5 w-5" />
              <span className="sr-only">{t('common.close')}</span>
            </DialogPrimitive.Close>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn('flex flex-col space-y-1.5 text-left pr-8', className)}
      {...props}
    >
      {children}
    </div>
  );
};
DialogHeader.displayName = 'DialogHeader';

/** Scrollable body region — use with `className="flex flex-col p-0"` on DialogContent for sticky header/footer layouts. */
export const DialogBody = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('min-h-0 flex-1 overflow-y-auto overscroll-contain max-sm:p-4 max-sm:space-y-4', className)} {...props} />
);
DialogBody.displayName = 'DialogBody';

/**
 * Footer actions. Phones: full-width buttons. sm+: right-aligned row.
 */
export const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  const { mobileVariant } = React.useContext(DialogContext);
  return (
    <div
      className={cn(
        'flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end',
        mobileVariant === 'fullPage'
          ? 'max-sm:sticky max-sm:bottom-0 max-sm:mt-auto max-sm:z-30 max-sm:bg-white/95 max-sm:backdrop-blur-md max-sm:border-t max-sm:border-slate-200 max-sm:p-3.5 max-sm:pb-[calc(1rem+var(--safe-bottom))] max-sm:shadow-lg max-sm:flex-row max-sm:gap-2.5 max-sm:w-full max-sm:max-w-full max-sm:overflow-hidden [&>button]:max-sm:w-full [&>button]:max-sm:flex-1 [&>button]:max-sm:h-11 [&>button]:max-sm:text-sm'
          : '[&>button]:max-sm:w-full [&>button]:max-sm:h-10',
        className,
      )}
      {...props}
    />
  );
};
DialogFooter.displayName = 'DialogFooter';

export const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-base sm:text-lg font-semibold leading-snug tracking-tight text-slate-900', className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

export const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn('text-sm text-slate-500', className)} {...props} />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;
