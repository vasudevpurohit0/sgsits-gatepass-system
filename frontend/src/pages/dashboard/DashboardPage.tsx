import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import { listPasses } from '../../services/pass.service';
import { listLogs } from '../../services/entry.service';
import { 
  Shield, 
  Ticket, 
  Users, 
  Scan, 
  ClipboardList, 
  Activity, 
  Database, 
  Mail, 
  PlusCircle, 
  UserCheck, 
  ArrowRight,
  Loader2
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { can } = usePermissions();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'guide'>('overview');
  
  const [metrics, setMetrics] = useState({
    activePasses: 0,
    pendingApprovals: 0,
    visitorsToday: 0,
    totalPasses: 0
  });
  
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  useEffect(() => {
    // Load Leaflet CSS CDN
    const cssId = 'leaflet-css-cdn';
    if (!document.getElementById(cssId)) {
      const link = document.createElement('link');
      link.id = cssId;
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // Load Leaflet JS CDN
    const jsId = 'leaflet-js-cdn';
    if (!document.getElementById(jsId)) {
      const script = document.createElement('script');
      script.id = jsId;
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      script.onload = () => {
        setLeafletLoaded(true);
      };
      document.body.appendChild(script);
    } else {
      if ((window as any).L) {
        setLeafletLoaded(true);
      } else {
        const scriptEl = document.getElementById(jsId);
        if (scriptEl) {
          scriptEl.addEventListener('load', () => setLeafletLoaded(true));
        }
      }
    }
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // Fetch passes (limit to large number to query accurately)
      const passesRes = await listPasses({ limit: 1000 });
      const passes = (passesRes.success ? (passesRes.passes || passesRes.data || []) : []) as any[];

      // Fetch logs (limit to large number to query entries)
      const logsRes = await listLogs({ limit: 1000 });
      const logs = (logsRes.success ? (logsRes.logs || logsRes.data || []) : []) as any[];

      // Calculate metrics
      const now = new Date();
      const activeCount = passes.filter(p => p.status === 'APPROVED' && new Date(p.validTo) >= now).length;
      const pendingCount = passes.filter(p => p.status === 'PENDING_APPROVAL').length;
      const totalCount = passes.length;

      // Visitors entry today (logType === 'ENTRY' and date is today)
      const todayStr = now.toDateString();
      const visitorsTodayCount = logs.filter(l => 
        l.logType === 'ENTRY' && new Date(l.entryAt || l.createdAt).toDateString() === todayStr
      ).length;

      setMetrics({
        activePasses: activeCount,
        pendingApprovals: pendingCount,
        visitorsToday: visitorsTodayCount,
        totalPasses: totalCount
      });

      // Recent activity: combine passes and logs, sort chronologically, keep last 6
      const passActivities = passes.map(p => ({
        id: p.id,
        type: 'pass',
        title: p.status === 'APPROVED' ? 'Pass Approved' : p.status === 'REJECTED' ? 'Pass Rejected' : p.status === 'REVOKED' ? 'Pass Revoked' : 'Pass Created',
        desc: `Pass ${p.passNumber} for ${p.visitor?.name || 'Visitor'} (Host: ${p.requester?.firstName} ${p.requester?.lastName || ''})`,
        time: new Date(p.createdAt),
        status: p.status
      }));

      const logActivities = logs.map(l => ({
        id: l.id,
        type: 'log',
        title: l.logType === 'ENTRY' ? 'Visitor Entry' : 'Visitor Exit',
        desc: `${l.pass?.visitor?.name || 'Visitor'} ${l.logType === 'ENTRY' ? 'entered' : 'exited'} through ${l.gate}`,
        time: new Date(l.entryAt || l.exitAt || l.createdAt),
        status: l.logType
      }));

      const combined = [...passActivities, ...logActivities]
        .sort((a, b) => b.time.getTime() - a.time.getTime())
        .slice(0, 6);

      setActivities(combined);
    } catch (err) {
      console.error('Failed to load dashboard operational data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    if (!leafletLoaded || loading || activeTab !== 'overview') return;

    const L = (window as any).L;
    if (!L) return;

    const container = document.getElementById('campus-leaflet-map');
    if (!container) return;

    if ((container as any)._leaflet_id) {
      return;
    }

    // Center precisely on SGSITS Indore campus coordinate: 22.725225, 75.871388
    const map = L.map('campus-leaflet-map', {
      zoomControl: true,
      scrollWheelZoom: true,
      attributionControl: false
    }).setView([22.725225, 75.871388], 17);

    // CartoDB Voyager premium tiles (clean architectural map styling)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
      minZoom: 15
    }).addTo(map);

    // Pulsing coordinate pins
    const createCustomMarker = (pulseColor: string = '#10b981') => {
      const html = `
        <div style="
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
        ">
          <div style="
            position: absolute;
            width: 12px;
            height: 12px;
            background-color: ${pulseColor};
            border: 3px solid #ffffff;
            border-radius: 50%;
            box-shadow: 0 2px 8px rgba(0,0,0,0.35);
            z-index: 2;
          "></div>
          <div style="
            position: absolute;
            width: 28px;
            height: 28px;
            background-color: ${pulseColor};
            opacity: 0.35;
            border-radius: 50%;
            animation: mapPulse 2s infinite;
            z-index: 1;
          "></div>
        </div>
      `;
      return L.divIcon({
        html: html,
        className: 'custom-leaflet-marker',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });
    };

    // Main Entrance (Gate 1)
    const gate1Marker = L.marker([22.724263, 75.871388], {
      icon: createCustomMarker('#10b981')
    }).addTo(map);
    gate1Marker.bindPopup(`
      <div style="font-family: 'Outfit', sans-serif; padding: 2px; min-width: 140px;">
        <h4 style="margin: 0 0 6px 0; color: #0056b3; font-size: 0.875rem; font-weight: 700; text-transform: uppercase; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 4px;">Gate 1: Main Gate</h4>
        <div style="font-size: 0.75rem; color: #475569; margin-bottom: 3px;"><strong>Status:</strong> <span style="color: #10b981; font-weight: 700;">ONLINE</span></div>
        <div style="font-size: 0.75rem; color: #475569; margin-bottom: 3px;"><strong>Entries Today:</strong> ${metrics.visitorsToday}</div>
        <div style="font-size: 0.75rem; color: #475569;"><strong>Clearance:</strong> Guard Console</div>
      </div>
    `);

    // Hostel Entrance (Gate 2)
    const gate2Marker = L.marker([22.725800, 75.872800], {
      icon: createCustomMarker('#0056b3')
    }).addTo(map);
    gate2Marker.bindPopup(`
      <div style="font-family: 'Outfit', sans-serif; padding: 2px; min-width: 140px;">
        <h4 style="margin: 0 0 6px 0; color: #0056b3; font-size: 0.875rem; font-weight: 700; text-transform: uppercase; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 4px;">Gate 2: Hostel Gate</h4>
        <div style="font-size: 0.75rem; color: #475569; margin-bottom: 3px;"><strong>Status:</strong> <span style="color: #10b981; font-weight: 700;">ONLINE</span></div>
        <div style="font-size: 0.75rem; color: #475569; margin-bottom: 3px;"><strong>Active Passes:</strong> ${metrics.activePasses}</div>
        <div style="font-size: 0.75rem; color: #475569;"><strong>Clearance:</strong> Warden Review</div>
      </div>
    `);

    // Rear Access (Gate 3)
    const gate3Marker = L.marker([22.726200, 75.870800], {
      icon: createCustomMarker('#f59e0b')
    }).addTo(map);
    gate3Marker.bindPopup(`
      <div style="font-family: 'Outfit', sans-serif; padding: 2px; min-width: 140px;">
        <h4 style="margin: 0 0 6px 0; color: #0056b3; font-size: 0.875rem; font-weight: 700; text-transform: uppercase; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 4px;">Gate 3: Rear Gate</h4>
        <div style="font-size: 0.75rem; color: #475569; margin-bottom: 3px;"><strong>Status:</strong> <span style="color: #10b981; font-weight: 700;">ONLINE</span></div>
        <div style="font-size: 0.75rem; color: #475569; margin-bottom: 3px;"><strong>Traffic:</strong> Nominal</div>
        <div style="font-size: 0.75rem; color: #475569;"><strong>Clearance:</strong> Auto Scans</div>
      </div>
    `);

    return () => {
      map.remove();
    };
  }, [leafletLoaded, loading, activeTab, metrics]);

  const formatRole = (role: string) => {
    return role ? role.replace(/_/g, ' ') : '';
  };

  const getTimelineDotColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
      case 'ENTRY':
        return 'green';
      case 'PENDING_APPROVAL':
      case 'CREATE':
        return 'blue';
      case 'REJECTED':
      case 'REVOKED':
        return 'red';
      case 'EXIT':
        return 'amber';
      default:
        return 'blue';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Sub-navigation Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
        <nav className="header-nav" style={{ display: 'flex', gap: '0.25rem' }}>
          <button 
            className={activeTab === 'overview' ? 'nav-item active' : 'nav-item'} 
            onClick={() => setActiveTab('overview')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Activity size={15} /> Overview
          </button>
          <button 
            className={activeTab === 'guide' ? 'nav-item active' : 'nav-item'} 
            onClick={() => setActiveTab('guide')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <ClipboardList size={15} /> Operational Flow Guide
          </button>
        </nav>
      </div>

      {/* Hero Command Center Section - Redesigned as Live Campus Security Map HUD */}
      <section className="command-center" style={{ margin: 0 }}>
        <div className="map-hud-sidebar">
          <div>
            <h3 style={{ margin: '0 0 0.25rem 0', color: '#ffffff', fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.01em' }}>Campus Control HUD</h3>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.75rem' }}>Live operations telemetry & gate control</p>
          </div>
          
          {/* Officer Info */}
          <div style={{ padding: '0.75rem', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Active Officer</div>
            <div style={{ color: '#ffffff', fontWeight: 600, fontSize: '0.9rem', marginTop: '2px' }}>{user?.firstName} {user?.lastName}</div>
            <div style={{ color: '#60a5fa', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600, marginTop: '2px' }}>{formatRole(user?.role || '')}</div>
          </div>

          {/* Gate Telemetry Status */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, marginBottom: '2px' }}>Gate Operations</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', padding: '4px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <span style={{ color: '#cbd5e1', fontWeight: 500 }}>Gate 1 (Main Gate)</span>
              <span style={{ color: '#10b981', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981', boxShadow: '0 0 6px #10b981' }}></span> ONLINE
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', padding: '4px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <span style={{ color: '#cbd5e1', fontWeight: 500 }}>Gate 2 (Hostel Gate)</span>
              <span style={{ color: '#10b981', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981', boxShadow: '0 0 6px #10b981' }}></span> ONLINE
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', padding: '4px 0' }}>
              <span style={{ color: '#cbd5e1', fontWeight: 500 }}>Gate 3 (Rear Gate)</span>
              <span style={{ color: '#10b981', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981', boxShadow: '0 0 6px #10b981' }}></span> ONLINE
              </span>
            </div>
          </div>

          {/* System Sync */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: 'auto', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem' }}>
              <span style={{ color: '#94a3b8' }}>Database Sync</span>
              <span style={{ color: '#10b981', fontWeight: 600 }}>SYNCED</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem' }}>
              <span style={{ color: '#94a3b8' }}>Email Dispatch</span>
              <span style={{ color: '#10b981', fontWeight: 600 }}>READY</span>
            </div>
          </div>
        </div>

        {/* Map Container */}
        <div className="map-hud-container">
          <div id="campus-leaflet-map"></div>
        </div>
      </section>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '6rem 0', color: 'var(--text-muted)' }}>
          <Loader2 size={32} className="animate-spin" style={{ color: 'var(--primary)' }} />
          <p style={{ marginTop: '1rem', fontSize: '0.9rem', fontWeight: 500 }}>Fetching live operation parameters...</p>
        </div>
      ) : activeTab === 'overview' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Enterprise Metrics Grid */}
          <div className="stats-grid" style={{ margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
            <div className="enterprise-metric-card active-passes-card">
              <div className="metric-icon-box success">
                <Ticket size={18} />
              </div>
              <div className="metric-details">
                <span className="metric-label">Active Passes</span>
                <span className="metric-number">{metrics.activePasses}</span>
              </div>
            </div>

            <div className="enterprise-metric-card pending-reviews-card">
              <div className="metric-icon-box alert">
                <UserCheck size={18} />
              </div>
              <div className="metric-details">
                <span className="metric-label">Pending Reviews</span>
                <span className="metric-number">{metrics.pendingApprovals}</span>
              </div>
            </div>

            <div className="enterprise-metric-card visitors-today-card">
              <div className="metric-icon-box info">
                <Users size={18} />
              </div>
              <div className="metric-details">
                <span className="metric-label">Visitors Today</span>
                <span className="metric-number">{metrics.visitorsToday}</span>
              </div>
            </div>

            <div className="enterprise-metric-card total-passes-card">
              <div className="metric-icon-box primary">
                <ClipboardList size={18} />
              </div>
              <div className="metric-details">
                <span className="metric-label">Total Passes</span>
                <span className="metric-number">{metrics.totalPasses}</span>
              </div>
            </div>
          </div>

          {/* Primary Operations Layout */}
          <div className="grid-terminal-layout" style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1.5rem' }}>
            
            {/* Left: Activity Timeline */}
            <div className="timeline-widget">
              <div className="timeline-header">
                <h3>Live Gate Activity Timeline</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>REAL-TIME DATA FEED</span>
              </div>
              {activities.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  No recent operational activities recorded.
                </div>
              ) : (
                <div className="timeline-list">
                  {activities.map((act) => (
                    <div key={act.id} className="timeline-item">
                      <div className={`timeline-dot ${getTimelineDotColor(act.status)}`}></div>
                      <div className="timeline-content">
                        <div className="timeline-desc">
                          <strong style={{ marginRight: '0.5rem', color: 'var(--text-h)' }}>{act.title}</strong>
                          <span style={{ color: 'var(--text-muted)' }}>{act.desc}</span>
                        </div>
                        <span className="timeline-time">
                          {new Date(act.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Shortcuts & System Status */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Workstation Quick Actions */}
              <div className="actions-widget">
                <div className="timeline-header" style={{ marginBottom: '1rem' }}>
                  <h3>Security Workstation Shortcuts</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {can('create_pass') && (
                    <button onClick={() => navigate('/passes/new')} className="action-shortcut-card" style={{ border: 'none', background: 'none', width: '100%', boxSizing: 'border-box' }}>
                      <PlusCircle size={18} style={{ color: '#0056b3' }} />
                      <div>
                        <h4 className="action-shortcut-title">Request Visitor Pass</h4>
                        <p className="action-shortcut-desc">Generate new authorization clearance pass</p>
                      </div>
                    </button>
                  )}
                  {can('approve_pass') && (
                    <button onClick={() => navigate('/passes')} className="action-shortcut-card" style={{ border: 'none', background: 'none', width: '100%', boxSizing: 'border-box' }}>
                      <UserCheck size={18} style={{ color: '#d97706' }} />
                      <div>
                        <h4 className="action-shortcut-title">Review Pending Requests</h4>
                        <p className="action-shortcut-desc">Verify credential submittals and decide approvals</p>
                      </div>
                    </button>
                  )}
                  {can('scan_qr') && (
                    <button onClick={() => navigate('/terminal')} className="action-shortcut-card" style={{ border: 'none', background: 'none', width: '100%', boxSizing: 'border-box' }}>
                      <Scan size={18} style={{ color: '#059669' }} />
                      <div>
                        <h4 className="action-shortcut-title">Open Gate Terminal</h4>
                        <p className="action-shortcut-desc">Launch active scanning and check-in workstation</p>
                      </div>
                    </button>
                  )}
                  {['SECURITY_ADMIN', 'UNIVERSITY_ADMIN', 'SUPER_ADMIN', 'SECURITY_GUARD'].includes(user?.role || '') && (
                    <button onClick={() => navigate('/visitors')} className="action-shortcut-card" style={{ border: 'none', background: 'none', width: '100%', boxSizing: 'border-box' }}>
                      <Users size={18} style={{ color: '#0056b3' }} />
                      <div>
                        <h4 className="action-shortcut-title">Visitor Directory</h4>
                        <p className="action-shortcut-desc">Browse historical profiles and manage blacklist</p>
                      </div>
                    </button>
                  )}
                  {['SECURITY_ADMIN', 'UNIVERSITY_ADMIN', 'SUPER_ADMIN'].includes(user?.role || '') && (
                    <button onClick={() => navigate('/audit')} className="action-shortcut-card" style={{ border: 'none', background: 'none', width: '100%', boxSizing: 'border-box' }}>
                      <ClipboardList size={18} style={{ color: '#64748b' }} />
                      <div>
                        <h4 className="action-shortcut-title">Audit Logs</h4>
                        <p className="action-shortcut-desc">Inspect complete entry/exit compliance registry</p>
                      </div>
                    </button>
                  )}
                </div>
              </div>

              {/* System Node status */}
              <div className="card-standard" style={{ padding: '1.25rem' }}>
                <div style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.03em', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.75rem' }}>
                  Operational Services Status
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                      <Database size={13} style={{ color: '#64748b' }} />
                      <span>Security Database</span>
                    </div>
                    <span style={{ color: '#10b981', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }}></span> Connected
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                      <Mail size={13} style={{ color: '#64748b' }} />
                      <span>Email Delivery (Brevo)</span>
                    </div>
                    <span style={{ color: '#10b981', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }}></span> Operational
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                      <Shield size={13} style={{ color: '#64748b' }} />
                      <span>Gate Terminal Scanners</span>
                    </div>
                    <span style={{ color: '#10b981', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }}></span> Active
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Redesigned guidelines page */}
          <div className="workflow-section" style={{ margin: 0 }}>
            <h3 className="workflow-section-title">Institutional Clearance Workflows</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Student/Faculty Flow */}
              <div className="workflow-card">
                <div className="workflow-card-header">
                  <Ticket size={16} style={{ color: '#0056b3' }} /> Student & Faculty Pass Generation Flow
                </div>
                <div className="workflow-flow">
                  <div className="workflow-step">
                    <span className="step-num">1</span>
                    <span className="step-label">Request Pass</span>
                    <span className="step-desc">Access passes portal & select create pass</span>
                  </div>
                  <span className="flow-connector"><ArrowRight size={16} /></span>
                  <div className="workflow-step">
                    <span className="step-num">2</span>
                    <span className="step-label">Submit Details</span>
                    <span className="step-desc">Enter visitor data, upload official photo ID</span>
                  </div>
                  <span className="flow-connector"><ArrowRight size={16} /></span>
                  <div className="workflow-step">
                    <span className="step-num">3</span>
                    <span className="step-label">Await Review</span>
                    <span className="step-desc">Hostel warden/admin notified for review</span>
                  </div>
                  <span className="flow-connector"><ArrowRight size={16} /></span>
                  <div className="workflow-step">
                    <span className="step-num">4</span>
                    <span className="step-label">Share Pass</span>
                    <span className="step-desc">Approved pass with secure QR dispatched to visitor</span>
                  </div>
                </div>
              </div>

              {/* Warden Flow */}
              <div className="workflow-card">
                <div className="workflow-card-header">
                  <UserCheck size={16} style={{ color: '#d97706' }} /> Hostel Warden Clearance Flow
                </div>
                <div className="workflow-flow">
                  <div className="workflow-step">
                    <span className="step-num">1</span>
                    <span className="step-label">Receive Alert</span>
                    <span className="step-desc">Pending pass request flags Warden queue</span>
                  </div>
                  <span className="flow-connector"><ArrowRight size={16} /></span>
                  <div className="workflow-step">
                    <span className="step-num">2</span>
                    <span className="step-label">Verify Identity</span>
                    <span className="step-desc">Inspect credentials, check purpose of visit</span>
                  </div>
                  <span className="flow-connector"><ArrowRight size={16} /></span>
                  <div className="workflow-step">
                    <span className="step-num">3</span>
                    <span className="step-label">Decide Pass</span>
                    <span className="step-desc">Approve or Reject with official remarks</span>
                  </div>
                  <span className="flow-connector"><ArrowRight size={16} /></span>
                  <div className="workflow-step">
                    <span className="step-num">4</span>
                    <span className="step-label">Audit Log</span>
                    <span className="step-desc">Decision auto-synced into security database</span>
                  </div>
                </div>
              </div>

              {/* Security guard scan flow */}
              <div className="workflow-card">
                <div className="workflow-card-header">
                  <Scan size={16} style={{ color: '#059669' }} /> Gate Officer Verification Flow
                </div>
                <div className="workflow-flow">
                  <div className="workflow-step">
                    <span className="step-num">1</span>
                    <span className="step-label">Scan Pass QR</span>
                    <span className="step-desc">Scan visitor ticket QR via Gate Terminal camera</span>
                  </div>
                  <span className="flow-connector"><ArrowRight size={16} /></span>
                  <div className="workflow-step">
                    <span className="step-num">2</span>
                    <span className="step-label">Check Photo ID</span>
                    <span className="step-desc">Match face with live system picture and ID doc</span>
                  </div>
                  <span className="flow-connector"><ArrowRight size={16} /></span>
                  <div className="workflow-step">
                    <span className="step-num">3</span>
                    <span className="step-label">Authorize Entry</span>
                    <span className="step-desc">Confirm check-in; timestamp entry registered</span>
                  </div>
                  <span className="flow-connector"><ArrowRight size={16} /></span>
                  <div className="workflow-step">
                    <span className="step-num">4</span>
                    <span className="step-label">Register Exit</span>
                    <span className="step-desc">Scan pass on exit to log dwell duration</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
