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

  return (
    <div className="visitor-list-container">
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Visitors Directory</h2>
        <p style={{ margin: '0.25rem 0 0 0', color: '#94a3b8', fontSize: '0.875rem' }}>
          Historical directory of all registered campus visitors. Search profile details and manage blacklist designations.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.25rem', marginBottom: '2rem' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
          <div style={{ flexGrow: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Search visitor</label>
            <input 
              type="text" 
              placeholder="Search by name, phone number, ID card..." 
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
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
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
      <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '12px', overflowX: 'auto' }}>
        {loading ? (
          <div style={{ padding: '4rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
            <Loader2 size={32} className="animate-spin" style={{ color: 'var(--primary)' }} />
            <p style={{ marginTop: '1rem' }}>Loading directory...</p>
          </div>
        ) : visitors.length === 0 ? (
          <div style={{ padding: '4rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
            <Users size={48} style={{ color: 'var(--text-muted)' }} />
            <h3 style={{ marginTop: '1rem' }}>No Visitors Found</h3>
            <p style={{ marginTop: '0.5rem' }}>Ensure name spelling or category filters are selected correctly.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9375rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-base)' }}>
                <th style={{ padding: '1rem 1.5rem', color: '#94a3b8', fontWeight: 600 }}>Visitor Name</th>
                <th style={{ padding: '1rem 1.5rem', color: '#94a3b8', fontWeight: 600 }}>Contact Info</th>
                <th style={{ padding: '1rem 1.5rem', color: '#94a3b8', fontWeight: 600 }}>Identity Credentials</th>
                <th style={{ padding: '1rem 1.5rem', color: '#94a3b8', fontWeight: 600 }}>Category Status</th>
                <th style={{ padding: '1rem 1.5rem', color: '#94a3b8', fontWeight: 600 }}>Date Enrolled</th>
                {isAdminRole && <th style={{ padding: '1rem 1.5rem', color: '#94a3b8', fontWeight: 600, textAlign: 'right' }}>Security Actions</th>}
              </tr>
            </thead>
            <tbody>
              {visitors.map((visitor) => (
                <tr key={visitor.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '1.25rem 1.5rem', fontWeight: 600 }}>{visitor.name}</td>
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    <div>{visitor.phone}</div>
                    {visitor.email && <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>{visitor.email}</div>}
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', backgroundColor: '#ffffff', padding: '2px 6px', borderRadius: '4px' }}>
                      {visitor.idType}
                    </span>
                    <span style={{ display: 'inline-block', marginLeft: '0.5rem', fontSize: '0.875rem' }}>{visitor.idNumber}</span>
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '0.25rem 0.6rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      backgroundColor: visitor.blacklisted ? 'rgba(239, 68, 68, 0.15)' : visitor.category === 'VIP' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                      color: visitor.blacklisted ? '#ef4444' : visitor.category === 'VIP' ? '#f59e0b' : '#10b981',
                    }}>
                      {visitor.blacklisted ? 'BLACKLISTED' : visitor.category}
                    </span>
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem', fontSize: '0.8125rem', color: '#94a3b8' }}>
                    {new Date(visitor.createdAt).toLocaleDateString()}
                  </td>
                  {isAdminRole && (
                    <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                      <button 
                        onClick={() => handleBlacklistToggle(visitor)}
                        className="btn btn-secondary"
                        style={{
                          padding: '0.35rem 0.75rem',
                          fontSize: '0.8125rem',
                          color: visitor.blacklisted ? '#10b981' : '#ef4444',
                          borderColor: visitor.blacklisted ? '#10b981' : '#ef4444',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                        }}
                      >
                        {visitor.blacklisted ? (
                          <>
                            <RotateCcw size={14} /> Restore Visitor
                          </>
                        ) : (
                          <>
                            <ShieldAlert size={14} /> Blacklist
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
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1.5rem' }}>
          <button disabled={page === 1} onClick={() => setPage(page - 1)} className="btn btn-secondary" style={{ opacity: page === 1 ? 0.5 : 1 }}>
            Previous
          </button>
          <span style={{ alignSelf: 'center', fontSize: '0.875rem', color: '#94a3b8' }}>
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
            <h3 style={{ margin: '0 0 1rem 0', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldAlert size={20} /> Blacklist Visitor Profile
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              You are about to blacklist <strong>{selectedVisitor.name}</strong>. They will be immediately blocked from booking new passes, and any current active passes will trigger red alerts at gate terminals.
            </p>

            {blacklistError && (
              <div style={{ color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                {blacklistError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#94a3b8' }}>Reason for Blacklist</label>
              <textarea
                rows={3}
                placeholder="Enter justification details for campus ban..."
                value={blacklistReason}
                onChange={(e) => setBlacklistReason(e.target.value)}
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
              <button disabled={submitting} onClick={() => setSelectedVisitor(null)} className="btn btn-secondary">
                Cancel
              </button>
              <button disabled={submitting} onClick={submitBlacklist} className="btn btn-primary" style={{ backgroundColor: '#ef4444', borderColor: '#ef4444' }}>
                Confirm Campus Ban
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VisitorListPage;
