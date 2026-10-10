import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  UtensilsCrossed,
  FlaskConical,
  GitCompare,
  ClipboardCheck,
  Database,
  LogOut,
  Globe,
  ChevronDown,
  Menu,
  X,
  Sparkles,
} from 'lucide-react';
import { useAuthStore } from '@/features/auth/auth-store';
import { Button } from '@/shared/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { NotificationPopover } from './NotificationPopover';

export function AppLayout() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, updateUserLocale, hasPermission } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile drawer when location changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleToggleLocale = () => {
    const nextLocale = i18n.language === 'th' ? 'en' : 'th';
    updateUserLocale(nextLocale);
  };

  const navItems = [
    {
      to: '/recipes',
      label: t('nav.recipes'),
      icon: UtensilsCrossed,
      show: hasPermission('recipes.read'),
    },
    {
      to: '/trials',
      label: t('nav.trials'),
      icon: FlaskConical,
      show: hasPermission('trials.read'),
    },
    {
      to: '/trials/compare',
      label: t('nav.trials_compare'),
      icon: GitCompare,
      show: hasPermission('trials.read'),
    },
    {
      to: '/checklist',
      label: t('nav.checklist'),
      icon: ClipboardCheck,
      show: true,
    },
    {
      to: '/masterdata',
      label: t('nav.masterdata'),
      icon: Database,
      show: hasPermission('masterdata.read'),
    },
  ];

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* ============================================================== */}
      {/* 1. Desktop Left Sidebar (Fixed / Sticky)                       */}
      {/* ============================================================== */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-200 bg-white shrink-0 sticky top-0 h-screen z-30">
        {/* Brand Header */}
        <div className="h-16 px-4 border-b border-slate-100 flex items-center gap-3">
          <NavLink to="/recipes" className="flex items-center gap-2.5 group min-w-0">
            <img
              src="/logo_1.png"
              alt="หมูกรอบ มี จำกัด"
              className="h-10 w-10 rounded-full object-contain drop-shadow-xs group-hover:scale-105 transition-transform shrink-0"
            />
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sm text-slate-900 tracking-tight leading-none group-hover:text-orange-600 transition-colors truncate">
                {t('app.title', 'หมูกรอบ มี จำกัด')}
              </span>
              <span className="text-[10px] text-slate-400 font-medium tracking-wide uppercase mt-1 truncate">
                Crispy Pork System
              </span>
            </div>
          </NavLink>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {t('nav.main_menu', 'เมนูหลัก')}
          </div>
          {navItems
            .filter((item) => item.show)
            .map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/recipes' || item.to === '/trials'}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-orange-50 text-orange-600 font-semibold shadow-2xs border border-orange-200/60'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        className={`h-4 w-4 shrink-0 transition-colors ${
                          isActive ? 'text-orange-600' : 'text-slate-400 group-hover:text-slate-600'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
        </nav>

        {/* Bottom Status & User Quick Info */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50 space-y-2">
          {/* System Badge */}
          <div className="px-3 py-2 rounded-lg bg-orange-50/70 border border-orange-200/60 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-orange-500 shrink-0" />
              <span className="text-[11px] font-semibold text-orange-950">Enterprise QC</span>
            </div>
            <span className="text-[10px] text-orange-600 font-mono font-medium">v1.2</span>
          </div>

          {/* User Bar */}
          <div className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-100/80 transition-colors">
            <div className="h-8 w-8 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-xs uppercase border border-orange-200 shrink-0">
              {user?.displayName ? user.displayName.slice(0, 2) : 'MK'}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-semibold text-slate-800 truncate leading-snug">
                {user?.displayName}
              </span>
              <span className="text-[10px] text-slate-400 truncate leading-none">
                {user?.email}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await logout();
                navigate('/login');
              }}
              className="h-7 w-7 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 shrink-0"
              title={t('auth.logout')}
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </aside>

      {/* ============================================================== */}
      {/* 2. Mobile Responsive Drawer                                    */}
      {/* ============================================================== */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer Container */}
          <div className="relative w-72 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="h-16 px-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <img
                  src="/logo_1.png"
                  alt="หมูกรอบ มี จำกัด"
                  className="h-10 w-10 rounded-full object-contain drop-shadow-xs"
                />
                <div className="flex flex-col">
                  <span className="font-bold text-sm text-slate-900 leading-none">
                    {t('app.title', 'หมูกรอบ มี จำกัด')}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1">Crispy Pork System</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileMenuOpen(false)}
                className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Drawer Nav Links */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {t('nav.main_menu', 'เมนูหลัก')}
              </div>
              {navItems
                .filter((item) => item.show)
                .map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === '/recipes' || item.to === '/trials'}
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                          isActive
                            ? 'bg-orange-50 text-orange-600 font-semibold border border-orange-200/60'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                        }`
                      }
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
            </nav>

            {/* Drawer User Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-8 w-8 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-xs uppercase border border-orange-200 shrink-0">
                    {user?.displayName ? user.displayName.slice(0, 2) : 'MK'}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-slate-800 truncate">
                      {user?.displayName}
                    </span>
                    <span className="text-[10px] text-slate-400 truncate">
                      {user?.email}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    setMobileMenuOpen(false);
                    await logout();
                    navigate('/login');
                  }}
                  className="text-red-600 hover:bg-red-50 text-xs px-2 h-8 shrink-0"
                >
                  <LogOut className="h-4 w-4 mr-1" />
                  {t('auth.logout')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. Main Content Area & Sticky Top Bar                          */}
      {/* ============================================================== */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Header */}
        <header className="sticky top-0 z-20 h-16 border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Left: Mobile Toggle & Mobile Logo */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-1.5 h-9 w-9 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </Button>

            {/* Mobile Title */}
            <div className="flex items-center gap-2 md:hidden">
              <img
                src="/logo_1.png"
                alt="หมูกรอบ มี จำกัด"
                className="h-8 w-8 rounded-full object-contain drop-shadow-xs"
              />
              <span className="font-bold text-sm text-slate-900">
                {t('app.title', 'หมูกรอบ มี จำกัด')}
              </span>
            </div>

            {/* Desktop Quick Header Breadcrumb / Brand Text */}
            <div className="hidden md:flex items-center gap-2 text-xs font-medium text-slate-400">
              <span>{t('app.title', 'หมูกรอบ มี จำกัด')}</span>
              <span>/</span>
              <span className="text-slate-700 font-semibold capitalize">
                {navItems.find((n) => location.pathname.startsWith(n.to))?.label || ''}
              </span>
            </div>
          </div>

          {/* Right: Actions (Language, Notification, User Dropdown) */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Language Switcher */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleLocale}
              className="text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 h-9 px-2.5"
              title="Switch Language"
            >
              <Globe className="h-3.5 w-3.5 text-slate-500" />
              <span>{i18n.language === 'th' ? 'TH' : 'EN'}</span>
            </Button>

            {/* Real-time Notification Popover */}
            <NotificationPopover />

            {/* User Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 pl-2 pr-3 py-1.5 h-9 text-slate-700 hover:bg-slate-100 rounded-full"
                >
                  <div className="h-7 w-7 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-xs uppercase border border-orange-200">
                    {user?.displayName ? user.displayName.slice(0, 2) : 'MK'}
                  </div>
                  <span className="text-xs font-medium hidden sm:inline-block max-w-[120px] truncate">
                    {user?.displayName}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-semibold text-slate-900 leading-none">
                      {user?.displayName}
                    </p>
                    <p className="text-xs text-slate-500 leading-none truncate">{user?.email}</p>
                    <div className="pt-1 flex flex-wrap gap-1">
                      {user?.roles.map((r) => (
                        <span
                          key={r}
                          className="inline-block px-1.5 py-0.5 text-[10px] rounded bg-orange-50 text-orange-700 font-semibold border border-orange-200"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    await logout();
                    navigate('/login');
                  }}
                  className="text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  {t('auth.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main Routed Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
          <p>© 2026 {t('app.title', 'หมูกรอบ มี จำกัด')} — Enterprise Crispy Pork Quality Control System</p>
        </footer>
      </div>
    </div>
  );
}
