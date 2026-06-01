'use client';

import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { User } from '@/types';
import { login as apiLogin } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;
const TOKEN_KEY = 'token';
const USER_KEY = 'user';
const EXPIRES_AT_KEY = 'authExpiresAt';

type AuthState = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
};

type AuthAction =
  | { type: 'hydrate'; user: User | null; token: string | null }
  | { type: 'login'; user: User; token: string }
  | { type: 'logout' };

const initialState: AuthState = { user: null, token: null, isLoading: true };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'hydrate':
      return { user: action.user, token: action.token, isLoading: false };
    case 'login':
      return { user: action.user, token: action.token, isLoading: false };
    case 'logout':
      return { user: null, token: null, isLoading: false };
  }
}

function readStoredAuth(): { user: User | null; token: string | null } {
  if (typeof window === 'undefined') return { user: null, token: null };
  const storedToken = localStorage.getItem(TOKEN_KEY);
  const storedUser = localStorage.getItem(USER_KEY);
  const storedExpiresAt = Number(localStorage.getItem(EXPIRES_AT_KEY) ?? 0);

  if (!storedToken || !storedUser) return { user: null, token: null };

  if (!storedExpiresAt || storedExpiresAt <= Date.now()) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(EXPIRES_AT_KEY);
    return { user: null, token: null };
  }

  try {
    const parsedUser = JSON.parse(storedUser) as User;
    return { user: parsedUser, token: storedToken };
  } catch {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(EXPIRES_AT_KEY);
    return { user: null, token: null };
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const { user, token } = readStoredAuth();
    dispatch({ type: 'hydrate', user, token });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiLogin(email, password);
    localStorage.setItem(TOKEN_KEY, data.access_token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    localStorage.setItem(EXPIRES_AT_KEY, String(Date.now() + SESSION_DURATION_MS));
    dispatch({ type: 'login', user: data.user, token: data.access_token });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(EXPIRES_AT_KEY);
    dispatch({ type: 'logout' });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user: state.user,
        token: state.token,
        isAuthenticated: !!state.token && !!state.user,
        isLoading: state.isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
