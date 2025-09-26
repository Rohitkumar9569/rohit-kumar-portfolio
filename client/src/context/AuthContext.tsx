// File: client/src/context/AuthContext.tsx
import React, { createContext, useState, useContext, useEffect,} from 'react';
import axios from 'axios';

// Define the shape of the context state
interface AuthContextType {
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Create the provider component
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('authToken'));

  // Use an effect to set up axios interceptors when the token changes
  useEffect(() => {
    if (token) {
      // If we have a token, set it in localStorage
      localStorage.setItem('authToken', token);
      // Set the Authorization header for all future axios requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      // If there's no token, remove it from localStorage and the axios header
      localStorage.removeItem('authToken');
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  const login = (newToken: string) => {
    setToken(newToken);
  };

  const logout = () => {
    setToken(null);
  };

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider value={{ token, login, logout, isAuthenticated }}>
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