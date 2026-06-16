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

  const getStatusClass = (s: PassStatus) => {
    switch (s) {
      case 'APPROVED':
      case 'ACTIVE':
        return 'status-pill-standard approved';
      case 'PENDING_APPROVAL':
        return 'status-pill-standard pending';
      case 'REJECTED':
      case 'REVOKED':
        return 'status-pill-standard rejected';
      case 'USED':
      case 'EXPIRED':
      default:
        return 'status-pill-standard revoked';
    }
  };

  const formatPassType = (type: string) => {
    return type ? type.replace(/_/g, ' ') : '';
  };

  return (
    <div className="pass-list-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Page Header */}
      <div className="page-header-standard">
        <div>
          <h2 className="page-title-main">Active Passes & Clearance Requests</h2>
          <p className="page-subtitle-main">Track, verify, and approve security gate access credentials.</p>
        </div>
        {can('create_pass') && (
          <button onClick={() => navigate('/passes/new')} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={16} /> Request New Pass
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
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

          <div style={{ width: '180px' }}>
            <label className="form-label-standard">Pass Type</label>
            <select
              value={passType}
              onChange={(e) => setPassType(e.target.value)}
              className="form-input-standard"
              style={{ cursor: 'pointer' }}
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
            <label className="form-label-standard">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="form-input-standard"
              style={{ cursor: 'pointer' }}
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
      <div className="card-standard" style={{ padding: 0, overflowX: 'auto' }}>
        {loading ? (
          <div style={{ padding: '4rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
            <Loader2 size={32} className="animate-spin" style={{ color: 'var(--primary)' }} />
            <p style={{ marginTop: '1rem', fontSize: '0.875rem' }}>Loading passes...</p>
          </div>
        ) : passes.length === 0 ? (
          <div style={{ padding: '4rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
            <Inbox size={44} style={{ color: '#94a3b8' }} />
            <h3 style={{ marginTop: '1rem', color: 'var(--text-h)', fontSize: '1rem' }}>No Passes Found</h3>
            <p style={{ marginTop: '0.25rem', fontSize: '0.8125rem' }}>Try adjusting your search criteria or register a new pass request.</p>
          </div>
        ) : (
          <table className="table-standard">
            <thead>
              <tr>
                <th>Pass Code</th>
                <th>Visitor / Guest</th>
                <th>Purpose</th>
                <th>Validity Period</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {passes.map((pass) => (
                <tr key={pass.id}>
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#3b82f6' }}>{pass.passNumber}</span>
                    <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', marginTop: '2px', fontWeight: 600 }}>{formatPassType(pass.passType)}</span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 700, color: 'var(--text-h)' }}>{pass.visitor?.name || 'Bulk Invites'}</span>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>{pass.visitor?.phone || 'N/A'}</span>
                  </td>
                  <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{pass.purpose}</span>
                  </td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    <div><span style={{ fontWeight: 600, color: 'var(--text-h)' }}>From:</span> {new Date(pass.validFrom).toLocaleString()}</div>
                    <div style={{ marginTop: '2px' }}><span style={{ fontWeight: 600, color: 'var(--text-h)' }}>To:</span> {new Date(pass.validTo).toLocaleString()}</div>
                  </td>
                  <td>
                    <span className={getStatusClass(pass.status)}>
                      {pass.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button onClick={() => navigate(`/passes/${pass.id}`)} className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8125rem' }}>
                        View
                      </button>
                      
                      {/* Approve/Reject actions */}
                      {pass.status === 'PENDING_APPROVAL' && can('approve_pass') && (
                        <button onClick={() => setSelectedPass(pass)} className="btn btn-primary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8125rem', backgroundColor: '#10b981', borderColor: '#10b981' }}>
                          Review
                        </button>
                      )}

                      {/* Revoke button */}
                      {(pass.status === 'APPROVED' || pass.status === 'ACTIVE') && 
                        (pass.requesterId === user?.id || ['SECURITY_ADMIN', 'SUPER_ADMIN'].includes(user?.role || '')) && (
                        <button onClick={() => { setRevokeError(null); setRevokingPass(pass); }} className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8125rem', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)', backgroundColor: 'rgba(239, 68, 68, 0.05)' }}>
                          Revoke
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Controls */}
      {count > limit && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '0.5rem' }}>
          <button 
            disabled={page === 1} 
            onClick={() => setPage(page - 1)}
            className="btn btn-secondary"
            style={{ opacity: page === 1 ? 0.5 : 1, cursor: page === 1 ? 'not-allowed' : 'pointer' }}
          >
            Previous
          </button>
          <span style={{ alignSelf: 'center', fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>
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
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div className="card-standard" style={{
            width: '100%',
            maxWidth: '460px',
            boxSizing: 'border-box',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-h)' }}>Review Gate Pass Request</h3>
            <p style={{ color: '#64748b', fontSize: '0.8125rem', marginBottom: '1.25rem', lineHeight: '1.4' }}>
              Review access request for <strong>{selectedPass.visitor?.name}</strong> (Pass Number: {selectedPass.passNumber}).
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <label className="form-label-standard">Warden/Approver Comments</label>
              <textarea
                rows={3}
                placeholder="Enter remarks or grounds for approval/rejection..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="form-input-standard"
                style={{ fontFamily: 'inherit', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button disabled={reviewing} onClick={() => setSelectedPass(null)} className="btn btn-secondary" style={{ padding: '0.45rem 1rem' }}>
                Cancel
              </button>
              <button disabled={reviewing} onClick={() => handleReview(false)} className="btn btn-secondary" style={{ padding: '0.45rem 1rem', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)', backgroundColor: 'rgba(239, 68, 68, 0.05)' }}>
                Reject
              </button>
              <button disabled={reviewing} onClick={() => handleReview(true)} className="btn btn-primary" style={{ padding: '0.45rem 1rem', backgroundColor: '#10b981', borderColor: '#10b981' }}>
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
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div className="card-standard" style={{
            width: '100%',
            maxWidth: '460px',
            boxSizing: 'border-box',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.125rem', fontWeight: 700, color: '#ef4444' }}>Revoke Access Pass</h3>
            <p style={{ color: '#64748b', fontSize: '0.8125rem', marginBottom: '1.25rem', lineHeight: '1.4' }}>
              Are you sure you want to revoke pass <strong>{revokingPass.passNumber}</strong>? The visitor will immediately be denied campus access.
            </p>

            {revokeError && (
              <div style={{ color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)', padding: '0.65rem 0.85rem', borderRadius: '6px', marginBottom: '1.25rem', fontSize: '0.8125rem', fontWeight: 600 }}>
                {revokeError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <label className="form-label-standard">Revocation Reason</label>
              <textarea
                rows={3}
                placeholder="Enter justification for revoking this pass..."
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                className="form-input-standard"
                style={{ fontFamily: 'inherit', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setRevokingPass(null)} className="btn btn-secondary" style={{ padding: '0.45rem 1rem' }}>
                Cancel
              </button>
              <button onClick={handleRevoke} className="btn btn-primary" style={{ padding: '0.45rem 1rem', backgroundColor: '#ef4444', borderColor: '#ef4444' }}>
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
