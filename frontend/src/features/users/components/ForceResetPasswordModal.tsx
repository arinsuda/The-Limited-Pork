import * as React from 'react';
import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyRound, Lock, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { http } from '@/shared/lib/http/client';
import { isApiError } from '@/shared/lib/http/api-error';
import type { ManagedUser } from '../types';

interface ForceResetPasswordModalProps {
  user: ManagedUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ForceResetPasswordModal = React.memo(function ForceResetPasswordModal({
  user,
  open,
  onOpenChange,
}: ForceResetPasswordModalProps) {
  const { t } = useTranslation();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleClose = useCallback(() => {
    setNewPassword('');
    setConfirmPassword('');
    setErrorMessage(null);
    onOpenChange(false);
  }, [onOpenChange]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user) return;
      setErrorMessage(null);

      if (newPassword.length < 8) {
        setErrorMessage(t('auth.password_too_short'));
        return;
      }

      if (newPassword !== confirmPassword) {
        setErrorMessage(t('auth.password_mismatch'));
        return;
      }

      setIsLoading(true);

      try {
        await http.post(`/users/${user.id}/reset-password`, {
          newPassword,
        });

        toast.success(t('users.force_reset_success', { name: user.displayName }));
        handleClose();
      } catch (err) {
        if (isApiError(err)) {
          setErrorMessage(t(`errors.${err.code}`, t('errors.INTERNAL')));
        } else {
          setErrorMessage(t('errors.INTERNAL'));
        }
      } finally {
        setIsLoading(false);
      }
    },
    [user, newPassword, confirmPassword, handleClose, t],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm" mobileVariant="sheet" className="max-sm:px-5">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg">
                {t('users.force_reset_title')}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {user ? `${user.displayName} (${user.email})` : ''}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 py-2">
          <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2 text-xs text-amber-800">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <span>{t('users.force_reset_warning')}</span>
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600 font-medium"
            >
              {errorMessage}
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="force-new-pw" className="text-xs font-medium">
              {t('users.new_password')}
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                id="force-new-pw"
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pl-9 text-xs sm:text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="force-confirm-pw" className="text-xs font-medium">
              {t('auth.confirm_password')}
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                id="force-confirm-pw"
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-9 text-xs sm:text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClose}
              disabled={isLoading}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isLoading || !newPassword || !confirmPassword}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {t('common.loading')}
                </>
              ) : (
                t('users.confirm_force_reset')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
});
