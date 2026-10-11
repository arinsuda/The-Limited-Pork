import { useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Globe, Lock, Mail, Loader2, ShieldCheck } from 'lucide-react';
import { useAuthStore } from './auth-store';
import { ServerConfigSection } from './components/ServerConfigSection';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { BRAND } from '@/shared/config/navigation';
import { isApiError } from '@/shared/lib/http/api-error';

export function LoginPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { login, updateUserLocale } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/recipes';

  const handleToggleLocale = useCallback(() => {
    const nextLocale = i18n.language === 'th' ? 'en' : 'th';
    updateUserLocale(nextLocale);
  }, [i18n.language, updateUserLocale]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setErrorMessage(null);
      setIsLoading(true);

      try {
        await login(email.trim(), password);
        navigate(from, { replace: true });
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
    [email, password, login, navigate, from, t],
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-orange-50 via-slate-50 to-amber-50 px-3 sm:px-6 py-8 pt-safe pb-safe relative">
      {/* Language Switcher Top Right */}
      <div className="absolute top-3 sm:top-4 right-3 sm:right-4 z-10 pt-safe pr-safe">
        <Button
          variant="outline"
          size="sm"
          onClick={handleToggleLocale}
          className="bg-white/90 backdrop-blur-xs text-xs font-semibold shadow-2xs touch-target cursor-pointer"
        >
          <Globe className="h-3.5 w-3.5 mr-1 text-slate-500" />
          {i18n.language === 'th' ? 'TH' : 'EN'}
        </Button>
      </div>

      <div className="w-full max-w-md mx-auto my-auto">
        {/* Brand Header */}
        <div className="text-center mb-5 sm:mb-6">
          <div className="flex justify-center mb-2 sm:mb-3">
            <img
              src={BRAND.logoSrc}
              alt={t('app.title')}
              className="h-20 w-20 sm:h-28 sm:w-28 object-contain drop-shadow-md hover:scale-105 transition-transform"
            />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            {t('app.title')}
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            {t('app.tagline')}
          </p>
        </div>

        <Card className="border-slate-200 shadow-xl bg-white/95 backdrop-blur-xs">
          <CardHeader className="space-y-1 p-4 sm:p-6 pb-2 sm:pb-3">
            <div className="flex items-center justify-center gap-1.5 text-orange-600 text-xs font-semibold">
              <ShieldCheck className="h-4 w-4" />
              <span>{t('auth.internal_system')}</span>
            </div>
            <CardTitle className="text-lg sm:text-xl text-center">
              {t('auth.login_title')}
            </CardTitle>
            <CardDescription className="text-center text-xs">
              {t('auth.login_subtitle')}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            {errorMessage && (
              <div
                role="alert"
                className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600 font-medium animate-fade-in"
              >
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
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
                    placeholder="admin@mookrob.local"
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
            </form>

            <div className="mt-4 pt-3 border-t border-slate-100 text-center">
              <p className="text-[11px] text-slate-500">
                {t('auth.managed_by_admin')}
              </p>
            </div>

            <ServerConfigSection />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
