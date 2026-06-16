import React, { useEffect, useState } from 'react';
import { listVisitors, blacklistVisitor } from '../../services/visitor.service';
import { useAuth } from '../../hooks/useAuth';
import type { Visitor } from '../../types/pass.types';
import { Loader2, Users, RotateCcw, ShieldAlert } from 'lucide-react';

export const VisitorListPage: React.FC = () => {
  const { user } = useAuth();
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Blacklist modal state
  const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null);
  const [blacklistReason, setBlacklistReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [blacklistError, setBlacklistError] = useState<string | null>(null);

  const fetchVisitors = async (showFullLoading = true) => {
    if (showFullLoading) setLoading(true);
    try {
      const res = await listVisitors({
        page,
        limit,
        search,
        category,
      });
      if (res && res.success) {
        setVisitors(res.data || []);
        setCount(res.meta?.total || 0);
      }
    } catch (err) {
      console.error('Failed to load visitors directory:', err);
    } finally {
      if (showFullLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisitors(true);
  }, [page, category]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchVisitors(true);
  };

  const handleBlacklistToggle = async (visitor: Visitor) => {
    if (visitor.blacklisted) {
      // Unblacklist immediately
      if (window.confirm(`Are you sure you want to remove ${visitor.name} from the blacklist?`)) {
        try {
          const res = await blacklistVisitor(visitor.id, { isBlacklisted: false });
          if (res && res.success) {
            fetchVisitors(false);
          }
        } catch (err: any) {
          alert(err.response?.data?.message || 'Failed to update blacklist status');
        }
      }
    } else {
      setSelectedVisitor(visitor);
      setBlacklistReason('');
      setBlacklistError(null);
    }
  };

  const submitBlacklist = async () => {
    if (!selectedVisitor) return;
    
    if (blacklistReason.trim().length > 0 && blacklistReason.trim().length < 2) {
      setBlacklistError('Blacklist reason must be at least 2 characters long.');
      return;
    }

    setSubmitting(true);
    setBlacklistError(null);
    try {
      const res = await blacklistVisitor(selectedVisitor.id, {
        isBlacklisted: true,
        blacklistReason: blacklistReason.trim() === '' ? undefined : blacklistReason.trim(),
      });
      if (res && res.success) {
        setSelectedVisitor(null);
        fetchVisitors(false);
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.errors?.[0]?.message || err.response?.data?.message || 'Failed to blacklist visitor';
      setBlacklistError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const isAdminRole = ['SECURITY_ADMIN', 'UNIVERSITY_ADMIN', 'SUPER_ADMIN'].includes(user?.role || '');

  const getCategoryClass = (v: Visitor) => {
    if (v.blacklisted) return 'status-pill-standard rejected';
    if (v.category === 'VIP') return 'status-pill-standard pending';
    return 'status-pill-standard approved';
  };

  return (
    <div className="visitor-list-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Page Header */}
      <div className="page-header-standard">
        <div>
          <h2 className="page-title-main">Campus Visitors Registry</h2>
          <p className="page-subtitle-main">Historical directory of registered visitors. Manage blacklist designations and access records.</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card-standard" style={{ padding: '1.25rem' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
          <div style={{ flexGrow: 1, minWidth: '220px' }}>
            <label className="form-label-standard">Search Visitor Profile</label>
            <input 
              type="text" 
              placeholder="Search by name, phone number, ID card..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input-standard"
            />
          </div>

          <div style={{ width: '180px' }}>
            <label className="form-label-standard">Filter Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="form-input-standard"
              style={{ cursor: 'pointer' }}
            >
              <option value="">All Categories</option>
              <option value="REGULAR">Regular</option>
              <option value="VIP">VIP</option>
              <option value="CONTRACTOR">Contractor</option>
              <option value="BLACKLISTED">Blacklisted</option>
            </select>
          </div>

          <button type="submit" className="btn btn-secondary" style={{ padding: '0.6rem 1.5rem' }}>
            Filter
          </button>
        </form>
      </div>

      {/* Directory Table */}
      <div className="card-standard" style={{ padding: 0, overflowX: 'auto' }}>
        {loading ? (
          <div style={{ padding: '4rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
            <Loader2 size={32} className="animate-spin" style={{ color: '#002147' }} />
            <p style={{ marginTop: '1rem', fontSize: '0.875rem' }}>Loading directory...</p>
          </div>
        ) : visitors.length === 0 ? (
          <div style={{ padding: '4rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
            <Users size={44} style={{ color: '#94a3b8' }} />
            <h3 style={{ marginTop: '1rem', color: 'var(--text-h)', fontSize: '1rem' }}>No Visitors Found</h3>
            <p style={{ marginTop: '0.25rem', fontSize: '0.8125rem' }}>Ensure name spelling or category filters are selected correctly.</p>
          </div>
        ) : (
          <table className="table-standard">
            <thead>
              <tr>
                <th>Visitor Name</th>
                <th>Contact Info</th>
                <th>Identity Credentials</th>
                <th>Category / Status</th>
                <th>Date Enrolled</th>
                {isAdminRole && <th style={{ textAlign: 'right' }}>Security Actions</th>}
              </tr>
            </thead>
            <tbody>
              {visitors.map((visitor) => (
                <tr key={visitor.id}>
                  <td style={{ fontWeight: 700, color: 'var(--text-h)' }}>{visitor.name}</td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{visitor.phone}</div>
                    {visitor.email && <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>{visitor.email}</div>}
                  </td>
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', backgroundColor: 'var(--bg-base)', padding: '3px 6px', borderRadius: '4px', border: '1px solid var(--border-color)', fontWeight: 600 }}>
                      {visitor.idType}
                    </span>
                    <span style={{ marginLeft: '0.5rem', fontWeight: 500, fontSize: '0.8125rem' }}>{visitor.idNumber}</span>
                  </td>
                  <td>
                    <span className={getCategoryClass(visitor)}>
                      {visitor.blacklisted ? 'BLACKLISTED' : visitor.category}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    {new Date(visitor.createdAt).toLocaleDateString()}
                  </td>
                  {isAdminRole && (
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        onClick={() => handleBlacklistToggle(visitor)}
                        className="btn btn-secondary"
                        style={{
                          padding: '0.35rem 0.75rem',
                          fontSize: '0.8125rem',
                          color: visitor.blacklisted ? '#10b981' : '#ef4444',
                          borderColor: visitor.blacklisted ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                          backgroundColor: visitor.blacklisted ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                        }}
                      >
                        {visitor.blacklisted ? (
                          <>
                            <RotateCcw size={13} /> Restore Profile
                          </>
                        ) : (
                          <>
                            <ShieldAlert size={13} /> Blacklist Profile
                          </>
                        )}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Controls */}
      {count > limit && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '0.5rem' }}>
          <button disabled={page === 1} onClick={() => setPage(page - 1)} className="btn btn-secondary" style={{ opacity: page === 1 ? 0.5 : 1 }}>
            Previous
          </button>
          <span style={{ alignSelf: 'center', fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            Page {page} of {Math.ceil(count / limit)}
          </span>
          <button disabled={page * limit >= count} onClick={() => setPage(page + 1)} className="btn btn-secondary" style={{ opacity: page * limit >= count ? 0.5 : 1 }}>
            Next
          </button>
        </div>
      )}

      {/* Blacklist Confirmation Dialog Modal */}
      {selectedVisitor && (
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
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.125rem', fontWeight: 700 }}>
              <ShieldAlert size={20} /> Blacklist Visitor Profile
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.8125rem', marginBottom: '1.25rem', lineHeight: '1.4' }}>
              You are about to blacklist <strong>{selectedVisitor.name}</strong>. They will be immediately blocked from booking new passes, and any current active passes will trigger red alerts at gate terminals.
            </p>

            {blacklistError && (
              <div style={{ color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)', padding: '0.65rem 0.85rem', borderRadius: '6px', marginBottom: '1.25rem', fontSize: '0.8125rem', fontWeight: 600 }}>
                {blacklistError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <label className="form-label-standard">Reason for Blacklist</label>
              <textarea
                rows={3}
                placeholder="Enter justification details for campus ban..."
                value={blacklistReason}
                onChange={(e) => setBlacklistReason(e.target.value)}
                className="form-input-standard"
                style={{ fontFamily: 'inherit', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button disabled={submitting} onClick={() => setSelectedVisitor(null)} className="btn btn-secondary" style={{ padding: '0.45rem 1rem' }}>
                Cancel
              </button>
              <button disabled={submitting} onClick={submitBlacklist} className="btn btn-primary" style={{ padding: '0.45rem 1rem', backgroundColor: '#ef4444', borderColor: '#ef4444' }}>
                Confirm Blacklist
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VisitorListPage;
