import { atom, selector } from 'recoil';

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

export interface AuthState {
  user: User | null;
  token: string | null;
}

const TOKEN_KEY = 'iclms_token';
const USER_KEY = 'iclms_user';

// Load initial state from localStorage
const loadInitialState = (): AuthState => {
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

export const authTokenState = atom<string | null>({
  key: 'authTokenState',
  default: initialState.token,
});

export const userState = atom<User | null>({
  key: 'userState',
  default: initialState.user,
});

export const isAuthenticatedState = selector<boolean>({
  key: 'isAuthenticatedState',
  get: ({ get }) => {
    const token = get(authTokenState);
    const user = get(userState);
    return token !== null && user !== null;
  },
});

// Helper functions to persist auth state
export const persistAuthState = (token: string, user: User) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const clearAuthState = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};
