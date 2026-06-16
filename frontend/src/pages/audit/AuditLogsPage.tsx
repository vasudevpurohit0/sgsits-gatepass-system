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
    <div className="audit-logs-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Page Header */}
      <div className="page-header-standard">
        <div>
          <h2 className="page-title-main">Security Audit & Compliance Logs</h2>
          <p className="page-subtitle-main">Historical record of all visitor and vehicle entry check-ins and check-outs across campus gates.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card-standard" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ width: '200px' }}>
            <label className="form-label-standard">Gate Location</label>
            <select
              value={gate}
              onChange={(e) => { setGate(e.target.value); setPage(1); }}
              className="form-input-standard"
              style={{ cursor: 'pointer' }}
            >
              <option value="">All Gates</option>
              {gateOptions.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div style={{ width: '200px' }}>
            <label className="form-label-standard">Log Direction</label>
            <select
              value={logType}
              onChange={(e) => { setLogType(e.target.value); setPage(1); }}
              className="form-input-standard"
              style={{ cursor: 'pointer' }}
            >
              <option value="">All Directions</option>
              <option value="ENTRY">ENTRY (Check In)</option>
              <option value="EXIT">EXIT (Check Out)</option>
            </select>
          </div>

          <button onClick={fetchLogs} className="btn btn-secondary" style={{ padding: '0.6rem 1.5rem' }}>
            Refresh Logs
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="card-standard" style={{ padding: 0, overflowX: 'auto' }}>
        {loading ? (
          <div style={{ padding: '4rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
            <Loader2 size={32} className="animate-spin" style={{ color: 'var(--primary)' }} />
            <p style={{ marginTop: '1rem', fontSize: '0.875rem' }}>Loading logs history...</p>
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '4rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
            <ClipboardList size={44} style={{ color: '#94a3b8' }} />
            <h3 style={{ marginTop: '1rem', color: 'var(--text-h)', fontSize: '1rem' }}>No Logs Found</h3>
            <p style={{ marginTop: '0.25rem', fontSize: '0.8125rem' }}>No entry or exit logs have been recorded matching the filters.</p>
          </div>
        ) : (
          <table className="table-standard">
            <thead>
              <tr>
                <th>Log ID</th>
                <th>Gate / Location</th>
                <th>Direction</th>
                <th>Time Registered</th>
                <th>Verification Status</th>
                <th>Dwell Time</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: '#3b82f6', fontWeight: 600 }}>
                    {log.id.slice(-8).toUpperCase()}
                  </td>
                  <td style={{ fontWeight: 700, color: 'var(--text-h)' }}>{log.gate}</td>
                  <td>
                    <span className={log.logType === 'ENTRY' ? 'status-pill-standard approved' : 'status-pill-standard pending'}>
                      {log.logType}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    {log.entryAt ? new Date(log.entryAt).toLocaleString() : log.exitAt ? new Date(log.exitAt).toLocaleString() : 'N/A'}
                  </td>
                  <td>
                    {log.isManualOverride ? (
                      <span style={{ color: '#d97706', fontSize: '0.8125rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}>
                        <AlertTriangle size={13} /> Manual Override
                      </span>
                    ) : (
                      <span style={{ color: '#059669', fontSize: '0.8125rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}>
                        <ShieldCheck size={13} /> Encrypted Scan
                      </span>
                    )}
                  </td>
                  <td style={{ fontWeight: 600, color: 'var(--text-h)', fontSize: '0.8125rem' }}>
                    {log.dwellMinutes !== null && log.dwellMinutes !== undefined ? `${log.dwellMinutes} mins` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {logs.length >= limit && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '0.5rem' }}>
          <button disabled={page === 1} onClick={() => setPage(page - 1)} className="btn btn-secondary" style={{ opacity: page === 1 ? 0.5 : 1 }}>
            Previous
          </button>
          <span style={{ alignSelf: 'center', fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            Page {page}
          </span>
          <button disabled={logs.length < limit} onClick={() => setPage(page + 1)} className="btn btn-secondary" style={{ opacity: logs.length < limit ? 0.5 : 1 }}>
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default AuditLogsPage;
