import { Outlet, NavLink, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  UtensilsCrossed,
  FlaskConical,
  GitCompare,
  Database,
  LogOut,
  Globe,
  ChevronDown,
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
  const { user, logout, updateUserLocale, hasPermission } = useAuthStore();

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
      to: '/masterdata',
      label: t('nav.masterdata'),
      icon: Database,
      show: hasPermission('masterdata.read'),
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Brand Logo & Name */}
            <div className="flex items-center gap-6">
              <NavLink to="/recipes" className="flex items-center gap-2.5 group">
                <div className="h-9 w-9 rounded-lg bg-orange-600 flex items-center justify-center text-white shadow-md shadow-orange-500/20 group-hover:bg-orange-700 transition-colors">
                  <span className="font-bold text-lg">หมู</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-base text-slate-900 tracking-tight leading-none group-hover:text-orange-600 transition-colors">
                    หมูกรอบ มี จำกัด
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium tracking-wide uppercase mt-0.5">
                    Crispy Pork Shop
                  </span>
                </div>
              </NavLink>

              {/* Navigation Links */}
              <nav className="hidden md:flex items-center gap-1">
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
                          `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                            isActive
                              ? 'bg-orange-50 text-orange-600 font-semibold shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                          }`
                        }
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </NavLink>
                    );
                  })}
              </nav>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-2">
              {/* Language Switcher */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleLocale}
                className="text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5"
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
                    className="flex items-center gap-2 pl-2 pr-3 py-1.5 h-auto text-slate-700 hover:bg-slate-100 rounded-full"
                  >
                    <div className="h-8 w-8 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-xs uppercase border border-orange-200">
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
                      <p className="text-sm font-semibold text-slate-900 leading-none">{user?.displayName}</p>
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
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="md:hidden border-t border-slate-100 px-4 py-2 flex items-center justify-around overflow-x-auto bg-white">
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
                    `flex flex-col items-center gap-1 py-1 px-3 text-xs font-medium rounded ${
                      isActive ? 'text-orange-600 font-semibold' : 'text-slate-500'
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-[11px]">{item.label}</span>
                </NavLink>
              );
            })}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
        <p>© 2026 หมูกรอบ มี จำกัด — Enterprise Crispy Pork Quality Control System</p>
      </footer>
    </div>
  );
}
