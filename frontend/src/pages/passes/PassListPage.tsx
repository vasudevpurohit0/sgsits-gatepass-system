import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listPasses, reviewPass, revokePass } from '../../services/pass.service';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import type { Pass, PassStatus } from '../../types/pass.types';
import { Plus, Loader2, Inbox } from 'lucide-react';

export const PassListPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { can } = usePermissions();
  const [passes, setPasses] = useState<Pass[]>([]);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);
  
  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [passType, setPassType] = useState<string>('');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Review Modal state
  const [selectedPass, setSelectedPass] = useState<Pass | null>(null);
  const [remarks, setRemarks] = useState('');
  const [reviewing, setReviewing] = useState(false);

  // Revoke state
  const [revokingPass, setRevokingPass] = useState<Pass | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [revokeError, setRevokeError] = useState<string | null>(null);

  const fetchPasses = async (showFullLoading = true) => {
    if (showFullLoading) setLoading(true);
    try {
      const response = await listPasses({
        page,
        limit,
        search,
        status,
        passType,
      });
      if (response && response.success) {
        setPasses(response.data || []);
        setCount(response.meta?.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch passes:', err);
    } finally {
      if (showFullLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchPasses(true);
  }, [page, status, passType]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchPasses(true);
  };

  const handleReview = async (approved: boolean) => {
    if (!selectedPass) return;
    setReviewing(true);
    try {
      const res = await reviewPass(selectedPass.id, { approved, remarks });
      if (res && res.success) {
        setSelectedPass(null);
        setRemarks('');
        fetchPasses(false);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to review pass');
    } finally {
      setReviewing(false);
    }
  };

  const handleRevoke = async () => {
    if (!revokingPass) return;
    if (revokeReason.trim().length < 2) {
      setRevokeError('Revocation reason must describe cause in at least 2 characters.');
      return;
    }
    setRevokeError(null);
    try {
      const res = await revokePass(revokingPass.id, { reason: revokeReason });
      if (res && res.success) {
        setRevokingPass(null);
        setRevokeReason('');
        fetchPasses(false);
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.errors?.[0]?.message || err.response?.data?.message || 'Failed to revoke pass';
      setRevokeError(errorMsg);
    }
  };

  const getStatusColor = (s: PassStatus) => {
    switch (s) {
      case 'APPROVED': return { bg: 'rgba(16, 185, 129, 0.15)', text: '#10b981' };
      case 'ACTIVE': return { bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6' };
      case 'PENDING_APPROVAL': return { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b' };
      case 'REJECTED': return { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444' };
      case 'REVOKED': return { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171' };
      case 'USED': return { bg: 'rgba(107, 114, 128, 0.15)', text: '#9ca3af' };
      case 'EXPIRED': return { bg: 'rgba(107, 114, 128, 0.15)', text: '#6b7280' };
      default: return { bg: 'rgba(255, 255, 255, 0.05)', text: '#f8fafc' };
    }
  };

  return (
    <div className="pass-list-container">
      {/* Upper Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Active Passes & Requests</h2>
          <p style={{ margin: '0.25rem 0 0 0', color: '#94a3b8', fontSize: '0.875rem' }}>Track, verify, and approve security gate access credentials.</p>
        </div>
        {can('create_pass') && (
          <button onClick={() => navigate('/passes/new')} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={16} /> Request New Pass
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.25rem', marginBottom: '2rem' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
          <div style={{ flexGrow: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Search Query</label>
            <input 
              type="text" 
              placeholder="Search by visitor name, pass #, phone..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: '#ffffff',
                border: '1px solid var(--border-color)',
                color: 'var(--text-main)',
                padding: '0.6rem 1rem',
                borderRadius: '8px',
                fontSize: '0.875rem',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ width: '180px' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Pass Type</label>
            <select
              value={passType}
              onChange={(e) => setPassType(e.target.value)}
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
              <option value="">All Types</option>
              <option value="VISITOR">Visitor Pass</option>
              <option value="HOSTEL_GUEST">Hostel Guest</option>
              <option value="VEHICLE">Vehicle Pass</option>
              <option value="EVENT">Event Pass</option>
              <option value="CONTRACTOR">Contractor</option>
              <option value="PARENT">Parent Pass</option>
            </select>
          </div>

          <div style={{ width: '180px' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
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
              <option value="">All Statuses</option>
              <option value="PENDING_APPROVAL">Pending Review</option>
              <option value="APPROVED">Approved</option>
              <option value="ACTIVE">Active (Checked In)</option>
              <option value="USED">Used</option>
              <option value="EXPIRED">Expired</option>
              <option value="REJECTED">Rejected</option>
              <option value="REVOKED">Revoked</option>
            </select>
          </div>

          <button type="submit" className="btn btn-secondary" style={{ padding: '0.6rem 1.5rem' }}>
            Search
          </button>
        </form>
      </div>

      {/* Main Table List */}
      <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '4rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
            <Loader2 size={32} className="animate-spin" style={{ color: 'var(--primary)' }} />
            <p style={{ marginTop: '1rem' }}>Loading passes...</p>
          </div>
        ) : passes.length === 0 ? (
          <div style={{ padding: '4rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
            <Inbox size={48} style={{ color: 'var(--text-muted)' }} />
            <h3 style={{ marginTop: '1rem' }}>No Passes Found</h3>
            <p style={{ marginTop: '0.5rem' }}>Try adjusting your search criteria or register a new pass request.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9375rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-base)' }}>
                <th style={{ padding: '1rem 1.5rem', color: '#94a3b8', fontWeight: 600 }}>Pass Code</th>
                <th style={{ padding: '1rem 1.5rem', color: '#94a3b8', fontWeight: 600 }}>Visitor / Guest</th>
                <th style={{ padding: '1rem 1.5rem', color: '#94a3b8', fontWeight: 600 }}>Purpose</th>
                <th style={{ padding: '1rem 1.5rem', color: '#94a3b8', fontWeight: 600 }}>Validity Period</th>
                <th style={{ padding: '1rem 1.5rem', color: '#94a3b8', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '1rem 1.5rem', color: '#94a3b8', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {passes.map((pass) => {
                const styleColors = getStatusColor(pass.status);
                return (
                  <tr key={pass.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#60a5fa' }}>{pass.passNumber}</span>
                      <span style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>{pass.passType}</span>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <span style={{ fontWeight: 600 }}>{pass.visitor?.name || 'Bulk Invites'}</span>
                      <span style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>{pass.visitor?.phone || 'N/A'}</span>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <span>{pass.purpose}</span>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem', fontSize: '0.8125rem' }}>
                      <div>From: {new Date(pass.validFrom).toLocaleString()}</div>
                      <div style={{ color: '#94a3b8', marginTop: '2px' }}>To: {new Date(pass.validTo).toLocaleString()}</div>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: styleColors.bg,
                        color: styleColors.text,
                      }}>
                        {pass.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button onClick={() => navigate(`/passes/${pass.id}`)} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8125rem' }}>
                          View
                        </button>
                        
                        {/* Approve/Reject actions */}
                        {pass.status === 'PENDING_APPROVAL' && can('approve_pass') && (
                          <button onClick={() => setSelectedPass(pass)} className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8125rem', backgroundColor: '#10b981', borderColor: '#10b981' }}>
                            Review
                          </button>
                        )}

                        {/* Revoke button */}
                        {(pass.status === 'APPROVED' || pass.status === 'ACTIVE') && 
                          (pass.requesterId === user?.id || ['SECURITY_ADMIN', 'SUPER_ADMIN'].includes(user?.role || '')) && (
                          <button onClick={() => { setRevokeError(null); setRevokingPass(pass); }} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8125rem', color: '#ef4444', borderColor: '#ef4444' }}>
                            Revoke
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Controls */}
      {count > limit && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1.5rem' }}>
          <button 
            disabled={page === 1} 
            onClick={() => setPage(page - 1)}
            className="btn btn-secondary"
            style={{ opacity: page === 1 ? 0.5 : 1, cursor: page === 1 ? 'not-allowed' : 'pointer' }}
          >
            Previous
          </button>
          <span style={{ alignSelf: 'center', fontSize: '0.875rem', color: '#94a3b8' }}>
            Page {page} of {Math.ceil(count / limit)}
          </span>
          <button 
            disabled={page * limit >= count} 
            onClick={() => setPage(page + 1)}
            className="btn btn-secondary"
            style={{ opacity: page * limit >= count ? 0.5 : 1, cursor: page * limit >= count ? 'not-allowed' : 'pointer' }}
          >
            Next
          </button>
        </div>
      )}

      {/* Pass Review Dialog Modal */}
      {selectedPass && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '2rem',
            width: '100%',
            maxWidth: '500px',
            boxSizing: 'border-box',
          }}>
            <h3 style={{ margin: '0 0 1rem 0' }}>Review Gate Pass Request</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Review access request for <strong>{selectedPass.visitor?.name}</strong> (Pass Number: {selectedPass.passNumber}).
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#94a3b8' }}>Warden/Approver Comments</label>
              <textarea
                rows={3}
                placeholder="Enter remarks or grounds for approval/rejection..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  fontFamily: 'inherit',
                  fontSize: '0.875rem',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button disabled={reviewing} onClick={() => setSelectedPass(null)} className="btn btn-secondary">
                Cancel
              </button>
              <button disabled={reviewing} onClick={() => handleReview(false)} className="btn btn-secondary" style={{ color: '#ef4444', borderColor: '#ef4444' }}>
                Reject
              </button>
              <button disabled={reviewing} onClick={() => handleReview(true)} className="btn btn-primary" style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}>
                Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revocation Reason Dialog Modal */}
      {revokingPass && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '2rem',
            width: '100%',
            maxWidth: '500px',
            boxSizing: 'border-box',
          }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#ef4444' }}>Revoke Access Pass</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Are you sure you want to revoke pass <strong>{revokingPass.passNumber}</strong>? The visitor will immediately be denied campus access.
            </p>

            {revokeError && (
              <div style={{ color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                {revokeError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#94a3b8' }}>Revocation Reason</label>
              <textarea
                rows={3}
                placeholder="Enter justification for revoking this pass..."
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  fontFamily: 'inherit',
                  fontSize: '0.875rem',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setRevokingPass(null)} className="btn btn-secondary">
                Cancel
              </button>
              <button onClick={handleRevoke} className="btn btn-primary" style={{ backgroundColor: '#ef4444', borderColor: '#ef4444' }}>
                Revoke Pass
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PassListPage;
