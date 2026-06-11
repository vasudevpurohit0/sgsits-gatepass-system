import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useAuth } from '../hooks/useAuth';
import { clearCredentials } from '../redux/slices/authSlice';
import { AlertCircle, RefreshCw, LogIn } from 'lucide-react';
import type { UserRole } from '../types/auth.types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

/**
 * Route guard restricting access to authenticated users with specified roles
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, isLoading, checkAuthSession } = useAuth();
  const location = useLocation();
  const dispatch = useDispatch();
  const [showDiagnostic, setShowDiagnostic] = useState(false);

  useEffect(() => {
    let timer: any;
    if (isLoading) {
      timer = setTimeout(() => {
        setShowDiagnostic(true);
      }, 4000); // Show diagnostics after 4 seconds of loading
    } else {
      setShowDiagnostic(false);
    }
    return () => clearTimeout(timer);
  }, [isLoading]);

  const handleBypass = () => {
    localStorage.removeItem('accessToken');
    dispatch(clearCredentials());
  };

  const handleRetry = () => {
    setShowDiagnostic(false);
    checkAuthSession();
  };

  const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

  // Show indicator if session details are currently loading
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: 'var(--bg-base)',
        color: 'var(--text-main)',
        padding: '24px',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        {!showDiagnostic ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <div className="animate-spin" style={{
              width: '40px',
              height: '40px',
              border: '4px solid var(--primary-light, #e2e8f0)',
              borderTopColor: 'var(--primary, #0f172a)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <p style={{ fontWeight: 500, fontSize: '1.1rem' }}>Verifying secure session...</p>
          </div>
        ) : (
          <div style={{
            maxWidth: '480px',
            width: '100%',
            backgroundColor: 'var(--bg-card, #ffffff)',
            borderRadius: '12px',
            border: '1px solid var(--border-color, #e2e8f0)',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
            padding: '32px',
            color: 'var(--text-main, #0f172a)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <AlertCircle size={28} color="var(--danger, #ef4444)" />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Connection diagnostics</h2>
            </div>
            
            <p style={{ fontSize: '0.95rem', color: 'var(--text-muted, #475569)', marginBottom: '20px', lineHeight: 1.6 }}>
              The secure session verification is taking longer than expected. This usually happens when the frontend cannot communicate with the backend API.
            </p>

            <div style={{
              backgroundColor: 'var(--bg-subtle, #f8fafc)',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '24px',
              border: '1px solid var(--border-color, #e2e8f0)',
            }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                Configured API endpoint
              </div>
              <code style={{ fontSize: '0.85rem', wordBreak: 'break-all', fontFamily: 'monospace', color: 'var(--primary, #0f172a)', fontWeight: 600 }}>
                {apiBaseUrl}
              </code>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={handleRetry}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '12px',
                  backgroundColor: 'var(--primary, #0f172a)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'var(--primary-dark, #1e293b)')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'var(--primary, #0f172a)')}
              >
                <RefreshCw size={18} />
                Retry connection
              </button>

              <button
                onClick={handleBypass}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '12px',
                  backgroundColor: 'transparent',
                  color: 'var(--text-main, #0f172a)',
                  border: '1px solid var(--border-color, #e2e8f0)',
                  borderRadius: '6px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle, #f8fafc)')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <LogIn size={18} />
                Go to login page
              </button>
            </div>
            
            <div style={{ marginTop: '24px', fontSize: '0.8rem', color: 'var(--text-muted, #64748b)', textAlign: 'center' }}>
              Verify that the <code style={{ fontFamily: 'monospace' }}>VITE_API_URL</code> environment variable is set correctly in your deployment.
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!isAuthenticated) {
    // Save attempted route location for redirection after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // User does not possess the correct authorization level
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
