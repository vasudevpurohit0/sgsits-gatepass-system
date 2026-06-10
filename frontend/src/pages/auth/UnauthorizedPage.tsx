import React from 'react';
import { Link } from 'react-router-dom';

export const UnauthorizedPage: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--bg-base)', color: 'var(--text-main)', textAlign: 'center', padding: '2rem' }}>
      <h1 style={{ fontSize: '4rem', color: '#ef4444', marginBottom: '1rem', fontWeight: 800 }}>403</h1>
      <h2 style={{ fontSize: '1.75rem', marginBottom: '1rem', fontWeight: 700 }}>Access Denied</h2>
      <p style={{ color: '#94a3b8', maxWidth: '450px', marginBottom: '2rem', lineHeight: 1.5 }}>
        You do not have the required authorization level to access this screen. If you believe this is an error, please contact the portal administrator.
      </p>
      <Link to="/dashboard" className="btn btn-primary btn-large" style={{ textDecoration: 'none' }}>
        Return to Dashboard
      </Link>
    </div>
  );
};

export default UnauthorizedPage;
