import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, getAuthToken, setAuthToken, clearAuthToken } from '../api/client';

export interface User {
  id: string;
  email: string;
  full_name?: string;
  is_superuser: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string) => Promise<void>;
  logout: () => void;
}

const defaultAuthContext: AuthContextType = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  login: async () => {},
  register: async () => {},
  logout: () => {},
};

export const AuthContext = createContext<AuthContextType>(defaultAuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = async () => {
    const token = getAuthToken();
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const res = await api.getMe();
      if (res.success && res.data) {
        setUser(res.data);
      } else {
        clearAuthToken();
        setUser(null);
      }
    } catch {
      clearAuthToken();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.login({ email, password });
    if (res.success && res.data?.access_token) {
      setAuthToken(res.data.access_token);
      setUser(res.data.user);
    }
  };

  const register = async (email: string, password: string, fullName?: string) => {
    await api.register({ email, password, full_name: fullName });
    await login(email, password);
  };

  const logout = () => {
    clearAuthToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  return context || defaultAuthContext;
};
