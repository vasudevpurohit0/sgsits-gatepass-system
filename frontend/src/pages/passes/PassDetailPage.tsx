import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPass, reviewPass, revokePass } from '../../services/pass.service';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import type { Pass, PassStatus } from '../../types/pass.types';
import { Loader2, AlertCircle, RefreshCw, Lock, User, Camera, Building, Car, History, Copy, Printer } from 'lucide-react';

export const PassDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { can } = usePermissions();

  const [pass, setPass] = useState<Pass | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal actions
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [reviewing, setReviewing] = useState(false);

  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');
  const [revoking, setRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  const fetchPassDetails = async (showFullLoading = true) => {
    if (!id) return;
    if (showFullLoading) setLoading(true);
    setError(null);
    try {
      const res = await getPass(id);
      if (res && res.success) {
        setPass(res.data);
      } else {
        setError('Failed to fetch pass details');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch pass details');
    } finally {
      if (showFullLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchPassDetails(true);
  }, [id]);

  const handleReview = async (approved: boolean) => {
    if (!pass) return;
    setReviewing(true);
    try {
      const res = await reviewPass(pass.id, { approved, remarks });
      if (res && res.success) {
        setReviewModalOpen(false);
        setRemarks('');
        fetchPassDetails(false);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to review pass');
    } finally {
      setReviewing(false);
    }
  };

  const handleRevoke = async () => {
    if (!pass) return;
    if (revokeReason.trim().length < 2) {
      setRevokeError('Revocation reason must describe cause in at least 2 characters.');
      return;
    }
    setRevoking(true);
    setRevokeError(null);
    try {
      const res = await revokePass(pass.id, { reason: revokeReason });
      if (res && res.success) {
        setRevokeModalOpen(false);
        setRevokeReason('');
        fetchPassDetails(false);
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.errors?.[0]?.message || err.response?.data?.message || 'Failed to revoke pass';
      setRevokeError(errorMsg);
    } finally {
      setRevoking(false);
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

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: '#94a3b8' }}>
        <Loader2 size={40} className="animate-spin" style={{ color: 'var(--primary)' }} />
        <p style={{ marginTop: '1rem' }}>Loading gate pass details...</p>
      </div>
    );
  }

  if (error || !pass) {
    return (
      <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '2rem', borderRadius: '12px', textAlign: 'center', color: '#ef4444', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
        <AlertCircle size={48} />
        <h3>Error Accessing Pass Details</h3>
        <p style={{ margin: 0 }}>{error || 'Pass record not found or inaccessible.'}</p>
        <button onClick={() => navigate('/passes')} className="btn btn-secondary" style={{ marginTop: '1rem' }}>
          Back to List
        </button>
      </div>
    );
  }

  const statusColors = getStatusColor(pass.status);

  const formatPassDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const renderBarcode = () => {
    const lines = [
      2, 1, 3, 1, 1, 2, 4, 1, 2, 3, 1, 2, 1, 1, 3, 2, 1, 4, 1, 2, 1, 3, 1, 2, 2, 1, 3, 1, 1, 2, 4, 1, 2, 3, 1, 2, 1, 1, 3, 2, 1, 4, 1, 2, 1, 3, 1, 2
    ];
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60px', margin: '10px 0', backgroundColor: '#fff' }}>
        {lines.map((width, idx) => (
          <div key={idx} style={{
            width: `${width}px`,
            height: '50px',
            backgroundColor: '#000',
            marginRight: idx % 3 === 0 ? '2px' : '1px'
          }} />
        ))}
      </div>
    );
  };

  return (
    <>
      {/* Printable Pass Ticket */}
      <div className="print-only" style={{
        width: '650px',
        margin: '20px auto',
        padding: '0',
        backgroundColor: '#ffffff',
        color: '#000000',
        border: '3px solid #000000',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        boxSizing: 'border-box'
      }}>
        {/* Pass Header */}
        <div style={{
          backgroundColor: '#e6f7ff',
          borderBottom: '2px solid #000000',
          padding: '15px',
          textAlign: 'center'
        }}>
          <h1 style={{
            margin: 0,
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#002766',
            letterSpacing: '1px'
          }}>
            {pass.passType === 'VEHICLE' ? 'SGSITS Vehicle Entry Pass' : pass.passType === 'HOSTEL_GUEST' ? 'SGSITS Hostel Guest Pass' : 'SGSITS Entry/Exit Pass'}
          </h1>
        </div>

        {/* Barcode Section */}
        <div style={{
          borderBottom: '2px solid #000000',
          padding: '15px 0',
          textAlign: 'center',
          backgroundColor: '#ffffff'
        }}>
          {renderBarcode()}
          <div style={{
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#e01b22',
            marginTop: '8px',
            letterSpacing: '1px'
          }}>
            {pass.passType === 'VEHICLE' ? 'OFFICIAL Vehicle Pass' : 'OFFICIAL Visitor'} : {pass.passNumber}
          </div>
        </div>

        {/* Details Table */}
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '15px'
        }}>
          <tbody>
            <tr>
              <td colSpan={2} style={{ borderBottom: '1px solid #000000', padding: '10px 15px', backgroundColor: '#f6ffed' }}>
                <span style={{ color: '#002766', fontWeight: 'bold' }}>Visitor Category : </span>
                <span style={{ color: '#e01b22', fontWeight: 'bold' }}>{pass.visitor?.category || 'GENERAL'}</span>
              </td>
            </tr>
            <tr>
              <td colSpan={2} style={{ borderBottom: '1px solid #000000', padding: '10px 15px' }}>
                <span style={{ color: '#002766', fontWeight: 'bold' }}>Pass Created by : </span>
                <span style={{ color: '#52c41a', fontWeight: 'bold' }}>{pass.createdByName || `${pass.requester?.firstName} ${pass.requester?.lastName}`}</span>
              </td>
            </tr>
            {pass.creatorDept && (
              <tr>
                <td colSpan={2} style={{ borderBottom: '1px solid #000000', padding: '10px 15px' }}>
                  <span style={{ color: '#002766', fontWeight: 'bold' }}>Pass Creator Dept/Section : </span>
                  <span style={{ color: '#52c41a', fontWeight: 'bold' }}>{pass.creatorDept}</span>
                </td>
              </tr>
            )}
            <tr>
              <td colSpan={2} style={{ borderBottom: '1px solid #000000', padding: '10px 15px' }}>
                <span style={{ color: '#002766', fontWeight: 'bold' }}>Visitor Name : </span>
                <span style={{ color: '#52c41a', fontWeight: 'bold' }}>{pass.visitor?.name}</span>
              </td>
            </tr>
            <tr>
              <td style={{ borderBottom: '1px solid #000000', borderRight: '1px solid #000000', padding: '10px 15px', width: '50%' }}>
                <span style={{ color: '#002766', fontWeight: 'bold' }}>Mobile : </span>
                <span style={{ color: '#52c41a', fontWeight: 'bold' }}>{pass.visitor?.phone}</span>
              </td>
              <td style={{ borderBottom: '1px solid #000000', padding: '10px 15px', width: '50%' }}>
                <span style={{ color: '#002766', fontWeight: 'bold' }}>Email : </span>
                <span style={{ color: '#52c41a', fontWeight: 'bold' }}>{pass.visitor?.email || 'N/A'}</span>
              </td>
            </tr>
            <tr>
              <td colSpan={2} style={{ borderBottom: '1px solid #000000', padding: '10px 15px' }}>
                <span style={{ color: '#002766', fontWeight: 'bold' }}>Visitor ID Type & Number : </span>
                <span style={{ color: '#52c41a', fontWeight: 'bold' }}>{pass.visitor?.idType} ({pass.visitor?.idNumber})</span>
              </td>
            </tr>
            <tr>
              <td colSpan={2} style={{ borderBottom: '1px solid #000000', padding: '10px 15px' }}>
                <span style={{ color: '#002766', fontWeight: 'bold' }}>Visit Purpose : </span>
                <span style={{ color: '#52c41a', fontWeight: 'bold' }}>{pass.purpose}</span>
              </td>
            </tr>
            {pass.comingFrom && (
              <tr>
                <td colSpan={2} style={{ borderBottom: '1px solid #000000', padding: '10px 15px' }}>
                  <span style={{ color: '#002766', fontWeight: 'bold' }}>Coming From : </span>
                  <span style={{ color: '#52c41a', fontWeight: 'bold' }}>{pass.comingFrom}</span>
                </td>
              </tr>
            )}

            {/* Conditional Vehicle Pass Details in Printable Ticket */}
            {pass.passType === 'VEHICLE' && pass.vehiclePass && (
              <>
                <tr>
                  <td colSpan={2} style={{ borderBottom: '1px solid #000000', padding: '10px 15px', backgroundColor: '#fffbe6' }}>
                    <span style={{ color: '#002766', fontWeight: 'bold' }}>Vehicle Plate Number : </span>
                    <span style={{ color: '#e01b22', fontWeight: 'bold', fontFamily: 'monospace' }}>{pass.vehiclePass.vehicle?.numberPlate}</span>
                  </td>
                </tr>
                <tr>
                  <td style={{ borderBottom: '1px solid #000000', borderRight: '1px solid #000000', padding: '10px 15px', width: '50%' }}>
                    <span style={{ color: '#002766', fontWeight: 'bold' }}>Vehicle Make / Model : </span>
                    <span style={{ color: '#52c41a', fontWeight: 'bold' }}>{pass.vehiclePass.vehicle?.make} {pass.vehiclePass.vehicle?.model}</span>
                  </td>
                  <td style={{ borderBottom: '1px solid #000000', padding: '10px 15px', width: '50%' }}>
                    <span style={{ color: '#002766', fontWeight: 'bold' }}>Vehicle Type : </span>
                    <span style={{ color: '#52c41a', fontWeight: 'bold' }}>{pass.vehiclePass.vehicle?.vehicleType}</span>
                  </td>
                </tr>
                <tr>
                  <td style={{ borderBottom: '1px solid #000000', borderRight: '1px solid #000000', padding: '10px 15px', width: '50%' }}>
                    <span style={{ color: '#002766', fontWeight: 'bold' }}>Authorized Driver : </span>
                    <span style={{ color: '#52c41a', fontWeight: 'bold' }}>{pass.vehiclePass.driverName}</span>
                  </td>
                  <td style={{ borderBottom: '1px solid #000000', padding: '10px 15px', width: '50%' }}>
                    <span style={{ color: '#002766', fontWeight: 'bold' }}>Driver Phone : </span>
                    <span style={{ color: '#52c41a', fontWeight: 'bold' }}>{pass.vehiclePass.driverPhone}</span>
                  </td>
                </tr>
              </>
            )}

            {/* Conditional Hostel Guest Details in Printable Ticket */}
            {pass.passType === 'HOSTEL_GUEST' && pass.hostelGuest && (
              <>
                <tr>
                  <td colSpan={2} style={{ borderBottom: '1px solid #000000', padding: '10px 15px', backgroundColor: '#fffbe6' }}>
                    <span style={{ color: '#002766', fontWeight: 'bold' }}>Hostel Block : </span>
                    <span style={{ color: '#e01b22', fontWeight: 'bold' }}>{pass.hostelGuest.hostelBlock}</span>
                  </td>
                </tr>
                <tr>
                  <td style={{ borderBottom: '1px solid #000000', borderRight: '1px solid #000000', padding: '10px 15px', width: '50%' }}>
                    <span style={{ color: '#002766', fontWeight: 'bold' }}>Room Number : </span>
                    <span style={{ color: '#52c41a', fontWeight: 'bold' }}>{pass.hostelGuest.roomNumber}</span>
                  </td>
                  <td style={{ borderBottom: '1px solid #000000', padding: '10px 15px', width: '50%' }}>
                    <span style={{ color: '#002766', fontWeight: 'bold' }}>Planned Nights : </span>
                    <span style={{ color: '#52c41a', fontWeight: 'bold' }}>{pass.hostelGuest.plannedNights} night(s)</span>
                  </td>
                </tr>
              </>
            )}

            <tr>
              <td colSpan={2} style={{ padding: '10px 15px' }}>
                <span style={{ color: '#002766', fontWeight: 'bold' }}>Visit Period : </span>
                <span style={{ color: '#002766', fontWeight: 'bold' }}>From : </span>
                <span style={{ color: '#52c41a', fontWeight: 'bold' }}>{formatPassDate(pass.validFrom)}</span>
                <span style={{ color: '#002766', fontWeight: 'bold' }}> To : </span>
                <span style={{ color: '#52c41a', fontWeight: 'bold' }}>{formatPassDate(pass.validTo)}</span>
              </td>
            </tr>
          </tbody>
        </table>

        {/* QR Code Section */}
        <div style={{
          borderTop: '2px solid #000000',
          padding: '20px',
          textAlign: 'center',
          backgroundColor: '#ffffff'
        }}>
          {pass.qrImageUrl ? (
            <div style={{ display: 'inline-block', border: '1px solid #000000', padding: '10px', backgroundColor: '#ffffff' }}>
              <img src={pass.qrImageUrl} alt="QR Code" style={{ width: '180px', height: '180px', display: 'block' }} />
            </div>
          ) : (
            <div style={{ fontSize: '14px', color: '#ff0000', fontWeight: 'bold' }}>QR Code Pending Approval</div>
          )}
        </div>
      </div>
      
      {/* Footer Instructions */}
      <div className="print-only" style={{
        width: '650px',
        margin: '10px auto 30px auto',
        textAlign: 'center',
        fontSize: '16px',
        fontWeight: 'bold',
        color: '#e01b22'
      }}>
        Please show this at SGSITS entry/exit gate
      </div>

      <div className="pass-detail-container no-print" style={{ display: 'grid', gridTemplateColumns: '1.3fr 0.7fr', gap: '2rem', alignItems: 'start' }}>
      
      {/* Left Column - Details */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* Core Header Card */}
        <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <div>
              <span style={{
                display: 'inline-block',
                padding: '0.25rem 0.75rem',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: 700,
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                color: '#60a5fa',
                textTransform: 'uppercase',
                marginBottom: '0.5rem',
              }}>
                {pass.passType.replace('_', ' ')}
              </span>
              <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>Pass {pass.passNumber}</h2>
              <p style={{ margin: '0.25rem 0 0 0', color: '#94a3b8', fontSize: '0.875rem' }}>
                Requested by: {pass.requester?.firstName} {pass.requester?.lastName} ({pass.requester?.role.toLowerCase()})
              </p>
            </div>
            
            <div style={{ textAlign: 'right' }}>
              <span style={{
                display: 'inline-block',
                padding: '0.4rem 1rem',
                borderRadius: '9999px',
                fontSize: '0.8125rem',
                fontWeight: 700,
                backgroundColor: statusColors.bg,
                color: statusColors.text,
              }}>
                {pass.status.replace('_', ' ')}
              </span>
              <span style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginTop: '6px' }}>
                Created: {new Date(pass.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
            <div>
              <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Valid From</span>
              <span style={{ fontWeight: 600 }}>{new Date(pass.validFrom).toLocaleString()}</span>
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Valid Until</span>
              <span style={{ fontWeight: 600 }}>{new Date(pass.validTo).toLocaleString()}</span>
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Allowed Gates</span>
              <span>{pass.allowedGates.join(', ')}</span>
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Entry Config</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                {pass.isMultiEntry ? (
                  <>
                    <RefreshCw size={14} style={{ color: 'var(--primary)' }} /> Multi-Entry Allowed
                  </>
                ) : (
                  <>
                    <Lock size={14} style={{ color: 'var(--text-muted)' }} /> Single Entry Only
                  </>
                )}
              </span>
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Pass Created By</span>
              <span style={{ fontWeight: 600 }}>{pass.createdByName || `${pass.requester?.firstName} ${pass.requester?.lastName}`}</span>
            </div>
            {pass.creatorDept && (
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Creator Dept/Section</span>
                <span style={{ fontWeight: 600 }}>{pass.creatorDept}</span>
              </div>
            )}
          </div>

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', marginTop: '1.5rem' }}>
            <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Purpose / Notes</span>
            <p style={{ margin: 0, lineHeight: 1.5 }}>{pass.purpose}</p>
            {pass.notes && <p style={{ margin: '0.5rem 0 0 0', color: '#94a3b8', fontStyle: 'italic' }}>Note: {pass.notes}</p>}
          </div>

          {pass.revokedReason && (
            <div style={{ borderTop: '1px solid rgba(239, 68, 68, 0.2)', backgroundColor: 'rgba(239, 68, 68, 0.05)', padding: '1rem', borderRadius: '8px', marginTop: '1.5rem', color: '#fca5a5' }}>
              <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Revocation Reason</span>
              <p style={{ margin: 0, fontSize: '0.875rem' }}>{pass.revokedReason}</p>
            </div>
          )}
        </div>

        {/* Visitor / Guest Information Card */}
        <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '2rem' }}>
          <h3 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-h)' }}>
            <User size={20} style={{ color: 'var(--primary)' }} /> Visitor Profile Details
          </h3>
          
          <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
            {pass.visitorPhotoUrl ? (
              <img 
                src={pass.visitorPhotoUrl} 
                alt="Visitor ID Capture" 
                style={{ width: '120px', height: '140px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border-color)' }}
              />
            ) : (
              <div style={{ width: '120px', height: '140px', backgroundColor: '#ffffff', border: '1px dashed var(--border-color)', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.75rem', textAlign: 'center', padding: '0.5rem', gap: '0.25rem' }}>
                <Camera size={24} />
                <span>No photo uploaded</span>
              </div>
            )}

            <div style={{ flexGrow: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Full Name</span>
                <span style={{ fontWeight: 600 }}>{pass.visitor?.name}</span>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Contact Number</span>
                <span style={{ fontWeight: 600 }}>{pass.visitor?.phone}</span>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Identification Document</span>
                <span>{pass.visitor?.idType} ({pass.visitor?.idNumber})</span>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Category</span>
                <span style={{ fontWeight: 'bold', color: pass.visitor?.category === 'VIP' ? '#f59e0b' : '#a7f3d0' }}>
                  {pass.visitor?.category}
                </span>
              </div>
              {pass.comingFrom && (
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Coming From</span>
                  <span style={{ fontWeight: 600 }}>{pass.comingFrom}</span>
                </div>
              )}
              {pass.visitor?.email && (
                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Email Address</span>
                  <span>{pass.visitor.email}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Specialized Modules details (Hostel / Vehicle) */}
        {pass.passType === 'HOSTEL_GUEST' && pass.hostelGuest && (
          <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '2rem' }}>
            <h3 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-h)' }}>
              <Building size={20} style={{ color: 'var(--primary)' }} /> Hostel Guest Verification
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Hostel Block</span>
                <span style={{ fontWeight: 600 }}>{pass.hostelGuest.hostelBlock}</span>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Room Number</span>
                <span style={{ fontWeight: 600 }}>{pass.hostelGuest.roomNumber}</span>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Planned Stay</span>
                <span style={{ fontWeight: 600 }}>{pass.hostelGuest.plannedNights} night(s)</span>
              </div>
            </div>
          </div>
        )}

        {pass.passType === 'VEHICLE' && pass.vehiclePass && (
          <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '2rem' }}>
            <h3 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-h)' }}>
              <Car size={20} style={{ color: 'var(--primary)' }} /> Vehicle Pass Details
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Plate Number</span>
                <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{pass.vehiclePass.vehicle?.numberPlate}</span>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Make / Model</span>
                <span style={{ fontWeight: 600 }}>{pass.vehiclePass.vehicle?.make} {pass.vehiclePass.vehicle?.model}</span>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Vehicle Type</span>
                <span style={{ fontWeight: 600 }}>{pass.vehiclePass.vehicle?.vehicleType}</span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Authorized Driver</span>
                <span>{pass.vehiclePass.driverName}</span>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Driver Phone</span>
                <span>{pass.vehiclePass.driverPhone}</span>
              </div>
            </div>
          </div>
        )}

        {/* Scans Audit History */}
        <div className="scans-log-card" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '2rem' }}>
          <h3 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-h)' }}>
            <History size={20} style={{ color: 'var(--primary)' }} /> Gate Entry/Exit Scans Log
          </h3>
          {pass.entryLogs && pass.entryLogs.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {pass.entryLogs.map((log) => (
                <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1rem', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'var(--bg-base)' }}>
                  <div>
                    <span style={{
                      display: 'inline-block',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      backgroundColor: log.logType === 'ENTRY' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                      color: log.logType === 'ENTRY' ? '#10b981' : '#3b82f6',
                      marginRight: '0.75rem',
                    }}>
                      {log.logType}
                    </span>
                    <span style={{ fontWeight: 600 }}>Gate: {log.gate}</span>
                    {log.isManualOverride && (
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#fbbf24', backgroundColor: 'rgba(245, 158, 11, 0.15)', padding: '1px 6px', borderRadius: '4px' }}>
                        Override
                      </span>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '0.8125rem', color: '#94a3b8' }}>
                    {log.entryAt && <div>Checked In: {new Date(log.entryAt).toLocaleString()}</div>}
                    {log.exitAt && <div>Checked Out: {new Date(log.exitAt).toLocaleString()}</div>}
                    {log.dwellMinutes !== null && log.dwellMinutes !== undefined && (
                      <div style={{ fontWeight: 600, color: 'var(--text-main)', marginTop: '2px' }}>Dwell Time: {log.dwellMinutes} minutes</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ margin: 0, color: '#94a3b8', fontStyle: 'italic' }}>No logged entries/exits recorded for this pass yet.</p>
          )}
        </div>
      </div>

      {/* Right Column - QR display / Quick Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* QR Code Presentation Panel */}
        <div className="print-pass-qr-card" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '2.5rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h4 style={{ margin: '0 0 1.5rem 0', fontSize: '1.125rem' }}>Security QR Pass Image</h4>
          
          {(pass.status === 'APPROVED' || pass.status === 'ACTIVE') && pass.qrImageUrl ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div className="qr-box" style={{ width: '220px', height: '220px', padding: '0.5rem', boxSizing: 'border-box' }}>
                <div className="qr-scanner-line"></div>
                <img 
                  src={pass.qrImageUrl} 
                  alt="Security QR Code Token" 
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>
              <div className="visual-badge" style={{ marginTop: '1.5rem' }}>
                <span className="dot pulse green"></span> Valid Access Pass
              </div>
              <p style={{ marginTop: '1rem', fontSize: '0.8125rem', color: '#94a3b8', lineHeight: 1.4 }}>
                Present this encrypted QR code at any authorized campus entry gates. Verification takes under 3 seconds.
              </p>
              {pass.qrToken && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(pass.qrToken || '');
                    alert('Encrypted QR Token copied to clipboard!');
                  }}
                  className="btn btn-secondary"
                  style={{
                    marginTop: '1rem',
                    fontSize: '0.75rem',
                    padding: '0.35rem 0.85rem',
                    borderColor: 'rgba(59, 130, 246, 0.4)',
                    color: '#60a5fa',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                  }}
                >
                  <Copy size={12} /> Copy Token for Terminal
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '220px', width: '220px', border: '2px dashed var(--border-color)', borderRadius: '12px', backgroundColor: '#ffffff', color: '#94a3b8', padding: '1rem', boxSizing: 'border-box', gap: '0.5rem' }}>
              <Lock size={48} style={{ color: 'var(--text-muted)' }} />
              <h5 style={{ margin: '0.25rem 0 0.25rem 0', color: 'var(--text-main)' }}>QR Code Locked</h5>
              <p style={{ margin: 0, fontSize: '0.75rem', lineHeight: 1.4 }}>
                QR keys are only generated and visible for approved or active access passes.
              </p>
            </div>
          )}
        </div>

        {/* Quick Review / Revocation Panel */}
        <div className="quick-actions-card" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '2rem' }}>
          <h4 style={{ margin: '0 0 1.25rem 0' }}>Quick Actions</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* Print Pass PDF */}
            {(pass.status === 'APPROVED' || pass.status === 'ACTIVE') && (
              <button 
                onClick={() => window.print()}
                className="btn btn-primary w-full"
                style={{ backgroundColor: '#3b82f6', borderColor: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                <Printer size={16} /> Print / Save PDF
              </button>
            )}

            {/* Review Button */}
            {pass.status === 'PENDING_APPROVAL' && can('approve_pass') && (
              <button 
                onClick={() => setReviewModalOpen(true)}
                className="btn btn-primary w-full"
                style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
              >
                Review Approval Request
              </button>
            )}

            {/* Revoke Button */}
            {(pass.status === 'APPROVED' || pass.status === 'ACTIVE') && 
              (pass.requesterId === user?.id || ['SECURITY_ADMIN', 'SUPER_ADMIN'].includes(user?.role || '')) && (
              <button 
                onClick={() => { setRevokeError(null); setRevokeModalOpen(true); }}
                className="btn btn-secondary w-full"
                style={{ color: '#ef4444', borderColor: '#ef4444' }}
              >
                Revoke Pass Authorization
              </button>
            )}

            <button onClick={() => navigate('/passes')} className="btn btn-secondary w-full">
              Back to Pass Directory
            </button>
          </div>
        </div>
      </div>

      {/* Review Dialog Modal */}
      {reviewModalOpen && (
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
              Review access request for <strong>{pass.visitor?.name}</strong>.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#94a3b8' }}>Reviewer Comments</label>
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
              <button disabled={reviewing} onClick={() => setReviewModalOpen(false)} className="btn btn-secondary">
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

      {/* Revoke Dialog Modal */}
      {revokeModalOpen && (
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
              Are you sure you want to revoke pass <strong>{pass.passNumber}</strong>? The visitor will immediately be denied campus access.
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
              <button disabled={revoking} onClick={() => setRevokeModalOpen(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button disabled={revoking} onClick={handleRevoke} className="btn btn-primary" style={{ backgroundColor: '#ef4444', borderColor: '#ef4444' }}>
                Revoke Pass
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default PassDetailPage;
