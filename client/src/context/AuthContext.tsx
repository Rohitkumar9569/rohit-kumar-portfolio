// File: client/src/context/AuthContext.tsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import API from '../api';
// Define the shape of the context state
interface AuthContextType {
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  role: 'admin' | 'user' | null;
}

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getTokenPayload = (token: string): { exp?: number; role?: 'admin' | 'user' } => {
  try {
    if (typeof window === 'undefined') return {};
    const base64Url = token.split('.')[1] || '';
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    return JSON.parse(window.atob(padded));
  } catch {
    return {};
  }
};

const getTokenExpiryMs = (token: string) => {
  const payload = getTokenPayload(token);
  return typeof payload.exp === 'number' ? payload.exp * 1000 : 0;
};

const isTokenExpired = (token: string) => {
  const expiry = getTokenExpiryMs(token);
  return !expiry || expiry <= Date.now();
};

const readStoredToken = () => {
  if (typeof window === 'undefined') return null;
  const storedToken = window.localStorage.getItem('authToken');
  if (!storedToken) return null;

  if (isTokenExpired(storedToken)) {
    window.localStorage.removeItem('authToken');
    return null;
  }

  return storedToken;
};

// Create the provider component
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(readStoredToken);

  // Use an effect to set up axios interceptors when the token changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (token) {
      // If we have a token, set it in localStorage
      window.localStorage.setItem('authToken', token);
      // Set the Authorization header for all future axios requests
      API.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      // If there's no token, remove it from localStorage and the axios header
      window.localStorage.removeItem('authToken');
      delete API.defaults.headers.common['Authorization'];
    }
  }, [token]);

  useEffect(() => {
    const interceptorId = API.interceptors.response.use(
      response => response,
      error => {
        if (error.response?.status === 401) {
          setToken(null);
        }
        return Promise.reject(error);
      }
    );

    return () => {
      API.interceptors.response.eject(interceptorId);
    };
  }, []);

  useEffect(() => {
    if (!token) return;

    const expiry = getTokenExpiryMs(token);
    if (!expiry || expiry <= Date.now()) {
      setToken(null);
      return;
    }

    const timeoutId = window.setTimeout(() => setToken(null), expiry - Date.now());
    return () => window.clearTimeout(timeoutId);
  }, [token]);

  const login = (newToken: string) => {
    setToken(newToken);
  };

  const logout = () => {
    setToken(null);
  };

  const isAuthenticated = !!token;
  const role = token ? getTokenPayload(token).role || null : null;
  const isAdmin = role === 'admin';

  return (
    <AuthContext.Provider value={{ token, login, logout, isAuthenticated, isAdmin, role }}>
      {children}
    </AuthContext.Provider>
  );
};

// Create a custom hook for easy access to the context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
