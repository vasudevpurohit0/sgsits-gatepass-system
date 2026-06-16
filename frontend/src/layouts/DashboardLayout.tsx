import React, { useState, useEffect } from 'react';
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
  Menu,
  Clock
} from 'lucide-react';

export const DashboardLayout: React.FC = () => {
  const { user, logoutUser } = useAuth();
  const { can } = usePermissions();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const navigationItems = [
    {
      name: 'Overview',
      path: '/dashboard',
      icon: <LayoutDashboard size={18} />,
      show: true,
    },
    {
      name: 'Gate Passes',
      path: '/passes',
      icon: <Ticket size={18} />,
      show: can('create_pass') || can('approve_pass') || can('scan_qr'),
    },
    {
      name: 'Visitors Directory',
      path: '/visitors',
      icon: <Users size={18} />,
      show: ['SECURITY_ADMIN', 'UNIVERSITY_ADMIN', 'SUPER_ADMIN', 'SECURITY_GUARD'].includes(user?.role || ''),
    },
    {
      name: 'Gate Terminal',
      path: '/terminal',
      icon: <Scan size={18} />,
      show: can('scan_qr'),
    },
    {
      name: 'System Logs',
      path: '/audit',
      icon: <ClipboardList size={18} />,
      show: ['SECURITY_ADMIN', 'UNIVERSITY_ADMIN', 'SUPER_ADMIN'].includes(user?.role || ''),
    },
  ];

  const formatRole = (role: string) => {
    return role ? role.replace(/_/g, ' ') : '';
  };

  return (
    <div className="dashboard-layout" style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-base)', color: 'var(--text-main)' }}>
      {/* Mobile Menu Backdrop */}
      {mobileMenuOpen && (
        <div 
          className="sidebar-backdrop" 
          onClick={() => setMobileMenuOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            zIndex: 999,
          }}
        />
      )}

      {/* Sidebar navigation */}
      <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''}`} style={{
        width: '260px',
        display: 'flex',
        flexDirection: 'column',
        padding: '1.5rem',
        boxSizing: 'border-box',
        transition: 'all 0.3s ease',
        color: '#ffffff',
      }}>
        {/* Subtle Institutional Identity Header */}
        <div className="sidebar-identity">
          <img 
            src="/SGSITS_LOGO.png" 
            alt="SGSITS Logo" 
            className="sidebar-logo-img"
          />
          <div className="sidebar-identity-text">
            <h3 className="sidebar-identity-title">SGSITS</h3>
            <span className="sidebar-identity-subtitle">Visitor Access</span>
            <span className="sidebar-identity-tagline">Security Control Platform</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navigationItems.filter(item => item.show).map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
            return (
              <button
                key={item.name}
                onClick={() => {
                  navigate(item.path);
                  setMobileMenuOpen(false);
                }}
                className={`nav-item-custom ${isActive ? 'active' : ''}`}
                style={{
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center' }}>{item.icon}</span>
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.25rem', marginTop: 'auto' }}>
          <div className="user-profile" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: '#0056b3',
              border: '1.5px solid rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.875rem',
              color: '#ffffff',
              flexShrink: 0,
            }}>
              {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <span style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#ffffff', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {user?.firstName} {user?.lastName}
              </span>
              <span style={{
                fontSize: '0.65rem',
                color: '#cbd5e1',
                textTransform: 'uppercase',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                padding: '2px 6px',
                borderRadius: '10px',
                fontWeight: '700',
                display: 'inline-block',
                marginTop: '2px',
                letterSpacing: '0.02em',
              }}>
                {formatRole(user?.role || '')}
              </span>
            </div>
          </div>
          <button
            onClick={logoutUser}
            className="btn btn-secondary w-full"
            style={{ 
              backgroundColor: 'rgba(239, 68, 68, 0.08)', 
              borderColor: 'rgba(239, 68, 68, 0.2)', 
              color: '#f87171', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '0.5rem',
              padding: '0.55rem 1rem',
              fontSize: '0.8125rem',
              borderRadius: '20px'
            }}
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main content wrapper */}
      <div className="dashboard-content-wrapper" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Header */}
        <header className="dashboard-header" style={{
          height: '64px',
          backgroundColor: '#ffffff',
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
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              color: 'var(--text-main)',
              cursor: 'pointer',
            }}
          >
            <Menu size={20} />
          </button>
          
          <div className="dashboard-header-title">
            <h1 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
              {navigationItems.find(item => location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path)))?.name || 'Overview'}
            </h1>
          </div>

          <div className="dashboard-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            {/* Live Clock Display */}
            <div className="header-clock-standard">
              <Clock size={13} style={{ color: '#0056b3' }} />
              <span>
                {currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
              <span style={{ color: '#cbd5e1', margin: '0 0.15rem' }}>|</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#0f172a' }}>
                {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
              </span>
            </div>
            {/* Connection Status Indicator */}
            <div className="system-status-indicator">
              <span className="dot"></span>
              <span>System Hub</span>
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
