import * as React from 'react';
import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Lock, Mail, Loader2 } from 'lucide-react';
import { useAuthStore } from '../auth-store';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { isApiError } from '@/shared/lib/http/api-error';

interface LoginFormProps {
  onSuccess: () => void;
  onSwitchToRegister: () => void;
}

export const LoginForm = React.memo(function LoginForm({
  onSuccess,
  onSwitchToRegister,
}: LoginFormProps) {
  const { t } = useTranslation();
  const { login } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setErrorMessage(null);
      setIsLoading(true);

      try {
        await login(email.trim(), password);
        onSuccess();
      } catch (err) {
        if (isApiError(err)) {
          if (err.is('INVALID_CREDENTIALS')) {
            setErrorMessage(t('errors.INVALID_CREDENTIALS'));
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
    [email, password, login, onSuccess, t],
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errorMessage && (
        <div
          role="alert"
          className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600 font-medium animate-fade-in"
        >
          {errorMessage}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="login-email" className="text-xs font-medium">
          {t('auth.email')}
        </Label>
        <div className="relative">
          <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            id="login-email"
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

      <div className="space-y-1.5">
        <Label htmlFor="login-password" className="text-xs font-medium">
          {t('auth.password')}
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-9 text-xs sm:text-sm"
            placeholder="••••••••"
          />
        </div>
      </div>

      <Button
        type="submit"
        disabled={isLoading || !email.trim() || !password}
        className="w-full mt-2 font-semibold h-10 sm:h-9 bg-orange-600 hover:bg-orange-700 text-white cursor-pointer"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            {t('common.loading')}
          </>
        ) : (
          t('auth.sign_in')
        )}
      </Button>

      <div className="pt-2 text-center">
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="text-xs text-orange-600 hover:text-orange-700 font-medium transition-colors cursor-pointer"
        >
          {t('auth.dont_have_account')}{' '}
          <span className="underline underline-offset-2">{t('auth.register_tab')}</span>
        </button>
      </div>
    </form>
  );
});
