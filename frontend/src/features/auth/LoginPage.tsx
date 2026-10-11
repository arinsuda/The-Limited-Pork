import * as React from 'react';
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Globe, Lock, Mail, Loader2, Settings, Check } from 'lucide-react';
import { useAuthStore } from './auth-store';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { isApiError } from '@/shared/lib/http/api-error';
import { getApiBaseUrl, setCustomApiBaseUrl } from '@/shared/config/env';
import { BRAND } from '@/shared/config/navigation';

export function LoginPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { login, updateUserLocale } = useAuthStore();

  const [email, setEmail] = useState('admin@mookrob.local');
  const [password, setPassword] = useState('Admin@123456');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [showServerConfig, setShowServerConfig] = useState(false);
  const [serverUrl, setServerUrl] = useState(getApiBaseUrl());
  const [saveServerSuccess, setSaveServerSuccess] = useState(false);

  const handleSaveServerUrl = () => {
    setCustomApiBaseUrl(serverUrl);
    setSaveServerSuccess(true);
    setTimeout(() => setSaveServerSuccess(false), 2000);
  };

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
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-orange-50 via-slate-50 to-amber-50 px-3 sm:px-6 py-8 pt-safe pb-safe relative">
      {/* Language Switcher Top Right */}
      <div className="absolute top-3 sm:top-4 right-3 sm:right-4 z-10 pt-safe pr-safe">
        <Button
          variant="outline"
          size="sm"
          onClick={handleToggleLocale}
          className="bg-white/90 backdrop-blur-xs text-xs font-semibold shadow-2xs touch-target"
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
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">{t('app.title')}</h1>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">{t('app.tagline')}</p>
        </div>

        <Card className="border-slate-200 shadow-xl bg-white/95 backdrop-blur-xs">
          <CardHeader className="space-y-1 p-4 sm:p-6 pb-3 sm:pb-4">
            <CardTitle className="text-lg sm:text-xl text-center">{t('auth.login_title')}</CardTitle>
            <CardDescription className="text-center text-xs">
              {t('auth.login_subtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            {errorMessage && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600 font-medium animate-fade-in">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium">{t('auth.email')}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 sm:top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 text-xs sm:text-sm"
                    placeholder="admin@mookrob.local"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-medium">{t('auth.password')}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 sm:top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 text-xs sm:text-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <Button type="submit" disabled={isLoading} className="w-full mt-2 font-semibold h-10 sm:h-9">
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

            <div className="mt-5 pt-3 border-t border-slate-100 text-center">
              <span className="text-[11px] text-slate-500 block break-words">
                Default Credentials: <strong className="text-slate-700">admin@mookrob.local</strong> /{' '}
                <strong className="text-slate-700">Admin@123456</strong>
              </span>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col items-center">
              <button
                type="button"
                onClick={() => setShowServerConfig(!showServerConfig)}
                className="text-[11px] text-slate-500 hover:text-slate-700 flex items-center gap-1 transition-colors cursor-pointer touch-target"
              >
                <Settings className="h-3 w-3" />
                <span>{t('auth.server_settings', 'ตั้งค่าเซิร์ฟเวอร์ (API Endpoint)')}</span>
              </button>

              {showServerConfig && (
                <div className="w-full mt-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200 text-left space-y-2 animate-fade-in">
                  <Label htmlFor="server-url" className="text-[11px] font-medium text-slate-600">
                    Backend API URL
                  </Label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      id="server-url"
                      value={serverUrl}
                      onChange={(e) => setServerUrl(e.target.value)}
                      placeholder="http://192.168.1.114:8080/api/v1"
                      className="text-xs h-9 bg-white flex-1"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="h-9 text-xs shrink-0 font-medium"
                      onClick={handleSaveServerUrl}
                    >
                      {saveServerSuccess ? (
                        <>
                          <Check className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                          บันทึกแล้ว
                        </>
                      ) : (
                        'บันทึก'
                      )}
                    </Button>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    สำหรับมือถือเชื่อมต่อ WiFi: แนะนำใส่ IP ของเครื่องคอมพิวเตอร์ เช่น http://192.168.1.114:8080/api/v1
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
