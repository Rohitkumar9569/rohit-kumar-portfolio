// File: client/src/components/ProtectedRoute.tsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
  loginPath?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, adminOnly = false, loginPath = '/login' }) => {
  const { isAuthenticated, isAdmin } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    // If the user is not authenticated, redirect them to the login page.
    // We also pass the original location they were trying to visit in the state.
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/app" replace />;
  }

  // If the user is authenticated, render the child component (e.g., the AdminPage).
  return <>{children}</>;
};

export default ProtectedRoute;
