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

  const [scannerError, setScannerError] = useState<string | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef(false);
  const scannerContainerId = 'qr-camera-reader';

  // In-app scan validation state machine
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'verifying' | 'success' | 'failure'>('idle');
  const [scanResult, setScanResult] = useState<any | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

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
            setQrToken('');
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

  // Full-screen scanner state
  const [showFullScreenScanner, setShowFullScreenScanner] = useState(false);

  /**
   * Extract the token from a scanned URL or raw token string
   */
  const extractTokenFromScan = useCallback((decodedText: string): string => {
    try {
      const url = new URL(decodedText);
      const token = url.searchParams.get('token');
      if (token) return token;
    } catch {
      // Not a URL — treat the raw text as the token itself
    }
    return decodedText;
  }, []);

  /**
   * Release camera resources and clean up Html5Qrcode instance safely
   */
  const cleanupCameraOnly = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
      } catch (err) {
        console.error('Error stopping scanner during cleanup:', err);
      }
      try {
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.error('Error clearing scanner during cleanup:', err);
      }
      html5QrCodeRef.current = null;
    }
  }, []);

  /**
   * Handle a successful QR code scan from the camera
   */
  const handleCameraScanSuccess = useCallback(async (decodedText: string) => {
    // Prevent duplicate processing
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    // Stop and release camera feed immediately while verifying
    await cleanupCameraOnly();
    setScanState('verifying');

    const token = extractTokenFromScan(decodedText);
    setQrToken(token);

    try {
      const res = await verifyQR({ qrToken: token, gate });
      if (res && res.success) {
        setScanResult(res.data);
        setScanState('success');
        setResult(res.data); // sync with main dashboard layout results
        setError(null);
        setQrToken('');
      } else {
        setScanError('QR Pass verification failed');
        setScanState('failure');
        setError('QR Pass verification failed');
        setResult(null);
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'QR Verification failed';
      setScanError(errMsg);
      setScanState('failure');
      setError(errMsg); // sync with main dashboard layout results
      setResult(null);
    } finally {
      isProcessingRef.current = false;
    }
  }, [gate, extractTokenFromScan, cleanupCameraOnly]);

  /**
   * Start the full-screen camera QR scanner
   */
  const startScanner = useCallback(async () => {
    setScannerError(null);
    setScanResult(null);
    setScanError(null);
    setScanState('scanning');
    isProcessingRef.current = false;
    setShowFullScreenScanner(true);

    // Wait for DOM to render the container
    await new Promise(resolve => setTimeout(resolve, 150));

    try {
      const html5QrCode = new Html5Qrcode(scannerContainerId);
      html5QrCodeRef.current = html5QrCode;

      // Try exact environment camera constraint first, fallback to environment
      try {
        await html5QrCode.start(
          { facingMode: { exact: 'environment' } },
          {
            fps: 15,
            aspectRatio: window.innerWidth / window.innerHeight,
            disableFlip: false,
          },
          (decodedText) => {
            handleCameraScanSuccess(decodedText);
          },
          () => {
            // QR code not found in this frame
          }
        );
      } catch (exactErr) {
        console.warn('Failed to start with exact environment, falling back to environment:', exactErr);
        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 15,
            aspectRatio: window.innerWidth / window.innerHeight,
            disableFlip: false,
          },
          (decodedText) => {
            handleCameraScanSuccess(decodedText);
          },
          () => {
            // QR code not found in this frame
          }
        );
      }


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
      setScanState('idle');
      setShowFullScreenScanner(false);
    }
  }, [handleCameraScanSuccess]);

  /**
   * Stop the camera QR scanner and close the fullscreen overlay
   */
  const stopScanner = useCallback(async () => {
    await cleanupCameraOnly();
    setShowFullScreenScanner(false);
    setScanState('idle');
    isProcessingRef.current = false;
  }, [cleanupCameraOnly]);

  // Cleanup scanner on component unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        if (html5QrCodeRef.current.isScanning) {
          html5QrCodeRef.current.stop().catch(() => {});
        }
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
        setQrToken('');
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
    <>
      {/* ===== FULL-SCREEN CAMERA SCANNER OVERLAY (like Paytm) ===== */}
      {showFullScreenScanner && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#000000',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Scanner header bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 20px',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            zIndex: 10002,
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Shield size={20} style={{ color: '#60a5fa' }} />
              <span style={{ color: '#ffffff', fontWeight: 600, fontSize: '1rem' }}>SGSITS Gate Scanner</span>
            </div>
            <button
              onClick={stopScanner}
              style={{
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid rgba(239, 68, 68, 0.5)',
                color: '#ef4444',
                padding: '8px 18px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <CameraOff size={16} /> Close
            </button>
          </div>

          {/* Camera viewfinder container — takes up all remaining space */}
          <div style={{
            flex: 1,
            position: 'relative',
            overflow: 'hidden',
            backgroundColor: '#000000',
          }}>
            {/* The actual HTML5-QRCODE camera feed node */}
            <div
              id={scannerContainerId}
              style={{
                width: '100%',
                height: '100%',
              }}
            />

            {/* Custom Paytm-style Viewfinder Overlay (Only visible when active scanning) */}
            {scanState === 'scanning' && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
                zIndex: 10000,
              }}>
                {/* Top dim layer */}
                <div style={{ flex: 1, width: '100%', backgroundColor: 'rgba(0, 0, 0, 0.65)' }} />

                {/* Middle viewport cutout row */}
                <div style={{ display: 'flex', width: '100%', height: '280px' }}>
                  <div style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.65)' }} />
                  
                  {/* Views box boundary */}
                  <div style={{
                    position: 'relative',
                    width: '280px',
                    height: '280px',
                    border: '1.5px dashed rgba(255, 255, 255, 0.35)',
                    boxSizing: 'border-box',
                  }}>
                    {/* Glowing corners */}
                    <div style={{
                      position: 'absolute',
                      top: '-4px',
                      left: '-4px',
                      width: '28px',
                      height: '28px',
                      borderTop: '5px solid #60a5fa',
                      borderLeft: '5px solid #60a5fa',
                      borderTopLeftRadius: '8px',
                    }} />
                    <div style={{
                      position: 'absolute',
                      top: '-4px',
                      right: '-4px',
                      width: '28px',
                      height: '28px',
                      borderTop: '5px solid #60a5fa',
                      borderRight: '5px solid #60a5fa',
                      borderTopRightRadius: '8px',
                    }} />
                    <div style={{
                      position: 'absolute',
                      bottom: '-4px',
                      left: '-4px',
                      width: '28px',
                      height: '28px',
                      borderBottom: '5px solid #60a5fa',
                      borderLeft: '5px solid #60a5fa',
                      borderBottomLeftRadius: '8px',
                    }} />
                    <div style={{
                      position: 'absolute',
                      bottom: '-4px',
                      right: '-4px',
                      width: '28px',
                      height: '28px',
                      borderBottom: '5px solid #60a5fa',
                      borderRight: '5px solid #60a5fa',
                      borderBottomRightRadius: '8px',
                    }} />

                    {/* Translating horizontal scan line */}
                    <div className="scanner-line" style={{
                      position: 'absolute',
                      width: '94%',
                      left: '3%',
                      height: '4px',
                      background: 'linear-gradient(90deg, transparent, #60a5fa, transparent)',
                      boxShadow: '0 0 10px #60a5fa, 0 0 4px #60a5fa',
                      animation: 'scan-anim 2.5s ease-in-out infinite',
                    }} />
                  </div>

                  <div style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.65)' }} />
                </div>

                {/* Bottom dim layer */}
                <div style={{ flex: 1, width: '100%', backgroundColor: 'rgba(0, 0, 0, 0.65)' }} />
              </div>
            )}

            {/* Scanning instruction bar */}
            {scanState === 'scanning' && (
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '24px 20px',
                textAlign: 'center',
                zIndex: 10001,
                background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 70%, transparent 100%)',
              }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(10px)',
                  padding: '10px 24px',
                  borderRadius: '30px',
                  marginBottom: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}>
                  <Scan size={18} style={{ color: '#60a5fa' }} />
                  <span style={{ color: '#ffffff', fontSize: '0.9375rem', fontWeight: 500 }}>
                    Point camera at the QR code on the visitor's pass
                  </span>
                </div>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8125rem', margin: '8px 0 0 0' }}>
                  Assigned Gate: {gate}
                </p>
              </div>
            )}

            {/* VERIFYING LOADER OVERLAY */}
            {scanState === 'verifying' && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '16px',
                zIndex: 10010,
                backdropFilter: 'blur(8px)',
              }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  border: '4px solid rgba(255,255,255,0.2)',
                  borderTopColor: '#60a5fa',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }} />
                <span style={{ color: '#ffffff', fontSize: '1rem', fontWeight: 600, letterSpacing: '0.02em' }}>
                  Verifying credentials...
                </span>
              </div>
            )}

            {/* SUCCESS VALID PASS CARD OVERLAY */}
            {scanState === 'success' && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
                zIndex: 10010,
                backdropFilter: 'blur(4px)',
              }}>
                <div style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '20px',
                  width: '100%',
                  maxWidth: '380px',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
                  overflow: 'hidden',
                  animation: 'scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                }}>
                  {/* Header */}
                  <div style={{
                    backgroundColor: '#10b981',
                    padding: '24px 20px',
                    textAlign: 'center',
                    color: '#ffffff',
                  }}>
                    <div style={{
                      width: '56px',
                      height: '56px',
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 12px auto',
                    }}>
                      <CheckCircle2 size={32} color="#ffffff" />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, letterSpacing: '0.02em' }}>
                      VALID PASS
                    </h3>
                    <p style={{ margin: '4px 0 0 0', opacity: 0.95, fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase' }}>
                      {scanResult?.logType} LOGGED
                    </p>
                  </div>

                  {/* Body Content */}
                  <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                      {scanResult?.pass?.visitor?.idPhotoKey ? (
                        <img
                          src={`${api.defaults.baseURL}/visitor/photo/${scanResult.pass.visitor.id}`}
                          alt="Profile"
                          style={{
                            width: '74px',
                            height: '88px',
                            objectFit: 'cover',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                          }}
                        />
                      ) : (
                        <div style={{
                          width: '74px',
                          height: '88px',
                          backgroundColor: '#f8fafc',
                          borderRadius: '8px',
                          border: '1px dashed #cbd5e1',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#94a3b8',
                          fontSize: '0.75rem',
                          textAlign: 'center',
                          padding: '4px',
                          boxSizing: 'border-box',
                        }}>
                          <User size={18} />
                          <span style={{ fontSize: '0.5625rem', marginTop: '2px' }}>No Photo</span>
                        </div>
                      )}

                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div>
                          <span style={{ fontSize: '0.625rem', color: '#94a3b8', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Visitor Name</span>
                          <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#1e293b' }}>
                            {scanResult?.pass?.visitor?.name}
                          </span>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.625rem', color: '#94a3b8', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Pass Number</span>
                          <span style={{ fontSize: '0.8125rem', fontWeight: 600, fontFamily: 'monospace', color: '#3b82f6' }}>
                            {scanResult?.pass?.passNumber}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ height: '1px', backgroundColor: '#f1f5f9' }} />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <span style={{ fontSize: '0.625rem', color: '#94a3b8', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Category / Type</span>
                        <span style={{ fontSize: '0.8125rem', color: '#334155', fontWeight: 600 }}>
                          {scanResult?.pass?.visitor?.category} ({scanResult?.pass?.passType})
                        </span>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.625rem', color: '#94a3b8', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Gate Verified</span>
                        <span style={{ fontSize: '0.8125rem', color: '#334155', fontWeight: 600 }}>
                          {scanResult?.gate}
                        </span>
                      </div>
                    </div>

                    {scanResult?.vehiclePlate && (
                      <div style={{
                        backgroundColor: '#f0f9ff',
                        border: '1px solid #e0f2fe',
                        padding: '6px 10px',
                        borderRadius: '6px',
                      }}>
                        <span style={{ fontSize: '0.625rem', color: '#0284c7', textTransform: 'uppercase', display: 'block', fontWeight: 700 }}>Vehicle Plate</span>
                        <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0369a1', fontFamily: 'monospace' }}>
                          {scanResult?.vehiclePlate}
                        </span>
                      </div>
                    )}

                    {scanResult?.dwellMinutes !== null && scanResult?.dwellMinutes !== undefined && (
                      <div>
                        <span style={{ fontSize: '0.625rem', color: '#94a3b8', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Dwell Time</span>
                        <span style={{ fontSize: '0.8125rem', color: '#334155', fontWeight: 600 }}>
                          {scanResult?.dwellMinutes} minutes
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{
                    backgroundColor: '#f8fafc',
                    padding: '12px 16px',
                    borderTop: '1px solid #f1f5f9',
                    display: 'flex',
                    gap: '10px',
                  }}>
                    <button
                      onClick={stopScanner}
                      style={{
                        flex: 1,
                        padding: '10px',
                        backgroundColor: '#e2e8f0',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#475569',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                      }}
                    >
                      Close
                    </button>
                    <button
                      onClick={startScanner}
                      style={{
                        flex: 2,
                        padding: '10px',
                        background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#ffffff',
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        boxShadow: '0 3px 8px rgba(16, 185, 129, 0.2)',
                      }}
                    >
                      Scan Next
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* FAILURE INVALID PASS CARD OVERLAY */}
            {scanState === 'failure' && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
                zIndex: 10010,
                backdropFilter: 'blur(4px)',
              }}>
                <div style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '20px',
                  width: '100%',
                  maxWidth: '380px',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
                  overflow: 'hidden',
                  animation: 'scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                }}>
                  {/* Header */}
                  <div style={{
                    backgroundColor: '#ef4444',
                    padding: '24px 20px',
                    textAlign: 'center',
                    color: '#ffffff',
                  }}>
                    <div style={{
                      width: '56px',
                      height: '56px',
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 12px auto',
                    }}>
                      <XCircle size={32} color="#ffffff" />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, letterSpacing: '0.02em' }}>
                      INVALID PASS
                    </h3>
                    <p style={{ margin: '4px 0 0 0', opacity: 0.95, fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase' }}>
                      ACCESS DENIED
                    </p>
                  </div>

                  {/* Body Content */}
                  <div style={{ padding: '24px 20px', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.9375rem', color: '#1e293b', fontWeight: 600, margin: '0 0 14px 0', lineHeight: 1.5 }}>
                      {scanError || 'An error occurred during pass verification.'}
                    </p>
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#b91c1c',
                      backgroundColor: 'rgba(239, 68, 68, 0.04)',
                      border: '1px solid rgba(239, 68, 68, 0.12)',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      display: 'inline-block',
                      fontWeight: 600,
                    }}>
                      SECURITY WARNING: Do not admit to campus
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{
                    backgroundColor: '#f8fafc',
                    padding: '12px 16px',
                    borderTop: '1px solid #f1f5f9',
                    display: 'flex',
                    gap: '10px',
                  }}>
                    <button
                      onClick={stopScanner}
                      style={{
                        flex: 1,
                        padding: '10px',
                        backgroundColor: '#e2e8f0',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#475569',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                      }}
                    >
                      Close
                    </button>
                    <button
                      onClick={startScanner}
                      style={{
                        flex: 2,
                        padding: '10px',
                        background: 'linear-gradient(135deg, #b91c1c 0%, #ef4444 100%)',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#ffffff',
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        boxShadow: '0 3px 8px rgba(239, 68, 68, 0.25)',
                      }}
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== MAIN TERMINAL PAGE ===== */}
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

            {/* Main Scan QR Button — prominent and large */}
            <div style={{
              textAlign: 'center',
              padding: '2.5rem 1.5rem',
              backgroundColor: '#f0f7ff',
              border: '2px dashed #bfdbfe',
              borderRadius: '16px',
              marginBottom: '1.5rem',
            }}>
              <Camera size={48} style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
              <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-h)', fontSize: '1.25rem' }}>
                Scan Visitor Pass QR Code
              </h4>
              <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: 1.6, maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
                Open your phone camera to scan the QR code printed on the visitor's gate pass PDF.
              </p>
              <button
                type="button"
                onClick={startScanner}
                disabled={loading}
                style={{
                  padding: '1rem 3rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  fontSize: '1.125rem',
                  fontWeight: 700,
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #002147 0%, #0056b3 100%)',
                  border: 'none',
                  color: '#ffffff',
                  cursor: 'pointer',
                  boxShadow: '0 6px 20px rgba(0, 33, 71, 0.35)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  letterSpacing: '0.02em',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 33, 71, 0.45)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 33, 71, 0.35)';
                }}
              >
                <Camera size={22} /> Open Camera & Scan QR
              </button>

              {scannerError && (
                <div style={{
                  marginTop: '1.25rem',
                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: '10px',
                  padding: '0.875rem 1.25rem',
                  color: '#dc2626',
                  fontSize: '0.875rem',
                  textAlign: 'left',
                  maxWidth: '420px',
                  marginLeft: 'auto',
                  marginRight: 'auto',
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
                  style={{
                    padding: '0.875rem 2.5rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: 'linear-gradient(135deg, #002147 0%, #0056b3 100%)',
                    border: 'none',
                    color: '#ffffff',
                    borderRadius: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '1rem',
                    boxShadow: '0 4px 14px rgba(0, 33, 71, 0.3)',
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
                  <Camera size={16} /> Try Scanning Again
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

          {/* Live Gate Feed */}
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
    </>
  );
};

export default GateTerminalPage;
