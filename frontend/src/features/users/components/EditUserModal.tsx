import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { UserCheck, User as UserIcon, Loader2 } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { http } from '@/shared/lib/http/client';
import { isApiError } from '@/shared/lib/http/api-error';
import type { Role, ManagedUser } from '../types';

interface EditUserModalProps {
  user: ManagedUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roles: Role[];
  onUpdated: (user: ManagedUser) => void;
}

export const EditUserModal = React.memo(function EditUserModal({
  user,
  open,
  onOpenChange,
  roles,
  onUpdated,
}: EditUserModalProps) {
  const { t, i18n } = useTranslation();
  const [displayName, setDisplayName] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName);
      setIsActive(user.isActive);
      if (user.roles && user.roles.length > 0 && user.roles[0]) {
        setSelectedRoleId(user.roles[0].id);
      } else if (roles.length > 0 && roles[0]) {
        setSelectedRoleId(roles[0].id);
      }
    }
  }, [user, roles]);

  const handleClose = useCallback(() => {
    setErrorMessage(null);
    onOpenChange(false);
  }, [onOpenChange]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user) return;
      setErrorMessage(null);

      const trimmedName = displayName.trim();
      if (trimmedName.length < 2) {
        setErrorMessage(t('users.name_min_length'));
        return;
      }

      setIsLoading(true);

      try {
        const res = await http.put<ManagedUser>(`/users/${user.id}`, {
          displayName: trimmedName,
          locale: user.locale || 'th',
          roleIds: selectedRoleId ? [selectedRoleId] : [],
          isActive,
          version: user.version,
        });

        toast.success(t('users.update_success'));
        onUpdated(res);
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
    [user, displayName, selectedRoleId, isActive, onUpdated, handleClose, t],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm" mobileVariant="sheet" className="max-sm:px-5">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-orange-100 text-orange-600">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg">
                {t('users.edit_title')}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {user?.email}
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
            <Label htmlFor="edit-user-name" className="text-xs font-medium">
              {t('users.display_name')}
            </Label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                id="edit-user-name"
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="pl-9 text-xs sm:text-sm"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="edit-user-role" className="text-xs font-medium">
              {t('users.role')}
            </Label>
            <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
              <SelectTrigger id="edit-user-role" className="w-full text-xs sm:text-sm">
                <SelectValue placeholder={t('users.select_role')} />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r.id} value={r.id} className="text-xs sm:text-sm">
                    <span className="font-medium">
                      {i18n.language === 'th' ? r.nameTh : r.nameEn}
                    </span>
                    <span className="text-slate-400 text-[11px] ml-1.5">({r.code})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50">
            <div>
              <p className="text-xs font-medium text-slate-800">{t('users.active_status')}</p>
              <p className="text-[11px] text-slate-400">{t('users.active_status_hint')}</p>
            </div>
            <input
              type="checkbox"
              id="edit-user-active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 text-orange-600 rounded border-slate-300 focus:ring-orange-500 cursor-pointer"
            />
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
              disabled={isLoading || !displayName.trim()}
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
