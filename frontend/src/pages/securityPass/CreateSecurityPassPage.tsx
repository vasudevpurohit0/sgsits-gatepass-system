import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createSecurityPass, getApprovers } from '../../services/securityPass.service';

export const CreateSecurityPassPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [visitorName, setVisitorName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [govIdType, setGovIdType] = useState('AADHAAR');
  const [govIdNumber, setGovIdNumber] = useState('');
  const [govIdPhoto, setGovIdPhoto] = useState<File | null>(null);
  const [visitorPhoto, setVisitorPhoto] = useState<File | null>(null);
  const [purpose, setPurpose] = useState('');
  const [whomToVisit, setWhomToVisit] = useState('');
  const [remarks, setRemarks] = useState('');
  const [expectedDuration, setExpectedDuration] = useState('');
  const [entryGate, setEntryGate] = useState('Main Gate');

  const [availableApprovers, setAvailableApprovers] = useState<string[]>([]);
  const [selectedApprovers, setSelectedApprovers] = useState<string[]>([]);
  const [customEmail, setCustomEmail] = useState('');
  const [customEmailError, setCustomEmailError] = useState<string | null>(null);

  const handleAddCustomEmail = () => {
    setCustomEmailError(null);
    const emailToVal = customEmail.trim().toLowerCase();
    if (!emailToVal) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailToVal)) {
      setCustomEmailError('Please enter a valid email address.');
      return;
    }
    if (!availableApprovers.includes(emailToVal)) {
      setAvailableApprovers(prev => [...prev, emailToVal]);
    }
    if (!selectedApprovers.includes(emailToVal)) {
      setSelectedApprovers(prev => [...prev, emailToVal]);
    }
    setCustomEmail('');
  };

  useEffect(() => {
    const fetchApprovers = async () => {
      try {
        const res = await getApprovers();
        if (res && res.success) {
          setAvailableApprovers(res.data || []);
        }
      } catch (err) {
        console.error('Failed to load security approvers', err);
      }
    };
    fetchApprovers();
  }, []);

  const toggleApprover = (emailAddr: string) => {
    setSelectedApprovers(prev =>
      prev.includes(emailAddr) ? prev.filter(e => e !== emailAddr) : [...prev, emailAddr]
    );
  };

  const toggleSelectAll = () => {
    setSelectedApprovers(selectedApprovers.length === availableApprovers.length ? [] : [...availableApprovers]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (selectedApprovers.length === 0) {
      setError('Please select at least one approver to send this request to.');
      return;
    }

    setLoading(true);
    try {
      let formattedPhone = (phone || '').trim();
      if (!formattedPhone.startsWith('+')) {
        formattedPhone = `+91${formattedPhone}`;
      }

      const formData = new FormData();
      formData.append('visitorName', visitorName);
      formData.append('phone', formattedPhone);
      if (email) formData.append('email', email);
      formData.append('govIdType', govIdType);
      formData.append('govIdNumber', govIdNumber);
      formData.append('purpose', purpose);
      formData.append('whomToVisit', whomToVisit);
      if (remarks) formData.append('remarks', remarks);
      formData.append('expectedDuration', expectedDuration);
      formData.append('entryGate', entryGate);
      selectedApprovers.forEach(approver => formData.append('approverEmails', approver));

      if (govIdPhoto) formData.append('govIdPhoto', govIdPhoto);
      if (visitorPhoto) formData.append('visitorPhoto', visitorPhoto);

      const res = await createSecurityPass(formData);
      if (res && res.success) {
        setSuccess('Security Pass submitted. Approval emails have been sent to the selected approver(s).');
        setTimeout(() => navigate('/security-pass'), 1500);
      }
    } catch (err: any) {
      const serverMessage = err.response?.data?.message;
      const validationErrors = err.response?.data?.errors;
      if (validationErrors && Array.isArray(validationErrors)) {
        const details = validationErrors.map((e: any) => `${e.field}: ${e.message}`).join(', ');
        setError(`Validation Failed: ${details}`);
      } else {
        setError(serverMessage || err.message || 'Failed to create security pass');
      }
    } finally {
      setLoading(false);
    }
  };

  const gateOptions = ['Main Gate', 'Hostel Gate', 'Academic Block Gate', 'Research Park Gate'];

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header-standard" style={{ marginBottom: '0.5rem' }}>
        <div>
          <h2 className="page-title-main">Create Security Pass</h2>
          <p className="page-subtitle-main">Register a walk-in or unknown visitor and route the request for security approval.</p>
        </div>
      </div>

      {error && (
        <div style={{ color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)', padding: '0.85rem 1rem', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 600 }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ color: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.15)', padding: '0.85rem 1rem', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 600 }}>
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="card-standard">
          <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1rem', fontWeight: 700, color: 'var(--text-h)', textTransform: 'uppercase', letterSpacing: '0.02em', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>1. Visitor Details</h3>

          <div className="grid-2-col" style={{ gap: '1.25rem', marginBottom: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label-standard">Visitor Name</label>
              <input type="text" value={visitorName} onChange={(e) => setVisitorName(e.target.value)} className="form-input-standard" required />
            </div>
            <div className="form-group">
              <label className="form-label-standard">Phone Number</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="form-input-standard" placeholder="10-digit mobile number" required />
            </div>
          </div>

          <div className="grid-2-col" style={{ gap: '1.25rem', marginBottom: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label-standard">Email (Optional)</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="form-input-standard" placeholder="visitor@domain.com" />
            </div>
            <div className="form-group">
              <label className="form-label-standard">Government ID Type</label>
              <select value={govIdType} onChange={(e) => setGovIdType(e.target.value)} className="form-input-standard" style={{ cursor: 'pointer' }}>
                <option value="AADHAAR">Aadhaar Card</option>
                <option value="PAN_CARD">PAN Card</option>
                <option value="DRIVING_LICENSE">Driving License</option>
                <option value="VOTER_ID">Voter ID</option>
                <option value="PASSPORT">Passport</option>
                <option value="OTHER">Other Official ID</option>
              </select>
            </div>
          </div>

          <div className="grid-2-col" style={{ gap: '1.25rem', marginBottom: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label-standard">Government ID Number</label>
              <input type="text" value={govIdNumber} onChange={(e) => setGovIdNumber(e.target.value)} className="form-input-standard" required />
            </div>
            <div className="form-group">
              <label className="form-label-standard">Entry Gate</label>
              <select value={entryGate} onChange={(e) => setEntryGate(e.target.value)} className="form-input-standard" style={{ cursor: 'pointer' }}>
                {gateOptions.map(gate => (
                  <option key={gate} value={gate}>{gate}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid-2-col" style={{ gap: '1.25rem', marginBottom: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label-standard">Government ID Upload</label>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setGovIdPhoto(e.target.files?.[0] || null)}
                className="form-input-standard"
                style={{ borderStyle: 'dashed', borderWidth: '2px', padding: '1rem', backgroundColor: 'var(--bg-base)' }}
              />
            </div>
            <div className="form-group">
              <label className="form-label-standard">Visitor Photo</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setVisitorPhoto(e.target.files?.[0] || null)}
                className="form-input-standard"
                style={{ borderStyle: 'dashed', borderWidth: '2px', padding: '1rem', backgroundColor: 'var(--bg-base)' }}
              />
            </div>
          </div>

          <div className="grid-2-col" style={{ gap: '1.25rem', marginBottom: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label-standard">Whom to Visit</label>
              <input type="text" value={whomToVisit} onChange={(e) => setWhomToVisit(e.target.value)} className="form-input-standard" placeholder="Name/department of the person being visited" required />
            </div>
            <div className="form-group">
              <label className="form-label-standard">Expected Visit Duration</label>
              <input type="text" value={expectedDuration} onChange={(e) => setExpectedDuration(e.target.value)} className="form-input-standard" placeholder="E.g. 30 minutes, 2 hours" required />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label-standard">Purpose of Visit</label>
            <textarea
              rows={3}
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Reason for visit (e.g. delivery, vendor meeting, maintenance)"
              required
              className="form-input-standard"
              style={{ fontFamily: 'inherit', resize: 'vertical' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label-standard">Remarks (Optional)</label>
            <input type="text" value={remarks} onChange={(e) => setRemarks(e.target.value)} className="form-input-standard" placeholder="Additional notes" />
          </div>
        </div>

        <div className="card-standard">
          <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1rem', fontWeight: 700, color: 'var(--text-h)', textTransform: 'uppercase', letterSpacing: '0.02em', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>2. Send Approval To</h3>

          {availableApprovers.length > 0 && (
            <>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: '0.75rem', fontSize: '0.875rem', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={selectedApprovers.length === availableApprovers.length}
                  onChange={toggleSelectAll}
                />
                Select All
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
                {availableApprovers.map(approverEmail => (
                  <label key={approverEmail} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', backgroundColor: 'var(--bg-base)', padding: '0.45rem 0.85rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.8125rem', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={selectedApprovers.includes(approverEmail)}
                      onChange={() => toggleApprover(approverEmail)}
                    />
                    <span>{approverEmail}</span>
                  </label>
                ))}
              </div>
            </>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label className="form-label-standard" style={{ fontSize: '0.8125rem', margin: 0 }}>Add Custom Approver Email</label>
            <div style={{ display: 'flex', gap: '0.5rem', maxWidth: '500px' }}>
              <input
                type="email"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                placeholder="Enter custom email address..."
                className="form-input-standard"
                style={{ flex: 1, fontSize: '0.8125rem' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomEmail();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAddCustomEmail}
                className="btn btn-secondary"
                style={{ padding: '0.45rem 1.25rem', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}
              >
                Add
              </button>
            </div>
            {customEmailError && (
              <p style={{ color: '#ef4444', fontSize: '0.75rem', margin: '2px 0 0 0', fontWeight: 500 }}>
                {customEmailError}
              </p>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
          <button type="button" onClick={() => navigate('/security-pass')} className="btn btn-secondary" style={{ padding: '0.65rem 1.75rem' }}>
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn btn-primary" style={{ padding: '0.65rem 1.75rem' }}>
            {loading ? 'Submitting...' : 'Submit for Approval'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateSecurityPassPage;
