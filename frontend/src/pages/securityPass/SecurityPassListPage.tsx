import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listSecurityPasses } from '../../services/securityPass.service';
import { usePermissions } from '../../hooks/usePermissions';
import type { Pass, PassStatus } from '../../types/pass.types';
import { Plus, Loader2, Inbox } from 'lucide-react';

export const SecurityPassListPage: React.FC = () => {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const [passes, setPasses] = useState<Pass[]>([]);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [page, setPage] = useState(1);
  const limit = 10;

  const fetchPasses = async (showFullLoading = true) => {
    if (showFullLoading) setLoading(true);
    try {
      const response = await listSecurityPasses({ page, limit, search, status });
      if (response && response.success) {
        setPasses(response.data || []);
        setCount(response.meta?.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch security passes:', err);
    } finally {
      if (showFullLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchPasses(true);
  }, [page, status]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchPasses(true);
  };

  const getStatusClass = (s: PassStatus) => {
    switch (s) {
      case 'APPROVED':
        return 'status-pill-standard approved';
      case 'PENDING_SECURITY_APPROVAL':
        return 'status-pill-standard pending';
      case 'REJECTED':
        return 'status-pill-standard rejected';
      default:
        return 'status-pill-standard revoked';
    }
  };

  return (
    <div className="pass-list-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header-standard">
        <div>
          <h2 className="page-title-main">Security Passes - Walk-in Visitors</h2>
          <p className="page-subtitle-main">Track unknown/walk-in visitor passes awaiting or resolved by security approval.</p>
        </div>
        {can('create_security_pass') && (
          <button onClick={() => navigate('/security-pass/new')} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={16} /> New Security Pass
          </button>
        )}
      </div>

      <div className="card-standard" style={{ padding: '1.25rem' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
          <div style={{ flexGrow: 1, minWidth: '220px' }}>
            <label className="form-label-standard">Search Query</label>
            <input
              type="text"
              placeholder="Search by visitor name, pass #, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input-standard"
            />
          </div>

          <div style={{ width: '220px' }}>
            <label className="form-label-standard">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="form-input-standard" style={{ cursor: 'pointer' }}>
              <option value="">All Statuses</option>
              <option value="PENDING_SECURITY_APPROVAL">Pending Security Approval</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          <button type="submit" className="btn btn-secondary" style={{ padding: '0.6rem 1.5rem' }}>
            Search
          </button>
        </form>
      </div>

      <div className="card-standard" style={{ padding: 0, overflowX: 'auto' }}>
        {loading ? (
          <div style={{ padding: '4rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
            <Loader2 size={32} className="animate-spin" style={{ color: 'var(--primary)' }} />
            <p style={{ marginTop: '1rem', fontSize: '0.875rem' }}>Loading security passes...</p>
          </div>
        ) : passes.length === 0 ? (
          <div style={{ padding: '4rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
            <Inbox size={44} style={{ color: '#94a3b8' }} />
            <h3 style={{ marginTop: '1rem', color: 'var(--text-h)', fontSize: '1rem' }}>No Security Passes Found</h3>
            <p style={{ marginTop: '0.25rem', fontSize: '0.8125rem' }}>Create a new Security Pass for a walk-in visitor.</p>
          </div>
        ) : (
          <table className="table-standard">
            <thead>
              <tr>
                <th>Pass Code</th>
                <th>Visitor</th>
                <th>Whom to Visit</th>
                <th>Entry Gate</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {passes.map((pass) => (
                <tr key={pass.id}>
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#3b82f6' }}>{pass.passNumber}</span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 700, color: 'var(--text-h)' }}>{pass.visitor?.name || 'N/A'}</span>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>{pass.visitor?.phone || 'N/A'}</span>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{pass.whomToVisit || 'N/A'}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{(pass.allowedGates || []).join(', ')}</td>
                  <td>
                    <span className={getStatusClass(pass.status)}>
                      {pass.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button onClick={() => navigate(`/passes/${pass.id}`)} className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8125rem' }}>
                        View
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {count > limit && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '0.5rem' }}>
          <button disabled={page === 1} onClick={() => setPage(page - 1)} className="btn btn-secondary" style={{ opacity: page === 1 ? 0.5 : 1, cursor: page === 1 ? 'not-allowed' : 'pointer' }}>
            Previous
          </button>
          <span style={{ alignSelf: 'center', fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            Page {page} of {Math.ceil(count / limit)}
          </span>
          <button disabled={page * limit >= count} onClick={() => setPage(page + 1)} className="btn btn-secondary" style={{ opacity: page * limit >= count ? 0.5 : 1, cursor: page * limit >= count ? 'not-allowed' : 'pointer' }}>
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default SecurityPassListPage;
