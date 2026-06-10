import React from 'react';
import { Outlet } from 'react-router-dom';

export const AuthLayout: React.FC = () => {
  return (
    <div className="auth-layout-container">
      <div className="auth-card-wrapper">
        <div className="auth-brand-pane">
          <div className="auth-brand-text-container">
            <h2 className="auth-brand-title">
              <span className="title-line-1">Visitor Entry-Exit</span>
              <span className="title-line-2">System</span>
            </h2>
            <p className="auth-brand-subtitle">SGSITS</p>
          </div>
        </div>
        
        {/* SGSITS Logo centered on the vertical boundary line */}
        <div className="auth-logo-circle">
          <img 
            src="/SGSITS_LOGO.png" 
            alt="SGSITS Logo" 
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain'
            }} 
          />
        </div>

        <div className="auth-form-pane">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
