import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import { 
  Lock, 
  CheckCircle2, 
  BookOpen, 
  PlusCircle, 
  Users, 
  UserCheck, 
  Shield,
  Scan
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { can } = usePermissions();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'guide'>('overview');

  const stats = [
    { label: 'Active Passes Today', value: '142', change: '+12% vs yesterday', trend: 'up' },
    { label: 'Pending Approvals', value: '18', change: '5 require urgent warden action', trend: 'alert' },
    { label: 'Checked In Visitors', value: '64', change: 'At 3 active gates', trend: 'neutral' },
    { label: 'Security Lockdown Status', value: 'SECURE', change: 'All 4 gates nominal', trend: 'success' },
  ];

  const features = [
    { title: 'QR Cryptographic Passes', desc: 'Secure, encrypted QR codes with AES-256 and HMAC signatures for quick sub-3-second scanning.' },
    { title: '9-Role RBAC System', desc: 'Distinct portals and permissions for Students, Faculty, Warden, Guard, Admins, and Visitors.' },
    { title: 'Hostel & Vehicle Modules', desc: 'Integrated workflows for overnight hostel guest requests and registered vehicle entry permits.' },
    { title: 'Real-Time Notifications', desc: 'Instant WebSocket alerts for pass approvals, gate check-ins, and emergency system lockdowns.' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Sub-navigation Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
        <nav className="header-nav" style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className={activeTab === 'overview' ? 'nav-item active' : 'nav-item'} 
            onClick={() => setActiveTab('overview')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            Overview
          </button>
          <button 
            className={activeTab === 'guide' ? 'nav-item active' : 'nav-item'} 
            onClick={() => setActiveTab('guide')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <BookOpen size={16} /> How to Use
          </button>
        </nav>
      </div>

      <section className="hero-banner" style={{ margin: 0 }}>
        <div className="hero-content">
          <span className="badge">SECURE PORTAL ACTIVE</span>
          <h2>Welcome, {user?.firstName}!</h2>
          <p>
            You are logged in to the Gate Pass portal. Your role permissions allow you to request passes,
            approve visitor access, or monitor active logs based on university policies.
          </p>
          <div className="hero-buttons">
            {can('create_pass') && (
              <button 
                onClick={() => navigate('/passes/new')} 
                className="btn btn-primary btn-large"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <PlusCircle size={18} /> Request Pass
              </button>
            )}
            {can('approve_pass') && (
              <button 
                onClick={() => navigate('/passes')} 
                className="btn btn-outline btn-large"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <UserCheck size={18} /> Pending Approvals
              </button>
            )}
          </div>
        </div>
        <div className="hero-visual">
          <div className="qr-box" style={{ border: '2px solid var(--primary)', background: '#f8fafc' }}>
            <Lock size={48} style={{ color: 'var(--primary)' }} />
          </div>
          <div className="visual-badge">
            <span className="dot pulse"></span> Nominal Operation
          </div>
        </div>
      </section>

      {activeTab === 'overview' && (
        <div className="tab-pane">
          {/* Dashboard Stats Preview */}
          <div className="stats-grid" style={{ marginBottom: '2rem' }}>
            {stats.map((stat, idx) => (
              <div key={idx} className="stat-card">
                <span className="stat-label">{stat.label}</span>
                <span className={`stat-value ${stat.trend}`}>{stat.value}</span>
                <span className="stat-change">{stat.change}</span>
              </div>
            ))}
          </div>

          {/* Core Features Preview */}
          <section className="features-section">
            <h3>Core Capabilities</h3>
            <div className="features-grid">
              {features.map((feat, idx) => (
                <div key={idx} className="feature-card">
                  <div className="feature-icon" style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                    <CheckCircle2 size={24} style={{ color: 'var(--primary)' }} />
                  </div>
                  <h4>{feat.title}</h4>
                  <p>{feat.desc}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {activeTab === 'guide' && (
        <div className="tab-pane text-layout" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3>Portal Operational Guidelines</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Follow these roles-based steps to ensure smooth entry, exit, and approval workflows across the campus gates.
          </p>
          
          <div className="guidelines-grid" style={{ gap: '1.5rem' }}>
            <div className="service-node" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h5 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontWeight: 'bold' }}>
                <Users size={18} /> For Students & Faculty
              </h5>
              <ul style={{ paddingLeft: '1.25rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <li style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', lineHeight: '1.4' }}>
                  Navigate to <strong>Gate Passes</strong> and click <strong>Request New Pass</strong>.
                </li>
                <li style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', lineHeight: '1.4' }}>
                  Input visitor details, category, ID type, number, and uploader document.
                </li>
                <li style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', lineHeight: '1.4' }}>
                  For overnight hostel guests, specify room details and select your Hostel Warden for review.
                </li>
                <li style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', lineHeight: '1.4' }}>
                  Once approved, download or print the pass and share the URL link/QR code with your visitor.
                </li>
              </ul>
            </div>

            <div className="service-node" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h5 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontWeight: 'bold' }}>
                <UserCheck size={18} /> For Hostel Wardens & Approvers
              </h5>
              <ul style={{ paddingLeft: '1.25rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <li style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', lineHeight: '1.4' }}>
                  Warden and admin roles will see pending requests in their dashboard task alerts.
                </li>
                <li style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', lineHeight: '1.4' }}>
                  Review request details, verify visitor category, and inspect uploaded credentials.
                </li>
                <li style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', lineHeight: '1.4' }}>
                  Click <strong>Approve</strong> or <strong>Reject</strong> and write a brief description for justification.
                </li>
                <li style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', lineHeight: '1.4' }}>
                  Clearances are instantly synced in the active database for security gate scanners.
                </li>
              </ul>
            </div>

            <div className="service-node" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h5 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontWeight: 'bold' }}>
                <Scan size={18} /> For Security Guards
              </h5>
              <ul style={{ paddingLeft: '1.25rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <li style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', lineHeight: '1.4' }}>
                  Use the <strong>Gate Terminal</strong> page to scan cryptographic pass QR codes.
                </li>
                <li style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', lineHeight: '1.4' }}>
                  Passes can also be scanned via a standard smartphone scanner (which automatically redirects and verifies the pass).
                </li>
                <li style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', lineHeight: '1.4' }}>
                  Verify that the visitor matches the uploaded photo ID before confirming the entry/exit check-in.
                </li>
                <li style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', lineHeight: '1.4' }}>
                  Use the <strong>Log Manual Override</strong> popup in case of emergency check-in needs.
                </li>
              </ul>
            </div>

            <div className="service-node" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h5 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontWeight: 'bold' }}>
                <Shield size={18} /> For Administrators & Auditors
              </h5>
              <ul style={{ paddingLeft: '1.25rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <li style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', lineHeight: '1.4' }}>
                  Monitor system gate activity and check-in logs in real-time under <strong>System Logs</strong>.
                </li>
                <li style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', lineHeight: '1.4' }}>
                  Oversee list of active, blacklisted, or historically banned visitor profiles.
                </li>
                <li style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', lineHeight: '1.4' }}>
                  Restore or ban visitors from the Visitors list with a 2+ character justification.
                </li>
                <li style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', lineHeight: '1.4' }}>
                  Initiate emergency security lockdowns to temporarily restrict all gate entries.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
