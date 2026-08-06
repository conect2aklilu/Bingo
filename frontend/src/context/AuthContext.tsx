import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, setAuthToken } from '../api';
import { connectSocket, disconnectSocket } from '../socket';

interface User {
  id: number;
  username: string;
  is_admin?: boolean;
  isAdmin?: boolean;
  balance: number;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshBalance: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem('bingo_token'));
  const [user, setUser] = useState<User | null>(
    localStorage.getItem('bingo_user') ? JSON.parse(localStorage.getItem('bingo_user')!) : null
  );

  useEffect(() => {
    if (token) {
      setAuthToken(token);
      connectSocket(token);
    }
  }, []);

  function persist(t: string, u: User) {
    localStorage.setItem('bingo_token', t);
    localStorage.setItem('bingo_user', JSON.stringify(u));
    setToken(t);
    setUser(u);
    setAuthToken(t);
    connectSocket(t);
  }

  async function login(username: string, password: string) {
    const telegram = typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined;
    const initData = telegram?.initData;

    const res = initData
      ? await api.post('/auth/telegram/auth', { initData, username, password })
      : await api.post('/auth/login', { username, password });

    persist(res.data.token, res.data.user);
  }

  async function register(username: string, password: string) {
    const telegram = typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined;
    const initData = telegram?.initData;

    const res = initData
      ? await api.post('/auth/telegram/auth', { initData, username, password })
      : await api.post('/auth/register', { username, password });

    persist(res.data.token, res.data.user);
  }

  function logout() {
    localStorage.removeItem('bingo_token');
    localStorage.removeItem('bingo_user');
    setToken(null);
    setUser(null);
    setAuthToken(null);
    disconnectSocket();
  }

  async function refreshBalance() {
    const res = await api.get('/wallet/me');
    const updated = { ...(user as User), balance: res.data.user.balance };
    setUser(updated);
    localStorage.setItem('bingo_user', JSON.stringify(updated));
  }

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, refreshBalance }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
