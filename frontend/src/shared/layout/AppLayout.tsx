import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  LogOut,
  Globe,
  ChevronDown,
  Menu,
  X,
  Sparkles,
  MoreHorizontal,
  KeyRound,
} from 'lucide-react';
import { useAuthStore } from '@/features/auth/auth-store';
import { ChangePasswordModal } from '@/features/auth/components/ChangePasswordModal';
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
import { LiquidBottomNav, type LiquidNavItem } from './LiquidBottomNav';
import { NAV_ITEMS, BRAND } from '@/shared/config/navigation';

export function AppLayout() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, updateUserLocale, hasPermission } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  // The only scrollable region in the app shell (header & bottom nav stay fixed).
  const contentScrollRef = useRef<HTMLDivElement>(null);

  // Close mobile drawer and start every page from the top on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    contentScrollRef.current?.scrollTo({ top: 0 });
  }, [location.pathname]);

  const handleToggleLocale = () => {
    const nextLocale = i18n.language === 'th' ? 'en' : 'th';
    updateUserLocale(nextLocale);
  };

  // Filter items based on user permissions
  const authorizedNavItems = NAV_ITEMS.filter(
    (item) => !item.permission || hasPermission(item.permission),
  );

  // Primary items for mobile bottom bar (first 4 items, remainder accessible via More/drawer)
  const mobilePrimaryItems = authorizedNavItems.filter((item) => item.mobilePrimary).slice(0, 4);

  // Determine active item in mobile bottom bar
  const currentActivePrimary = mobilePrimaryItems.find((item) =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to),
  );
  const activeBottomNavId = mobileMenuOpen
    ? 'more'
    : currentActivePrimary
      ? currentActivePrimary.to
      : 'more';

  const mobileNavItems: LiquidNavItem[] = [
    ...mobilePrimaryItems.map((item) => ({
      id: item.to,
      to: item.to,
      end: item.end,
      label: item.shortLabelKey
        ? t(item.shortLabelKey, { defaultValue: t(item.labelKey) })
        : t(item.labelKey),
      icon: item.icon,
    })),
    {
      id: 'more',
      label: t('common.more', 'เพิ่มเติม'),
      icon: MoreHorizontal,
      onClick: () => setMobileMenuOpen(true),
    },
  ];

  return (
    <div className="h-dvh flex overflow-hidden bg-slate-50 text-slate-900">
      {/* ============================================================== */}
      {/* 1. Desktop Left Sidebar (lg+)                                  */}
      {/* ============================================================== */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-slate-200 bg-white shrink-0 h-full z-30">
        {/* Brand Header */}
        <div className="h-16 px-4 border-b border-slate-100 flex items-center gap-3">
          <NavLink to="/recipes" className="flex items-center gap-2.5 group min-w-0">
            <img
              src={BRAND.logoSrc}
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
          {authorizedNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
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
                    <span className="truncate">{t(item.labelKey)}</span>
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
      {/* 2. Tablet Icon Rail (md -> lg)                                 */}
      {/* ============================================================== */}
      <aside className="hidden md:flex lg:hidden flex-col w-18 border-r border-slate-200 bg-white shrink-0 h-full z-30 items-center py-3">
        {/* Brand Icon */}
        <NavLink to="/recipes" className="p-1 group mb-4">
          <img
            src={BRAND.logoSrc}
            alt="หมูกรอบ มี จำกัด"
            className="h-9 w-9 rounded-full object-contain drop-shadow-xs group-hover:scale-105 transition-transform"
          />
        </NavLink>

        {/* Rail Icons */}
        <nav className="flex-1 w-full px-2 space-y-1.5 flex flex-col items-center">
          {authorizedNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                title={t(item.labelKey)}
                className={({ isActive }) =>
                  `flex items-center justify-center h-10 w-10 rounded-xl transition-all ${
                    isActive
                      ? 'bg-orange-50 text-orange-600 font-semibold border border-orange-200/80 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  }`
                }
              >
                <Icon className="h-5 w-5 shrink-0" />
              </NavLink>
            );
          })}
        </nav>

        {/* Tablet User Avatar */}
        <div className="pt-2 border-t border-slate-100 w-full flex flex-col items-center gap-2">
          <div
            className="h-8 w-8 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-xs uppercase border border-orange-200"
            title={user?.displayName || 'User'}
          >
            {user?.displayName ? user.displayName.slice(0, 2) : 'MK'}
          </div>
        </div>
      </aside>

      {/* ============================================================== */}
      {/* 3. Mobile Responsive Drawer Sheet                              */}
      {/* ============================================================== */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-fade-in"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer Container */}
          <div className="relative w-72 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col z-10 animate-sheet-in-left">
            {/* Drawer Header */}
            <div className="h-16 px-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <img
                  src={BRAND.logoSrc}
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
                className="h-9 w-9 p-0 text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Drawer Nav Links */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {t('nav.main_menu', 'เมนูหลัก')}
              </div>
              {authorizedNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
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
                    <span>{t(item.labelKey)}</span>
                  </NavLink>
                );
              })}
            </nav>

            {/* Drawer User Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/80 pb-[calc(1rem+var(--safe-bottom))]">
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
      {/* 4. Main Content Area & Fixed Top Bar                           */}
      {/* ============================================================== */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header (outside the scroll container → always fixed) */}
        <header className="shrink-0 z-20 h-14 sm:h-16 border-b border-slate-200 bg-white/95 backdrop-blur-md px-3 sm:px-6 lg:px-8 flex items-center justify-between pt-safe">
          {/* Left: Mobile Toggle & Mobile Logo */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-1.5 h-9 w-9 text-slate-600 hover:text-slate-900 hover:bg-slate-100 touch-target"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>

            {/* Mobile Title */}
            <div className="flex items-center gap-2 md:hidden">
              <img
                src={BRAND.logoSrc}
                alt="หมูกรอบ มี จำกัด"
                className="h-7 w-7 rounded-full object-contain drop-shadow-xs"
              />
              <span className="font-bold text-xs sm:text-sm text-slate-900 truncate max-w-[140px] xs:max-w-[180px]">
                {t('app.title', 'หมูกรอบ มี จำกัด')}
              </span>
            </div>

            {/* Desktop Quick Header Breadcrumb */}
            <div className="hidden md:flex items-center gap-2 text-xs font-medium text-slate-400">
              <span>{t('app.title', 'หมูกรอบ มี จำกัด')}</span>
              <span>/</span>
              <span className="text-slate-700 font-semibold capitalize">
                {t(authorizedNavItems.find((n) => location.pathname.startsWith(n.to))?.labelKey || '')}
              </span>
            </div>
          </div>

          {/* Right: Actions (Language, Notification, User Dropdown) */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            {/* Language Switcher */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleLocale}
              className="text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-1 h-9 px-2 sm:px-2.5 touch-target"
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
                  className="flex items-center gap-2 pl-1.5 pr-2 sm:pr-3 py-1.5 h-9 text-slate-700 hover:bg-slate-100 rounded-full touch-target"
                >
                  <div className="h-7 w-7 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-xs uppercase border border-orange-200 shrink-0">
                    {user?.displayName ? user.displayName.slice(0, 2) : 'MK'}
                  </div>
                  <span className="text-xs font-medium hidden sm:inline-block max-w-[120px] truncate">
                    {user?.displayName}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400 hidden sm:inline" />
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
                      {user?.roles?.map((r) => (
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
                  onClick={() => setChangePasswordOpen(true)}
                  className="cursor-pointer"
                >
                  <KeyRound className="h-4 w-4 mr-2 text-slate-500" />
                  {t('auth.change_password')}
                </DropdownMenuItem>
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

        {/* Scrollable content region — the ONLY element that scrolls */}
        <div
          ref={contentScrollRef}
          className="flex-1 min-h-0 flex flex-col overflow-y-auto overflow-x-hidden overscroll-contain"
        >
          {/* Main Routed Content — extra bottom padding on mobile for bottom navigation bar */}
          <main className="flex-1 max-w-(--content-max-width) w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 pb-[calc(var(--bottom-nav-height)+var(--safe-bottom)+1.5rem)] md:pb-8">
            <Outlet />
          </main>

          {/* Desktop / Tablet Footer */}
          <footer className="hidden md:block border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
            <p>© 2026 {t('app.title', 'หมูกรอบ มี จำกัด')} — Enterprise Crispy Pork Quality Control System</p>
          </footer>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 5. Mobile Liquid Bottom Navigation (Phones < md)               */}
      {/* ============================================================== */}
      <LiquidBottomNav items={mobileNavItems} activeId={activeBottomNavId} />

      {/* Change Password Modal */}
      <ChangePasswordModal
        open={changePasswordOpen}
        onOpenChange={setChangePasswordOpen}
      />
    </div>
  );
}
