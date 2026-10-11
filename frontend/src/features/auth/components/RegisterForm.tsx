import * as React from 'react';
import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Lock, Mail, User as UserIcon, Loader2 } from 'lucide-react';
import { useAuthStore } from '../auth-store';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { isApiError } from '@/shared/lib/http/api-error';

interface RegisterFormProps {
  onSuccess: () => void;
  onSwitchToLogin: () => void;
}

export const RegisterForm = React.memo(function RegisterForm({
  onSuccess,
  onSwitchToLogin,
}: RegisterFormProps) {
  const { t, i18n } = useTranslation();
  const { register } = useAuthStore();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setErrorMessage(null);

      const trimmedName = displayName.trim();
      const trimmedEmail = email.trim();

      if (trimmedName.length < 2) {
        setErrorMessage(t('auth.display_name_required'));
        return;
      }

      if (password.length < 8) {
        setErrorMessage(t('auth.password_too_short'));
        return;
      }

      if (password !== confirmPassword) {
        setErrorMessage(t('auth.password_mismatch'));
        return;
      }

      setIsLoading(true);

      try {
        const locale = i18n.language === 'en' ? 'en' : 'th';
        await register(trimmedEmail, password, trimmedName, locale);
        onSuccess();
      } catch (err) {
        if (isApiError(err)) {
          if (err.is('DUPLICATE')) {
            setErrorMessage(t('errors.DUPLICATE'));
          } else if (err.is('VALIDATION_FAILED')) {
            setErrorMessage(t('errors.VALIDATION_FAILED'));
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
    [displayName, email, password, confirmPassword, register, onSuccess, t, i18n.language],
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5">
      {errorMessage && (
        <div
          role="alert"
          className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600 font-medium animate-fade-in"
        >
          {errorMessage}
        </div>
      )}

      <div className="space-y-1">
        <Label htmlFor="reg-name" className="text-xs font-medium">
          {t('auth.display_name')}
        </Label>
        <div className="relative">
          <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            id="reg-name"
            type="text"
            autoComplete="name"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="pl-9 text-xs sm:text-sm"
            placeholder={t('auth.display_name')}
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="reg-email" className="text-xs font-medium">
          {t('auth.email')}
        </Label>
        <div className="relative">
          <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            id="reg-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-9 text-xs sm:text-sm"
            placeholder="chef@mookrob.com"
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="reg-password" className="text-xs font-medium">
          {t('auth.password')}
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            id="reg-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-9 text-xs sm:text-sm"
            placeholder="••••••••"
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="reg-confirm-password" className="text-xs font-medium">
          {t('auth.confirm_password')}
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            id="reg-confirm-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="pl-9 text-xs sm:text-sm"
            placeholder="••••••••"
          />
        </div>
      </div>

      <Button
        type="submit"
        disabled={isLoading || !email.trim() || !displayName.trim() || !password || !confirmPassword}
        className="w-full mt-3 font-semibold h-10 sm:h-9 bg-orange-600 hover:bg-orange-700 text-white cursor-pointer"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            {t('common.loading')}
          </>
        ) : (
          t('auth.sign_up')
        )}
      </Button>

      <div className="pt-2 text-center">
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-xs text-orange-600 hover:text-orange-700 font-medium transition-colors cursor-pointer"
        >
          {t('auth.already_have_account')}{' '}
          <span className="underline underline-offset-2">{t('auth.login_tab')}</span>
        </button>
      </div>
    </form>
  );
});
