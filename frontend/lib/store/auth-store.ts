import { create } from 'zustand';
import { authApi, type User } from '@/lib/api/auth';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  setAuth: (user: User, token: string) => void;
  setUser: (user: User) => void;
  logout: () => void;

  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string, fullName?: string, role?: string) => Promise<User>;
  fetchUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,

  setAuth: (user, token) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
    set({ user, token, isAuthenticated: true });
  },

  setUser: (user) => set({ user }),

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
    set({ user: null, token: null, isAuthenticated: false });
  },

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const data = await authApi.login(email, password);
      if (typeof window !== 'undefined') {
        localStorage.setItem('auth_token', data.access_token);
      }
      set({ user: data.user, token: data.access_token, isAuthenticated: true });
      return data.user;
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (email, password, fullName, role = 'CANDIDATE') => {
    set({ isLoading: true });
    try {
      const data = await authApi.register({ email, password, full_name: fullName, role });
      if (typeof window !== 'undefined') {
        localStorage.setItem('auth_token', data.access_token);
      }
      set({ user: data.user, token: data.access_token, isAuthenticated: true });
      return data.user;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchUser: async () => {
    set({ isLoading: true });
    try {
      const user = await authApi.me();
      set({ user, isAuthenticated: true });
    } catch {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
      }
      set({ user: null, token: null, isAuthenticated: false });
    } finally {
      set({ isLoading: false });
    }
  },
}));
