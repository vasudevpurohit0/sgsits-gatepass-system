import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { respondToSecurityPass } from '../../services/securityPass.service';
import { CheckCircle2, XCircle, AlertTriangle, Loader2 } from 'lucide-react';

export const SecurityPassRespondPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<{ status: string; message: string } | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!token) {
        setResult({ status: 'invalid', message: 'No approval token was provided.' });
        setLoading(false);
        return;
      }
      try {
        const res = await respondToSecurityPass(token);
        setResult({ status: res?.data?.status || 'invalid', message: res?.message || 'Request processed.' });
      } catch (err: any) {
        setResult({
          status: 'invalid',
          message: err.response?.data?.message || 'This approval link is invalid or has expired.',
        });
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [token]);

  const renderIcon = () => {
    if (loading) return <Loader2 size={48} className="animate-spin" style={{ color: 'var(--primary)' }} />;
    switch (result?.status) {
      case 'approved':
        return <CheckCircle2 size={48} style={{ color: '#10b981' }} />;
      case 'rejected':
        return <XCircle size={48} style={{ color: '#ef4444' }} />;
      default:
        return <AlertTriangle size={48} style={{ color: '#f59e0b' }} />;
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-base)', padding: '1.5rem' }}>
      <div className="card-standard" style={{ maxWidth: '460px', width: '100%', textAlign: 'center', padding: '2.5rem 2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>{renderIcon()}</div>
        <h2 style={{ margin: '0 0 0.75rem 0', fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-h)' }}>
          {loading ? 'Processing your response...' : 'Security Pass Approval'}
        </h2>
        {!loading && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', lineHeight: 1.5 }}>
            {result?.status === 'already_processed'
              ? 'This request has already been processed.'
              : result?.message}
          </p>
        )}
      </div>
    </div>
  );
};

export default SecurityPassRespondPage;
