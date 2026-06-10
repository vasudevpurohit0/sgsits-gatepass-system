import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface GuestRouteProps {
  children: React.ReactNode;
}

/**
 * Route guard redirecting authenticated users away from auth screens
 */
export const GuestRoute: React.FC<GuestRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--bg-base)', color: 'var(--text-main)' }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    const destination = (location.state as any)?.from?.pathname || '/dashboard';
    return <Navigate to={destination} replace />;
  }

  return <>{children}</>;
};

export default GuestRoute;
