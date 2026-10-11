import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, AlertCircle, Info, HelpCircle, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';

export type ConfirmVariant = 'destructive' | 'warning' | 'info' | 'primary';

export interface ConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  isLoading?: boolean;
  showCancel?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

/**
 * Declarative reusable Confirm Modal component
 */
export function ConfirmModal({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  variant = 'destructive',
  isLoading = false,
  showCancel = true,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const { t } = useTranslation();

  const handleConfirm = async () => {
    await onConfirm();
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    onOpenChange(false);
  };

  const getVariantConfig = () => {
    switch (variant) {
      case 'destructive':
        return {
          icon: <AlertTriangle className="h-5 w-5 text-red-600" />,
          iconBg: 'bg-red-100',
          confirmVariant: 'destructive' as const,
          confirmClass: 'bg-red-600 hover:bg-red-700 text-white shadow-sm',
        };
      case 'warning':
        return {
          icon: <AlertCircle className="h-5 w-5 text-amber-600" />,
          iconBg: 'bg-amber-100',
          confirmVariant: 'default' as const,
          confirmClass: 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm',
        };
      case 'info':
        return {
          icon: <Info className="h-5 w-5 text-sky-600" />,
          iconBg: 'bg-sky-100',
          confirmVariant: 'default' as const,
          confirmClass: 'bg-sky-600 hover:bg-sky-700 text-white shadow-sm',
        };
      case 'primary':
      default:
        return {
          icon: <HelpCircle className="h-5 w-5 text-orange-600" />,
          iconBg: 'bg-orange-100',
          confirmVariant: 'default' as const,
          confirmClass: 'bg-orange-600 hover:bg-orange-700 text-white shadow-sm',
        };
    }
  };

  const config = getVariantConfig();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent mobileVariant="sheet" className="max-w-md sm:max-w-[440px] p-6 gap-0">
        <DialogHeader className="space-y-0 text-left">
          <div className="flex items-start gap-4">
            <div
              className={`h-11 w-11 rounded-full ${config.iconBg} flex items-center justify-center shrink-0 mt-0.5 shadow-2xs`}
            >
              {config.icon}
            </div>
            <div className="space-y-1.5 flex-1 pr-4">
              <DialogTitle className="text-base font-bold text-slate-900 leading-snug">
                {title}
              </DialogTitle>
              {description && (
                <DialogDescription className="text-xs text-slate-500 leading-relaxed">
                  {description}
                </DialogDescription>
              )}
            </div>
          </div>
        </DialogHeader>

        <DialogFooter className="mt-6 pt-3 border-t border-slate-100 flex-row justify-end gap-2 sm:gap-2">
          {showCancel && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={isLoading}
              className="text-xs text-slate-600 hover:text-slate-900"
            >
              {cancelLabel ?? t('common.cancel')}
            </Button>
          )}
          <Button
            type="button"
            variant={config.confirmVariant}
            size="sm"
            onClick={handleConfirm}
            disabled={isLoading}
            className={`text-xs font-semibold ${config.confirmClass}`}
          >
            {isLoading && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            {confirmLabel ?? t('common.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// -----------------------------------------------------------------------------
// Hook-based Confirm & Alert Provider
// -----------------------------------------------------------------------------

export interface ConfirmOptions {
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
}

export interface AlertOptions {
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel?: string;
  variant?: ConfirmVariant;
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  alert: (options: AlertOptions) => Promise<void>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: React.ReactNode;
    description?: React.ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: ConfirmVariant;
    showCancel: boolean;
  }>({
    isOpen: false,
    title: '',
    showCancel: true,
  });

  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setModalState({
        isOpen: true,
        title: options.title,
        description: options.description,
        confirmLabel: options.confirmLabel,
        cancelLabel: options.cancelLabel,
        variant: options.variant ?? 'destructive',
        showCancel: true,
      });
    });
  }, []);

  const alert = useCallback((options: AlertOptions): Promise<void> => {
    return new Promise<void>((resolve) => {
      resolverRef.current = () => resolve();
      setModalState({
        isOpen: true,
        title: options.title,
        description: options.description,
        confirmLabel: options.confirmLabel,
        variant: options.variant ?? 'info',
        showCancel: false,
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (resolverRef.current) {
      resolverRef.current(true);
      resolverRef.current = null;
    }
    setModalState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const handleCancel = useCallback(() => {
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }
    setModalState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  return (
    <ConfirmContext.Provider value={{ confirm, alert }}>
      {children}
      <ConfirmModal
        open={modalState.isOpen}
        onOpenChange={(open) => {
          if (!open) handleCancel();
        }}
        title={modalState.title}
        description={modalState.description}
        confirmLabel={modalState.confirmLabel}
        cancelLabel={modalState.cancelLabel}
        variant={modalState.variant}
        showCancel={modalState.showCancel}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ConfirmContext.Provider>
  );
}

/**
 * Hook to invoke confirm or alert dialogs programmatically
 */
export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return ctx;
}
