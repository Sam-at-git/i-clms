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
  setAuth: (token: string, user: User) => void;
  clearAuth: () => void;
}

const TOKEN_KEY = 'iclms_token';
const USER_KEY = 'iclms_user';

// Load initial state from localStorage
const loadInitialState = (): { user: User | null; token: string | null } => {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const userJson = localStorage.getItem(USER_KEY);
    const user = userJson ? JSON.parse(userJson) : null;
    return { user, token };
  } catch {
    return { user: null, token: null };
  }
};

const initialState = loadInitialState();

export const useAuthStore = create<AuthState>((set) => ({
  user: initialState.user,
  token: initialState.token,
  isAuthenticated: initialState.token !== null && initialState.user !== null,

  setAuth: (token: string, user: User) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    set({ token, user, isAuthenticated: true });
  },

  clearAuth: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    set({ token: null, user: null, isAuthenticated: false });
  },
}));
