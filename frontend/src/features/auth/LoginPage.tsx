import { useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Globe, LogIn, UserPlus } from 'lucide-react';
import { useAuthStore } from './auth-store';
import { LoginForm } from './components/LoginForm';
import { RegisterForm } from './components/RegisterForm';
import { ServerConfigSection } from './components/ServerConfigSection';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/ui/tabs';
import { BRAND } from '@/shared/config/navigation';

export function LoginPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { updateUserLocale } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/recipes';

  const handleToggleLocale = useCallback(() => {
    const nextLocale = i18n.language === 'th' ? 'en' : 'th';
    updateUserLocale(nextLocale);
  }, [i18n.language, updateUserLocale]);

  const handleSuccess = useCallback(() => {
    navigate(from, { replace: true });
  }, [navigate, from]);

  const handleSwitchToRegister = useCallback(() => {
    setActiveTab('register');
  }, []);

  const handleSwitchToLogin = useCallback(() => {
    setActiveTab('login');
  }, []);

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
            <CardTitle className="text-lg sm:text-xl text-center">
              {activeTab === 'login' ? t('auth.login_title') : t('auth.register_title')}
            </CardTitle>
            <CardDescription className="text-center text-xs">
              {activeTab === 'login' ? t('auth.login_subtitle') : t('auth.register_subtitle')}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            <Tabs
              value={activeTab}
              onValueChange={(val) => setActiveTab(val as 'login' | 'register')}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 mb-4 bg-slate-100 p-1">
                <TabsTrigger
                  value="login"
                  className="text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  {t('auth.login_tab')}
                </TabsTrigger>
                <TabsTrigger
                  value="register"
                  className="text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  {t('auth.register_tab')}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-0">
                <LoginForm
                  onSuccess={handleSuccess}
                  onSwitchToRegister={handleSwitchToRegister}
                />
              </TabsContent>

              <TabsContent value="register" className="mt-0">
                <RegisterForm
                  onSuccess={handleSuccess}
                  onSwitchToLogin={handleSwitchToLogin}
                />
              </TabsContent>
            </Tabs>

            <ServerConfigSection />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
