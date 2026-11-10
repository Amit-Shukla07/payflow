import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Wallet } from '../types/index.js';
import { authApi, walletApi } from '../services/api.js';

interface AuthContextType {
  user: User | null;
  wallet: Wallet | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshWallet: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('payflow_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('payflow_token');
  });
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshWallet = async () => {
    if (!token) return;
    try {
      const res = await walletApi.getWallet();
      if (res.success && res.data) {
        setWallet(res.data);
      }
    } catch (err) {
      console.error('Failed to refresh wallet:', err);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('payflow_token');
      if (storedToken) {
        try {
          const res = await authApi.getMe();
          if (res.success && res.data) {
            setUser(res.data.user);
            setWallet(res.data.wallet);
            localStorage.setItem('payflow_user', JSON.stringify(res.data.user));
          }
        } catch {
          // Token is invalid/expired
          localStorage.removeItem('payflow_token');
          localStorage.removeItem('payflow_user');
          setUser(null);
          setToken(null);
          setWallet(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, [token]);

  const login = async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    if (res.success && res.data) {
      setUser(res.data.user);
      setToken(res.data.token);
      setWallet(res.data.wallet);
      localStorage.setItem('payflow_token', res.data.token);
      localStorage.setItem('payflow_user', JSON.stringify(res.data.user));
    }
  };

  const register = async (name: string, email: string, password: string) => {
    const res = await authApi.register({ name, email, password });
    if (res.success && res.data) {
      setUser(res.data.user);
      setToken(res.data.token);
      setWallet(res.data.wallet);
      localStorage.setItem('payflow_token', res.data.token);
      localStorage.setItem('payflow_user', JSON.stringify(res.data.user));
    }
  };

  const logout = () => {
    localStorage.removeItem('payflow_token');
    localStorage.removeItem('payflow_user');
    setUser(null);
    setToken(null);
    setWallet(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        wallet,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        register,
        logout,
        refreshWallet,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

