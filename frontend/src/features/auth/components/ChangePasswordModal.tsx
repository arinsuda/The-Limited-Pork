import * as React from 'react';
import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Lock, Loader2, KeyRound } from 'lucide-react';
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

interface ChangePasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ChangePasswordModal = React.memo(function ChangePasswordModal({
  open,
  onOpenChange,
}: ChangePasswordModalProps) {
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleClose = useCallback(() => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setErrorMessage(null);
    onOpenChange(false);
  }, [onOpenChange]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
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
        await http.post('/auth/me/password', {
          currentPassword,
          newPassword,
        });
        toast.success(t('auth.password_change_success'));
        handleClose();
      } catch (err) {
        if (isApiError(err)) {
          if (err.is('BAD_REQUEST')) {
            setErrorMessage(t('auth.current_password_incorrect'));
          } else {
            setErrorMessage(t(`errors.${err.code}`, t('errors.INTERNAL')));
          }
        } else {
          setErrorMessage(t('errors.INTERNAL'));
        }
      } finally {
        setIsLoading(false);
      }
    },
    [currentPassword, newPassword, confirmPassword, handleClose, t],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm" mobileVariant="sheet" className="max-sm:px-5">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-orange-100 text-orange-600">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg">
                {t('auth.change_password')}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {t('auth.change_password_subtitle')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 py-2">
          {errorMessage && (
            <div
              role="alert"
              className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600 font-medium"
            >
              {errorMessage}
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="current-pw" className="text-xs font-medium">
              {t('auth.current_password')}
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                id="current-pw"
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="pl-9 text-xs sm:text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="new-pw" className="text-xs font-medium">
              {t('auth.new_password')}
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                id="new-pw"
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
            <Label htmlFor="confirm-new-pw" className="text-xs font-medium">
              {t('auth.confirm_password')}
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                id="confirm-new-pw"
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
              disabled={isLoading || !currentPassword || !newPassword || !confirmPassword}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {t('common.loading')}
                </>
              ) : (
                t('common.save')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
});
