import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { verifyQR, manualOverride } from '../../services/entry.service';
import api from '../../services/api';
import { Shield, Scan, Camera, CameraOff, CheckCircle2, User, XCircle, ShieldAlert } from 'lucide-react';

export const GateTerminalPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token');

  const [gate, setGate] = useState('Main Gate');
  const [qrToken, setQrToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Camera QR Scanner state
  const [scannerActive, setScannerActive] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'qr-camera-reader';

  // Auto-verify when URL contains a token param
  useEffect(() => {
    if (tokenFromUrl) {
      setQrToken(tokenFromUrl);
      const autoVerify = async () => {
        setLoading(true);
        setResult(null);
        setError(null);
        try {
          const res = await verifyQR({ qrToken: tokenFromUrl, gate });
          if (res && res.success) {
            setResult(res.data);
            setQrToken(''); // Clear input
            // Clear parameter from URL so reload does not repeat action
            setSearchParams({}, { replace: true });
          }
        } catch (err: any) {
          setError(err.response?.data?.message || 'QR Verification failed');
        } finally {
          setLoading(false);
        }
      };
      autoVerify();
    }
  }, [tokenFromUrl, gate, setSearchParams]);

  // Manual Override states
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overridePassId, setOverridePassId] = useState('');
  const [overrideLogType, setOverrideLogType] = useState<'ENTRY' | 'EXIT'>('ENTRY');
  const [overrideReason, setOverrideReason] = useState('');
  const [submittingOverride, setSubmittingOverride] = useState(false);

  /**
   * Extract the QR token from a scanned URL or raw token string.
   * The QR code embeds a URL like: https://domain.com/terminal?token=ENCRYPTED_TOKEN
   * We need to extract the token parameter value from that URL.
   */
  const extractTokenFromScan = useCallback((decodedText: string): string => {
    try {
      // Try parsing as a URL first
      const url = new URL(decodedText);
      const token = url.searchParams.get('token');
      if (token) return token;
    } catch {
      // Not a URL — treat the raw text as the token itself
    }
    return decodedText;
  }, []);

  /**
   * Handle a successful QR code scan from the camera
   */
  const handleCameraScanSuccess = useCallback(async (decodedText: string) => {
    // Stop the scanner immediately to prevent duplicate scans
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
      } catch { /* already stopped */ }
      setScannerActive(false);
    }

    const token = extractTokenFromScan(decodedText);
    setQrToken(token);
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await verifyQR({ qrToken: token, gate });
      if (res && res.success) {
        setResult(res.data);
        setQrToken('');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'QR Verification failed');
    } finally {
      setLoading(false);
    }
  }, [gate, extractTokenFromScan]);

  /**
   * Start the camera QR scanner
   */
  const startScanner = useCallback(async () => {
    setScannerError(null);
    setResult(null);
    setError(null);

    try {
      const html5QrCode = new Html5Qrcode(scannerContainerId);
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' }, // Use rear camera on mobile
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          handleCameraScanSuccess(decodedText);
        },
        () => {
          // QR code not found in this frame — this is normal, do nothing
        }
      );

      setScannerActive(true);
    } catch (err: any) {
      console.error('Camera scanner error:', err);
      let message = 'Unable to access camera. ';
      if (typeof err === 'string') {
        message += err;
      } else if (err?.message) {
        message += err.message;
      }
      if (message.includes('NotAllowed') || message.includes('Permission')) {
        message = 'Camera permission denied. Please allow camera access in your browser settings and try again.';
      } else if (message.includes('NotFound') || message.includes('no camera')) {
        message = 'No camera found on this device. Please use a device with a camera.';
      }
      setScannerError(message);
      setScannerActive(false);
    }
  }, [handleCameraScanSuccess]);

  /**
   * Stop the camera QR scanner
   */
  const stopScanner = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
      } catch { /* already stopped */ }
      html5QrCodeRef.current = null;
    }
    setScannerActive(false);
  }, []);

  // Cleanup scanner on component unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrToken) return;

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await verifyQR({ qrToken, gate });
      if (res && res.success) {
        setResult(res.data);
        setQrToken(''); // Clear token input for next scan
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'QR Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleManualOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overridePassId || !overrideReason) {
      alert('Please fill out all override fields');
      return;
    }

    setSubmittingOverride(true);
    try {
      const res = await manualOverride({
        passId: overridePassId,
        gate,
        logType: overrideLogType,
        overrideReason,
      });

      if (res && res.success) {
        alert('Manual override logged successfully!');
        setResult(res.data);
        setShowOverrideModal(false);
        setOverridePassId('');
        setOverrideReason('');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Override check-in failed');
    } finally {
      setSubmittingOverride(false);
    }
  };

  const gateOptions = ['Main Gate', 'Hostel Gate', 'Academic Block Gate', 'Research Park Gate'];

  return (
    <div className="grid-terminal-layout" style={{ gap: '2rem', alignItems: 'start' }}>
      
      {/* Scanner & Verification View */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* Terminal Configuration */}
        <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-h)' }}>
              <Shield size={22} style={{ color: 'var(--primary)' }} /> Active Security Terminal
            </h3>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginRight: '0.75rem' }}>Assigned Gate:</label>
              <select
                value={gate}
                onChange={(e) => {
                  setGate(e.target.value);
                  setResult(null);
                  setError(null);
                }}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                  padding: '0.4rem 1rem',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {gateOptions.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Camera QR Scanner Section */}
          <div style={{
            marginBottom: '1.5rem',
            backgroundColor: '#f8fafc',
            border: '2px dashed var(--border-color)',
            borderRadius: '12px',
            padding: '1.5rem',
            textAlign: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Camera size={20} style={{ color: 'var(--primary)' }} />
              <span style={{ fontWeight: 600, color: 'var(--text-h)', fontSize: '1rem' }}>Camera QR Scanner</span>
            </div>

            {/* Scanner viewport container */}
            <div
              id={scannerContainerId}
              style={{
                width: '100%',
                maxWidth: '400px',
                margin: '0 auto',
                borderRadius: '8px',
                overflow: 'hidden',
                display: scannerActive ? 'block' : 'none',
              }}
            />

            {!scannerActive ? (
              <div>
                <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1rem', lineHeight: 1.5 }}>
                  Point your phone camera at the visitor's gate pass QR code to instantly verify their entry credentials.
                </p>
                <button
                  type="button"
                  onClick={startScanner}
                  className="btn btn-primary"
                  style={{
                    padding: '0.875rem 2.5rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '1rem',
                    fontWeight: 600,
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #002147 0%, #0056b3 100%)',
                    border: 'none',
                    color: '#ffffff',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(0, 33, 71, 0.3)',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 33, 71, 0.4)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 14px rgba(0, 33, 71, 0.3)';
                  }}
                >
                  <Camera size={20} /> Open Camera & Scan QR
                </button>
              </div>
            ) : (
              <div style={{ marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={stopScanner}
                  className="btn btn-secondary"
                  style={{
                    padding: '0.625rem 1.5rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    borderColor: '#ef4444',
                    color: '#ef4444',
                  }}
                >
                  <CameraOff size={16} /> Stop Camera
                </button>
                <p style={{ color: '#64748b', fontSize: '0.8125rem', marginTop: '0.75rem' }}>
                  Scanning... Point the camera at a QR code on the visitor's pass.
                </p>
              </div>
            )}

            {scannerError && (
              <div style={{
                marginTop: '1rem',
                backgroundColor: 'rgba(239, 68, 68, 0.05)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                color: '#ef4444',
                fontSize: '0.875rem',
                textAlign: 'left',
              }}>
                {scannerError}
              </div>
            )}
          </div>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }} />
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>or paste token manually</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }} />
          </div>

          {/* Manual Token Input */}
          <form onSubmit={handleScanSubmit} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ flexGrow: 1 }}>
              <input
                type="text"
                placeholder="Paste encrypted QR token payload here..."
                value={qrToken}
                onChange={(e) => setQrToken(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: '#ffffff',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  fontSize: '0.9375rem',
                  fontFamily: 'var(--font-mono)',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <button type="submit" disabled={loading || !qrToken} className="btn btn-primary" style={{ padding: '0.75rem 2rem', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {loading ? 'Verifying...' : (
                <>
                  <Scan size={16} /> Verify Token
                </>
              )}
            </button>
          </form>
        </div>

        {/* Loading indicator */}
        {loading && (
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            border: '2px solid var(--primary)',
            borderRadius: '16px',
            padding: '2rem',
            textAlign: 'center',
            animation: 'fadeIn 0.3s ease-out',
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '4px solid #e2e8f0',
              borderTopColor: 'var(--primary)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1rem auto',
            }} />
            <p style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: '1.125rem', margin: 0 }}>Verifying pass credentials...</p>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: '0.5rem 0 0 0' }}>Decrypting QR token and checking pass validity</p>
          </div>
        )}

        {/* Scan Results Panel */}
        {result && (
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            border: '2px solid #10b981',
            borderRadius: '16px',
            padding: '2rem',
            boxShadow: '0 0 25px rgba(16, 185, 129, 0.1)',
            animation: 'fadeIn 0.3s ease-out',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h4 style={{ margin: 0, color: '#10b981', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={20} /> Verification Success — {result.logType} LOGGED
              </h4>
              <span style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>
                Time: {new Date(result.entryAt || result.exitAt || new Date()).toLocaleTimeString()}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              {result.pass?.visitor?.idPhotoKey ? (
                <img
                  src={`${api.defaults.baseURL}/visitor/photo/${result.pass.visitor.id}`}
                  alt="Visitor Face"
                  style={{ width: '120px', height: '140px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                  onError={(e) => {
                    e.currentTarget.src = '';
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div style={{ width: '120px', height: '140px', backgroundColor: '#ffffff', border: '1px dashed var(--border-color)', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.75rem', textAlign: 'center', padding: '0.5rem', gap: '0.25rem' }}>
                  <User size={24} />
                  <span>No profile picture</span>
                </div>
              )}

              <div className="grid-2-col" style={{ flexGrow: 1, gap: '1rem' }}>
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Visitor Name</span>
                  <span style={{ fontWeight: 600, fontSize: '1.125rem' }}>{result.pass?.visitor?.name}</span>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Gate Pass Number</span>
                  <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', color: '#60a5fa' }}>{result.pass?.passNumber}</span>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Allowed Gates</span>
                  <span>{result.pass?.allowedGates?.join(', ')}</span>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Category / Type</span>
                  <span>{result.pass?.visitor?.category} ({result.pass?.passType})</span>
                </div>
                {result.vehiclePlate && (
                  <div style={{ gridColumn: 'span 2', backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: '#38bdf8', textTransform: 'uppercase', fontWeight: 'bold' }}>Vehicle Plate Registered</span>
                    <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{result.vehiclePlate}</span>
                  </div>
                )}
                {result.dwellMinutes !== null && result.dwellMinutes !== undefined && (
                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Total Campus Dwell Time</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{result.dwellMinutes} minutes</span>
                  </div>
                )}
              </div>
            </div>

            {/* Scan again button */}
            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => {
                  setResult(null);
                  setError(null);
                  startScanner();
                }}
                className="btn btn-primary"
                style={{
                  padding: '0.75rem 2rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: 'linear-gradient(135deg, #002147 0%, #0056b3 100%)',
                  border: 'none',
                  color: '#ffffff',
                  borderRadius: '10px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Camera size={18} /> Scan Next Visitor
              </button>
            </div>
          </div>
        )}

        {/* Scan Error Panel */}
        {error && (
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            border: '2px solid #ef4444',
            borderRadius: '16px',
            padding: '2rem',
            boxShadow: '0 0 25px rgba(239, 68, 68, 0.1)',
            animation: 'fadeIn 0.3s ease-out',
            textAlign: 'center',
          }}>
            <XCircle size={48} style={{ color: '#ef4444' }} />
            <h4 style={{ margin: '1rem 0 0.5rem 0', color: '#ef4444', fontSize: '1.25rem' }}>Access Denied / Verification Failed</h4>
            <p style={{ margin: '0 0 1.5rem 0', color: '#94a3b8', fontSize: '0.9375rem' }}>{error}</p>
            <div style={{ fontSize: '0.8125rem', color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.05)', padding: '0.5rem', borderRadius: '6px', display: 'inline-block', marginBottom: '1rem' }}>
              SECURITY BREACH ALERT: Do not admit visitor to campus.
            </div>
            <div>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  startScanner();
                }}
                className="btn btn-secondary"
                style={{ padding: '0.625rem 1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Camera size={16} /> Try Again
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Manual Override & Side Panel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* Guard Quick Actions */}
        <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '2rem' }}>
          <h4 style={{ margin: '0 0 1rem 0' }}>Terminal Actions</h4>
          <p style={{ color: '#94a3b8', fontSize: '0.8125rem', marginBottom: '1.5rem', lineHeight: 1.4 }}>
            If a visitor does not have a smartphone or has issues reading their QR pass code, log entry/exit override manually.
          </p>
          <button onClick={() => setShowOverrideModal(true)} className="btn btn-secondary w-full" style={{ borderColor: '#f59e0b', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <ShieldAlert size={16} /> Log Manual Override
          </button>
        </div>

        {/* Live Gate Feed Simulation */}
        <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '2rem' }}>
          <h4 style={{ margin: '0 0 1rem 0' }}>Live Gate Traffic</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.8125rem', color: '#94a3b8' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <span>Main Gate (Entry)</span>
              <span style={{ color: '#10b981' }}>Nominal</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <span>Hostel Gate (Exit)</span>
              <span style={{ color: '#10b981' }}>Nominal</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <span>Academic Block Gate</span>
              <span style={{ color: '#10b981' }}>Nominal</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Research Park Gate</span>
              <span style={{ color: '#10b981' }}>Nominal</span>
            </div>
          </div>
        </div>
      </div>

      {/* Manual Override Modal */}
      {showOverrideModal && (
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
            <h3 style={{ margin: '0 0 1rem 0', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldAlert size={20} /> Log Security Override
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Bypasses QR validation using verbal or physical pass confirmation. The guard accepts full accountability for this log.
            </p>

            <form onSubmit={handleManualOverride} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label>Pass ID (Hexadecimal Reference)</label>
                <input 
                  type="text" 
                  placeholder="Enter the database Pass ID..." 
                  value={overridePassId}
                  onChange={(e) => setOverridePassId(e.target.value)}
                  required 
                />
              </div>

              <div className="form-group">
                <label>Direction Type</label>
                <select
                  value={overrideLogType}
                  onChange={(e) => setOverrideLogType(e.target.value as any)}
                  className="form-select"
                >
                  <option value="ENTRY">ENTRY (Check In)</option>
                  <option value="EXIT">EXIT (Check Out)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Justification Reason</label>
                <textarea
                  rows={3}
                  placeholder="E.g., QR reader mismatch, paper copy confirmation, visitor device dead battery..."
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  required
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

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowOverrideModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submittingOverride} className="btn btn-primary" style={{ backgroundColor: '#f59e0b', borderColor: '#f59e0b' }}>
                  {submittingOverride ? 'Logging override...' : 'Authorize Access'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GateTerminalPage;
