import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  AUTH_EXPIRED_EVENT,
  apiRequest,
  isAuthenticated,
  login as loginRequest,
  logout as logoutRequest,
} from '@/lib/api';

interface MeResponse {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  role?: { name: string };
  clinic?: number | null;
  branch?: number | null;
  allowed_pages: string[];
}

interface AuthContextValue {
  user: MeResponse | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
  hasPageAccess: (pageCode: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = async () => {
    if (!isAuthenticated()) {
      setUser(null);
      return;
    }
    try {
      const me = await apiRequest<MeResponse>('/auth/me/');
      setUser(me);
    } catch (error) {
      const status = (error as { status?: number })?.status;
      if (status === 401) {
        logoutRequest();
        setUser(null);
        return;
      }
      throw error;
    }
  };

  const login = async (username: string, password: string) => {
    await loginRequest(username, password);
    await refreshMe();
  };

  const logout = () => {
    logoutRequest();
    setUser(null);
  };

  useEffect(() => {
    refreshMe().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onAuthExpired = () => {
      logoutRequest();
      setUser(null);
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onAuthExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onAuthExpired);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      refreshMe,
      hasPageAccess: (pageCode: string) => Boolean(user?.allowed_pages?.includes(pageCode)),
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
