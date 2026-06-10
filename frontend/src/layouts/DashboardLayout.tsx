import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../hooks/usePermissions';
import { 
  LayoutDashboard, 
  Ticket, 
  Users, 
  Scan, 
  ClipboardList, 
  LogOut,
  Menu 
} from 'lucide-react';

export const DashboardLayout: React.FC = () => {
  const { user, logoutUser } = useAuth();
  const { can } = usePermissions();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigationItems = [
    {
      name: 'Overview',
      path: '/dashboard',
      icon: <LayoutDashboard size={20} />,
      show: true,
    },
    {
      name: 'Gate Passes',
      path: '/passes',
      icon: <Ticket size={20} />,
      show: can('create_pass') || can('approve_pass') || can('scan_qr'),
    },
    {
      name: 'Visitors Directory',
      path: '/visitors',
      icon: <Users size={20} />,
      show: ['SECURITY_ADMIN', 'UNIVERSITY_ADMIN', 'SUPER_ADMIN', 'SECURITY_GUARD'].includes(user?.role || ''),
    },
    {
      name: 'Gate Terminal',
      path: '/terminal',
      icon: <Scan size={20} />,
      show: can('scan_qr'),
    },
    {
      name: 'System Logs',
      path: '/audit',
      icon: <ClipboardList size={20} />,
      show: ['SECURITY_ADMIN', 'UNIVERSITY_ADMIN', 'SUPER_ADMIN'].includes(user?.role || ''),
    },
  ];

  return (
    <div className="dashboard-layout" style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-base)', color: 'var(--text-main)' }}>
      {/* Sidebar navigation */}
      <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''}`} style={{
        width: '260px',
        backgroundColor: '#002147',
        borderRight: '1px solid #003366',
        display: 'flex',
        flexDirection: 'column',
        padding: '1.5rem',
        boxSizing: 'border-box',
        transition: 'all 0.3s ease',
        color: '#ffffff',
      }}>
        <div className="sidebar-brand" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2.5rem' }}>
          <img 
            src="/SGSITS_LOGO.png" 
            alt="SGSITS Logo" 
            style={{ 
              width: '38px', 
              height: '38px', 
              objectFit: 'contain', 
              flexShrink: 0, 
              backgroundColor: '#ffffff', 
              borderRadius: '50%', 
              padding: '2px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
            }} 
          />
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#ffffff', letterSpacing: '0.05em' }}>SGSITS</h2>
            <span style={{ fontSize: '0.725rem', color: '#cbd5e1', display: 'block', fontWeight: 500, lineHeight: '1.2', marginTop: '2px' }}>Visitor Entry-Exit System</span>
          </div>
        </div>

        <nav className="sidebar-nav" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flexGrow: 1 }}>
          {navigationItems.filter(item => item.show).map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
            return (
              <button
                key={item.name}
                onClick={() => {
                  navigate(item.path);
                  setMobileMenuOpen(false);
                }}
                className={`nav-button ${isActive ? 'active' : ''}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '0.85rem 1.25rem',
                  border: 'none',
                  borderRadius: '8px',
                  background: isActive ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'transparent',
                  color: isActive ? '#ffffff' : '#cbd5e1',
                  fontSize: '0.9375rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.color = '#ffffff';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#cbd5e1';
                  }
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center' }}>{item.icon}</span>
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer" style={{ borderTop: '1px solid #003366', paddingTop: '1.5rem', marginTop: 'auto' }}>
          <div className="user-profile" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '1rem',
              color: '#ffffff',
              flexShrink: 0,
            }}>
              {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <span style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#ffffff', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {user?.firstName} {user?.lastName}
              </span>
              <span style={{
                fontSize: '0.7rem',
                color: '#93c5fd',
                textTransform: 'uppercase',
                backgroundColor: 'rgba(59, 130, 246, 0.25)',
                padding: '2px 8px',
                borderRadius: '4px',
                fontWeight: 'bold',
                display: 'inline-block',
                marginTop: '2px',
              }}>
                {user?.role?.replace('_', ' ')}
              </span>
            </div>
          </div>
          <button
            onClick={logoutUser}
            className="btn btn-secondary w-full"
            style={{ borderColor: '#ef4444', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main content wrapper */}
      <div className="dashboard-content-wrapper" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Header */}
        <header className="dashboard-header" style={{
          height: '70px',
          backgroundColor: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 2rem',
          boxSizing: 'border-box',
        }}>
          <button
            className="mobile-menu-trigger"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              display: 'none',
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              color: 'var(--text-main)',
              cursor: 'pointer',
            }}
          >
            <Menu size={24} />
          </button>
          
          <div className="dashboard-header-title">
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-h)' }}>
              {navigationItems.find(item => location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path)))?.name || 'Dashboard'}
            </h1>
          </div>

          <div className="dashboard-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            {/* Connection Status Indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              <span className="dot pulse green" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
              <span>Secure Connection</span>
            </div>
          </div>
        </header>

        {/* Content Pane */}
        <main className="dashboard-main-content" style={{ flexGrow: 1, padding: '2rem', boxSizing: 'border-box', overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
