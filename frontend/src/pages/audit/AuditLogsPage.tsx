import React, { useEffect, useState } from 'react';
import { listLogs } from '../../services/entry.service';
import type { EntryLog } from '../../types/pass.types';
import { Loader2, ClipboardList, AlertTriangle, ShieldCheck } from 'lucide-react';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<EntryLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [gate, setGate] = useState('');
  const [logType, setLogType] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await listLogs({
        page,
        limit,
        gate,
        logType,
      });
      if (res && res.success) {
        setLogs(res.data.logs || res.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch audit log history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, gate, logType]);

  const gateOptions = ['Main Gate', 'Hostel Gate', 'Academic Block Gate', 'Research Park Gate'];

  return (
    <div className="audit-logs-container">
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Security Audit & Entry Logs</h2>
        <p style={{ margin: '0.25rem 0 0 0', color: '#94a3b8', fontSize: '0.875rem' }}>
          Historical record of all visitor and vehicle entry check-ins and check-outs across campus gates.
        </p>
      </div>

      {/* Filters */}
      <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.25rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ width: '200px' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Gate location</label>
            <select
              value={gate}
              onChange={(e) => { setGate(e.target.value); setPage(1); }}
              style={{
                width: '100%',
                backgroundColor: '#ffffff',
                border: '1px solid var(--border-color)',
                color: 'var(--text-main)',
                padding: '0.6rem 1rem',
                borderRadius: '8px',
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              <option value="">All Gates</option>
              {gateOptions.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div style={{ width: '200px' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Log Direction</label>
            <select
              value={logType}
              onChange={(e) => { setLogType(e.target.value); setPage(1); }}
              style={{
                width: '100%',
                backgroundColor: '#ffffff',
                border: '1px solid var(--border-color)',
                color: 'var(--text-main)',
                padding: '0.6rem 1rem',
                borderRadius: '8px',
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              <option value="">All Directions</option>
              <option value="ENTRY">ENTRY (Check In)</option>
              <option value="EXIT">EXIT (Check Out)</option>
            </select>
          </div>

          <button onClick={fetchLogs} className="btn btn-secondary" style={{ alignSelf: 'flex-end', padding: '0.6rem 1.5rem' }}>
            Refresh Logs
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '4rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
            <Loader2 size={32} className="animate-spin" style={{ color: 'var(--primary)' }} />
            <p style={{ marginTop: '1rem' }}>Loading logs history...</p>
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '4rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
            <ClipboardList size={48} style={{ color: 'var(--text-muted)' }} />
            <h3 style={{ marginTop: '1rem' }}>No Logs Found</h3>
            <p style={{ marginTop: '0.5rem' }}>No entry or exit logs have been recorded matching the filters.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9375rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-base)' }}>
                <th style={{ padding: '1rem 1.5rem', color: '#94a3b8', fontWeight: 600 }}>Log ID</th>
                <th style={{ padding: '1rem 1.5rem', color: '#94a3b8', fontWeight: 600 }}>Gate / Location</th>
                <th style={{ padding: '1rem 1.5rem', color: '#94a3b8', fontWeight: 600 }}>Direction</th>
                <th style={{ padding: '1rem 1.5rem', color: '#94a3b8', fontWeight: 600 }}>Time Registered</th>
                <th style={{ padding: '1rem 1.5rem', color: '#94a3b8', fontWeight: 600 }}>Override Status</th>
                <th style={{ padding: '1rem 1.5rem', color: '#94a3b8', fontWeight: 600 }}>Dwell Time</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '1.25rem 1.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>{log.id.slice(-8)}...</td>
                  <td style={{ padding: '1.25rem 1.5rem', fontWeight: 600 }}>{log.gate}</td>
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      backgroundColor: log.logType === 'ENTRY' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                      color: log.logType === 'ENTRY' ? '#10b981' : '#3b82f6',
                    }}>
                      {log.logType}
                    </span>
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    {log.entryAt ? new Date(log.entryAt).toLocaleString() : log.exitAt ? new Date(log.exitAt).toLocaleString() : 'N/A'}
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    {log.isManualOverride ? (
                      <span style={{ color: '#fbbf24', fontSize: '0.8125rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <AlertTriangle size={14} /> Manual Override ({log.overrideReason})
                      </span>
                    ) : (
                      <span style={{ color: '#10b981', fontSize: '0.8125rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <ShieldCheck size={14} /> Encrypted Scan
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem', fontWeight: 600 }}>
                    {log.dwellMinutes !== null && log.dwellMinutes !== undefined ? `${log.dwellMinutes} mins` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1.5rem' }}>
        <button disabled={page === 1} onClick={() => setPage(page - 1)} className="btn btn-secondary" style={{ opacity: page === 1 ? 0.5 : 1 }}>
          Previous
        </button>
        <span style={{ alignSelf: 'center', fontSize: '0.875rem', color: '#94a3b8' }}>
          Page {page}
        </span>
        <button disabled={logs.length < limit} onClick={() => setPage(page + 1)} className="btn btn-secondary" style={{ opacity: logs.length < limit ? 0.5 : 1 }}>
          Next
        </button>
      </div>
    </div>
  );
};

export default AuditLogsPage;
