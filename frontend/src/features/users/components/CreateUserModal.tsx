import * as React from 'react';
import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { UserPlus, Mail, Lock, User as UserIcon, Loader2 } from 'lucide-react';
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

interface CreateUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roles: Role[];
  onCreated: (user: ManagedUser) => void;
}

export const CreateUserModal = React.memo(function CreateUserModal({
  open,
  onOpenChange,
  roles,
  onCreated,
}: CreateUserModalProps) {
  const { t, i18n } = useTranslation();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Default role to COOK if available
  React.useEffect(() => {
    if (roles.length > 0 && !selectedRoleId) {
      const defaultRole = roles.find((r) => r.code === 'COOK') || roles[0];
      if (defaultRole) {
        setSelectedRoleId(defaultRole.id);
      }
    }
  }, [roles, selectedRoleId]);

  const handleClose = useCallback(() => {
    setDisplayName('');
    setEmail('');
    setPassword('');
    setErrorMessage(null);
    onOpenChange(false);
  }, [onOpenChange]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setErrorMessage(null);

      const trimmedName = displayName.trim();
      const trimmedEmail = email.trim();

      if (trimmedName.length < 2) {
        setErrorMessage(t('users.name_min_length'));
        return;
      }

      if (password.length < 8) {
        setErrorMessage(t('auth.password_too_short'));
        return;
      }

      setIsLoading(true);

      try {
        const res = await http.post<ManagedUser>('/users', {
          email: trimmedEmail,
          displayName: trimmedName,
          password,
          locale: i18n.language === 'en' ? 'en' : 'th',
          roleIds: selectedRoleId ? [selectedRoleId] : [],
          isActive: true,
        });

        toast.success(t('users.create_success'));
        onCreated(res);
        handleClose();
      } catch (err) {
        if (isApiError(err)) {
          if (err.is('DUPLICATE')) {
            setErrorMessage(t('errors.DUPLICATE'));
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
    [displayName, email, password, selectedRoleId, onCreated, handleClose, t, i18n.language],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md" mobileVariant="fullPage">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-orange-100 text-orange-600">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg">
                {t('users.create_title')}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {t('users.create_subtitle')}
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
            <Label htmlFor="create-user-name" className="text-xs font-medium">
              {t('users.display_name')}
            </Label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                id="create-user-name"
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="pl-9 text-xs sm:text-sm"
                placeholder={t('users.display_name_placeholder')}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="create-user-email" className="text-xs font-medium">
              {t('users.email')}
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                id="create-user-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9 text-xs sm:text-sm"
                placeholder="staff@mookrob.com"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="create-user-password" className="text-xs font-medium">
              {t('users.initial_password')}
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                id="create-user-password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9 text-xs sm:text-sm"
                placeholder="••••••••"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              {t('users.initial_password_hint')}
            </p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="create-user-role" className="text-xs font-medium">
              {t('users.role')}
            </Label>
            <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
              <SelectTrigger id="create-user-role" className="w-full text-xs sm:text-sm">
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

          <DialogFooter className="pt-3">
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
              disabled={isLoading || !displayName.trim() || !email.trim() || !password}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {t('common.loading')}
                </>
              ) : (
                t('common.create')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
});
