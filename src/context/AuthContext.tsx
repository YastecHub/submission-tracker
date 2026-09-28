import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import axios from 'axios';
import { getCurrentUser, signIn } from '../features/auth/api/auth';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  sessionError: boolean;
  retrySession: () => void;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState(false);
  const sessionVersion = useRef(0);
  const activeRestore = useRef<AbortController | null>(null);

  const restoreSession = useCallback(() => {
    activeRestore.current?.abort();
    const token = localStorage.getItem('token');
    const controller = new AbortController();
    activeRestore.current = controller;
    const version = sessionVersion.current;
    const isCurrent = () => !controller.signal.aborted && version === sessionVersion.current;
    setSessionError(false);
    setLoading(true);
    if (token) {
      getCurrentUser(controller.signal)
        .then((user) => { if (isCurrent()) setUser(user); })
        .catch((error: unknown) => {
          if (isCurrent() && axios.isAxiosError(error) && error.response?.status === 401) {
            localStorage.removeItem('token');
            setUser(null);
          } else if (isCurrent()) {
            setSessionError(true);
          }
        })
        .finally(() => { if (isCurrent()) setLoading(false); });
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    restoreSession();
    return () => activeRestore.current?.abort();
  }, [restoreSession]);

  async function login(email: string, password: string): Promise<User> {
    const version = ++sessionVersion.current;
    activeRestore.current?.abort();
    setSessionError(false);
    try {
      const result = await signIn(email, password);
      if (version === sessionVersion.current) {
        localStorage.setItem('token', result.token);
        setUser(result.user);
      }
      return result.user;
    } finally {
      if (version === sessionVersion.current) setLoading(false);
    }
  }

  function logout(): void {
    sessionVersion.current += 1;
    activeRestore.current?.abort();
    localStorage.removeItem('token');
    setUser(null);
    setLoading(false);
    setSessionError(false);
  }

  return (
    <AuthContext.Provider value={{ user, loading, sessionError, retrySession: restoreSession, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
