import * as React from 'react';
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Globe, Lock, Mail, Loader2 } from 'lucide-react';
import { useAuthStore } from './auth-store';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { isApiError } from '@/shared/lib/http/api-error';

export function LoginPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { login, updateUserLocale } = useAuthStore();

  const [email, setEmail] = useState('admin@mookrob.local');
  const [password, setPassword] = useState('Admin@123456');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/recipes';

  const handleToggleLocale = () => {
    const nextLocale = i18n.language === 'th' ? 'en' : 'th';
    updateUserLocale(nextLocale);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      await login(email, password);
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
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-slate-50 to-amber-50 p-4">
      {/* Language Switcher Top Right */}
      <div className="absolute top-4 right-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handleToggleLocale}
          className="bg-white/80 backdrop-blur-xs text-xs font-semibold"
        >
          <Globe className="h-3.5 w-3.5 mr-1 text-slate-500" />
          {i18n.language === 'th' ? 'TH' : 'EN'}
        </Button>
      </div>

      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-600 text-white shadow-xl shadow-orange-500/25 mb-4">
            <span className="font-bold text-3xl">หมู</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t('app.title')}</h1>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">{t('app.tagline')}</p>
        </div>

        <Card className="border-slate-200 shadow-xl bg-white/95 backdrop-blur-xs">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl text-center">{t('auth.login_title')}</CardTitle>
            <CardDescription className="text-center text-xs">
              {t('auth.login_subtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {errorMessage && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600 font-medium">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">{t('auth.email')}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                    placeholder="admin@mookrob.local"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">{t('auth.password')}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <Button type="submit" disabled={isLoading} className="w-full mt-2 font-medium">
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

            <div className="mt-6 pt-4 border-t border-slate-100 text-center">
              <span className="text-[11px] text-slate-400">
                Default Credentials: <strong className="text-slate-600">admin@mookrob.local</strong> /{' '}
                <strong className="text-slate-600">Admin@123456</strong>
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
