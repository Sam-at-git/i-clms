import { create } from 'zustand';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  department: {
    id: string;
    name: string;
    code: string;
  };
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  rememberEmail: string;
  setAuth: (token: string, user: User, remember?: boolean) => void;
  clearAuth: () => void;
  setRememberEmail: (email: string) => void;
}

const TOKEN_KEY = 'iclms_token';
const USER_KEY = 'iclms_user';
const REMEMBER_EMAIL_KEY = 'iclms_remember_email';

// Load initial state from localStorage
const loadInitialState = (): {
  user: User | null;
  token: string | null;
  rememberEmail: string;
} => {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const userJson = localStorage.getItem(USER_KEY);
    const user = userJson ? JSON.parse(userJson) : null;
    const rememberEmail = localStorage.getItem(REMEMBER_EMAIL_KEY) || '';
    return { user, token, rememberEmail };
  } catch {
    return { user: null, token: null, rememberEmail: '' };
  }
};

const initialState = loadInitialState();

export const useAuthStore = create<AuthState>((set) => ({
  user: initialState.user,
  token: initialState.token,
  isAuthenticated: initialState.token !== null && initialState.user !== null,
  rememberEmail: initialState.rememberEmail,

  setAuth: (token: string, user: User, remember = false) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    set({ token, user, isAuthenticated: true });
  },

  clearAuth: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    set({ token: null, user: null, isAuthenticated: false });
  },

  setRememberEmail: (email: string) => {
    localStorage.setItem(REMEMBER_EMAIL_KEY, email);
    set({ rememberEmail: email });
  },
}));
