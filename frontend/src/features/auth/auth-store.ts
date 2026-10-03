import { create } from 'zustand';
import { http, setAccessToken } from '@/shared/lib/http/client';
import { wsManager } from '@/shared/lib/ws/ws-client';
import { setLocale } from '@/shared/i18n';

export interface User {
  id: string;
  email: string;
  displayName: string;
  locale: 'th' | 'en';
  roles: string[];
  permissions: string[];
}

interface AuthResult {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: User;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateUserLocale: (locale: 'th' | 'en') => void;
  hasPermission: (perm: string) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email, password) => {
    const res = await http.post<AuthResult>('/auth/login', { email, password }, { skipAuth: true });
    setAccessToken(res.accessToken);
    set({ user: res.user, isAuthenticated: true, isLoading: false });
    if (res.user.locale) {
      setLocale(res.user.locale);
    }
    wsManager.connect();
  },

  logout: async () => {
    try {
      await http.post('/auth/logout');
    } catch {
      // Ignore logout errors
    } finally {
      setAccessToken(null);
      wsManager.disconnect();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      // First try to refresh using existing httpOnly cookie
      const res = await http.post<AuthResult>('/auth/refresh', {}, { skipAuth: true });
      if (res && res.accessToken) {
        setAccessToken(res.accessToken);
        set({ user: res.user, isAuthenticated: true, isLoading: false });
        if (res.user.locale) {
          setLocale(res.user.locale);
        }
        wsManager.connect();
        return;
      }
    } catch {
      // Cookie invalid or absent
    }
    setAccessToken(null);
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  updateUserLocale: (locale) => {
    const u = get().user;
    if (u) {
      set({ user: { ...u, locale } });
    }
    setLocale(locale);
  },

  hasPermission: (perm) => {
    const u = get().user;
    if (!u) return false;
    if (u.roles.includes('OWNER')) return true;
    return u.permissions.includes(perm);
  },
}));
