// File: client/src/components/ProtectedRoute.tsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    // If the user is not authenticated, redirect them to the login page.
    // We also pass the original location they were trying to visit in the state.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If the user is authenticated, render the child component (e.g., the AdminPage).
  return <>{children}</>;
};

export default ProtectedRoute;