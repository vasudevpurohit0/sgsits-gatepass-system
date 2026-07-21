import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPass } from '../../services/pass.service';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';

export const CreatePassPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields State
  const [passType, setPassType] = useState('VISITOR');
  const [validFrom, setValidFrom] = useState('');
  const [validTo, setValidTo] = useState('');
  const [purpose, setPurpose] = useState('');
  const [notes, setNotes] = useState('');
  const [allowedGates, setAllowedGates] = useState<string[]>(['Main Gate']);
  const [isMultiEntry, setIsMultiEntry] = useState(false);

  // New Fields
  const [createdByName, setCreatedByName] = useState(user ? `${user.firstName} ${user.lastName}` : '');
  const [creatorDept, setCreatorDept] = useState('');
  const [comingFrom, setComingFrom] = useState('');

  // Update createdByName if user loads dynamically
  React.useEffect(() => {
    if (user && !createdByName) {
      setCreatedByName(`${user.firstName} ${user.lastName}`);
    }
  }, [user]);

  // Visitor Fields
  const [visitorName, setVisitorName] = useState('');
  const [visitorEmail, setVisitorEmail] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [visitorCategory, setVisitorCategory] = useState('GENERAL');
  const [visitorIdType, setVisitorIdType] = useState('AADHAAR');
  const [visitorIdNumber, setVisitorIdNumber] = useState('');
  const [idPhoto, setIdPhoto] = useState<File | null>(null);

  // Vehicle Fields
  const [numberPlate, setNumberPlate] = useState('');
  const [vehicleType, setVehicleType] = useState('TWO_WHEELER');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');

  // Hostel Fields
  const [hostelBlock, setHostelBlock] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [plannedNights, setPlannedNights] = useState('1');
  const [wardenId, setWardenId] = useState('');

  // List of wardens (will load wardens if we have an API, or use a default seed/list)
  const [wardens, setWardens] = useState<any[]>([
    { id: 'warden-1', name: 'Warden Ramesh Kumar' },
    { id: 'warden-2', name: 'Warden Sunita Sharma' },
  ]);

  // Load wardens on mount
  React.useEffect(() => {
    const fetchWardens = async () => {
      try {
        const res = await api.get('/user?role=HOSTEL_WARDEN'); // Fetch from correct user endpoint
        if (res && res.data && res.data.success) {
          setWardens(res.data.data || []);
          if (res.data.data && res.data.data.length > 0) {
            setWardenId(res.data.data[0].id);
          }
        }
      } catch (err) {
        console.log('Using default mock wardens list');
        setWardenId('warden-1');
      }
    };
    fetchWardens();
  }, []);

  const handleGateChange = (gate: string) => {
    if (allowedGates.includes(gate)) {
      setAllowedGates(allowedGates.filter(g => g !== gate));
    } else {
      setAllowedGates([...allowedGates, gate]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIdPhoto(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!validFrom || !validTo) {
        setError('Please specify pass validity period');
        setLoading(false);
        return;
      }

      if (allowedGates.length === 0) {
        setError('Please select at least one allowed gate');
        setLoading(false);
        return;
      }

      const formData = new FormData();
      formData.append('passType', passType);
      formData.append('validFrom', new Date(validFrom).toISOString());
      formData.append('validTo', new Date(validTo).toISOString());
      formData.append('purpose', purpose);
      formData.append('notes', notes);
      formData.append('createdByName', createdByName);
      formData.append('creatorDept', creatorDept);
      formData.append('comingFrom', comingFrom);
      formData.append('isMultiEntry', String(isMultiEntry));
      allowedGates.forEach(gate => formData.append('allowedGates', gate));

      // Visitor Details
      let formattedPhone = (visitorPhone || '').trim().replace(/[^\d+]/g, '');
      if (!formattedPhone.startsWith('+')) {
        formattedPhone = formattedPhone.replace(/^0+/, '');
        formattedPhone = `+91${formattedPhone}`;
      }

      formData.append('visitor[name]', visitorName);
      formData.append('visitor[phone]', formattedPhone);
      formData.append('visitor[category]', visitorCategory);
      formData.append('visitor[idType]', visitorIdType);
      formData.append('visitor[idNumber]', visitorIdNumber);
      if (visitorEmail) {
        formData.append('visitor[email]', visitorEmail);
      }

      // Attach File
      if (idPhoto) {
        formData.append('idPhoto', idPhoto);
      }

      // Vehicle Details
      if (passType === 'VEHICLE') {
        let formattedDriverPhone = (driverPhone || visitorPhone || '').trim();
        if (!formattedDriverPhone.startsWith('+')) {
          formattedDriverPhone = `+91${formattedDriverPhone}`;
        }
        formData.append('vehicleDetails[numberPlate]', numberPlate);
        formData.append('vehicleDetails[vehicleType]', vehicleType);
        formData.append('vehicleDetails[make]', make);
        formData.append('vehicleDetails[model]', model);
        formData.append('vehicleDetails[color]', color);
        formData.append('vehicleDetails[driverName]', driverName || visitorName);
        formData.append('vehicleDetails[driverPhone]', formattedDriverPhone);
      }

      // Hostel Details
      if (passType === 'HOSTEL_GUEST') {
        formData.append('hostelDetails[hostelBlock]', hostelBlock);
        formData.append('hostelDetails[roomNumber]', roomNumber);
        formData.append('hostelDetails[plannedNights]', plannedNights);
        formData.append('hostelDetails[wardenId]', wardenId);
      }

      const res = await createPass(formData);
      if (res && res.success) {
        navigate(`/passes/${res.data.id}`);
      }
    } catch (err: any) {
      const serverMessage = err.response?.data?.message;
      const validationErrors = err.response?.data?.errors;
      if (validationErrors && Array.isArray(validationErrors)) {
        const details = validationErrors.map((e: any) => `${e.field}: ${e.message}`).join(', ');
        setError(`Validation Failed: ${details}`);
      } else {
        setError(serverMessage || err.message || 'Failed to create gate pass request');
      }
    } finally {
      setLoading(false);
    }
  };

  const gateOptions = ['Main Gate', 'Hostel Gate', 'Academic Block Gate', 'Research Park Gate'];

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Page Header */}
      <div className="page-header-standard" style={{ marginBottom: '0.5rem' }}>
        <div>
          <h2 className="page-title-main">Request Security Access Pass</h2>
          <p className="page-subtitle-main">Create a digital entry credential. Verify details against official credentials.</p>
        </div>
      </div>

      {error && (
        <div style={{ color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)', padding: '0.85rem 1rem', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 600 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Pass Configuration */}
        <div className="card-standard">
          <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1rem', fontWeight: 700, color: 'var(--text-h)', textTransform: 'uppercase', letterSpacing: '0.02em', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>1. Pass Parameters</h3>
          
          <div className="grid-2-col" style={{ gap: '1.25rem', marginBottom: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label-standard">Access Type</label>
              <select value={passType} onChange={(e) => setPassType(e.target.value)} className="form-input-standard" style={{ cursor: 'pointer' }}>
                <option value="VISITOR">Standard Visitor Pass</option>
                <option value="HOSTEL_GUEST">Hostel Overnight Guest</option>
                <option value="VEHICLE">Vehicle Entry Pass</option>
                <option value="EVENT">Event Invitation Pass</option>
                <option value="CONTRACTOR">Contractor Pass</option>
                <option value="PARENT">Parent/Guardian Pass</option>
              </select>
            </div>

            <div className="form-group" style={{ display: 'flex', alignItems: 'center' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginTop: '1.25rem' }}>
                <input 
                  type="checkbox" 
                  checked={isMultiEntry} 
                  onChange={(e) => setIsMultiEntry(e.target.checked)} 
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>Enable Multi-Entry Credentials</span>
              </label>
            </div>
          </div>

          <div className="grid-2-col" style={{ gap: '1.25rem', marginBottom: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label-standard">Valid From</label>
              <input type="datetime-local" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} className="form-input-standard" required />
            </div>
            <div className="form-group">
              <label className="form-label-standard">Valid To</label>
              <input type="datetime-local" value={validTo} onChange={(e) => setValidTo(e.target.value)} className="form-input-standard" required />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label-standard">Authorized Entrance Gates</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.25rem' }}>
              {gateOptions.map(gate => (
                <label key={gate} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', backgroundColor: 'var(--bg-base)', padding: '0.45rem 0.85rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.8125rem', fontWeight: 600 }}>
                  <input 
                    type="checkbox" 
                    checked={allowedGates.includes(gate)} 
                    onChange={() => handleGateChange(gate)} 
                  />
                  <span>{gate}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid-2-col" style={{ gap: '1.25rem', marginBottom: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label-standard">Clearance Request Sponsor (Name)</label>
              <input type="text" value={createdByName} onChange={(e) => setCreatedByName(e.target.value)} className="form-input-standard" placeholder="Sponsoring officer or student" required />
            </div>
            <div className="form-group">
              <label className="form-label-standard">Sponsor Department / Section</label>
              <input type="text" value={creatorDept} onChange={(e) => setCreatorDept(e.target.value)} className="form-input-standard" placeholder="E.g., CSE Dept, Registrar Office" required />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label-standard">Purpose of Visit</label>
            <textarea 
              rows={3} 
              value={purpose} 
              onChange={(e) => setPurpose(e.target.value)} 
              placeholder="Provide clean justification (e.g., academic consultation, lab inspection...)"
              required
              className="form-input-standard"
              style={{ fontFamily: 'inherit', resize: 'vertical' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label-standard">Remarks / Additional Info (Optional)</label>
            <input 
              type="text" 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
              className="form-input-standard"
              placeholder="E.g., Carrying laboratory samples, special access permissions..." 
            />
          </div>
        </div>

        {/* Visitor Details */}
        <div className="card-standard">
          <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1rem', fontWeight: 700, color: 'var(--text-h)', textTransform: 'uppercase', letterSpacing: '0.02em', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>2. Visitor Specifications</h3>

          <div className="grid-2-col" style={{ gap: '1.25rem', marginBottom: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label-standard">Visitor Name</label>
              <input type="text" value={visitorName} onChange={(e) => setVisitorName(e.target.value)} className="form-input-standard" placeholder="Enter full name" required />
            </div>
            <div className="form-group">
              <label className="form-label-standard">Contact Phone</label>
              <input type="tel" value={visitorPhone} onChange={(e) => setVisitorPhone(e.target.value)} className="form-input-standard" placeholder="10-digit mobile number" required />
            </div>
          </div>

          <div className="grid-2-col" style={{ gap: '1.25rem', marginBottom: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label-standard">Email Address (Optional)</label>
              <input type="email" value={visitorEmail} onChange={(e) => setVisitorEmail(e.target.value)} className="form-input-standard" placeholder="visitor@domain.com" />
            </div>
            <div className="form-group">
              <label className="form-label-standard">Visitor Designation Category</label>
              <select value={visitorCategory} onChange={(e) => setVisitorCategory(e.target.value)} className="form-input-standard" style={{ cursor: 'pointer' }}>
                <option value="GENERAL">General Visitor</option>
                <option value="VIP">VIP (Auto-authorized pass)</option>
                <option value="CONTRACTOR">Maintenance Contractor</option>
              </select>
            </div>
          </div>

          <div className="grid-2-col" style={{ gap: '1.25rem', marginBottom: '1.25rem' }}>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label-standard">Origin Institution / Organization / City</label>
              <input type="text" value={comingFrom} onChange={(e) => setComingFrom(e.target.value)} className="form-input-standard" placeholder="E.g. IIT Indore, Delhi, TCS" required />
            </div>
          </div>

          <div className="grid-2-col" style={{ gap: '1.25rem', marginBottom: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label-standard">ID Document Type</label>
              <select value={visitorIdType} onChange={(e) => setVisitorIdType(e.target.value)} className="form-input-standard" style={{ cursor: 'pointer' }}>
                <option value="AADHAAR">Aadhaar Card</option>
                <option value="PAN_CARD">PAN Card</option>
                <option value="DRIVING_LICENSE">Driving License</option>
                <option value="PASSPORT">Passport</option>
                <option value="OTHER">Other Official ID</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label-standard">ID Number</label>
              <input type="text" value={visitorIdNumber} onChange={(e) => setVisitorIdNumber(e.target.value)} className="form-input-standard" placeholder="Enter ID document reference number" required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label-standard">Identity Validation Attachment (Selfie / ID Image)</label>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleFileChange} 
              className="form-input-standard"
              style={{
                borderStyle: 'dashed',
                borderWidth: '2px',
                padding: '1.5rem',
                textAlign: 'center',
                backgroundColor: 'var(--bg-base)'
              }}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.35rem' }}>
              Attach a digital copy of the visitor selfie or identification card (JPEG/PNG format, Max 5MB).
            </span>
          </div>
        </div>

        {/* Conditional Vehicle Form */}
        {passType === 'VEHICLE' && (
          <div className="card-standard" style={{ borderColor: 'rgba(59, 130, 246, 0.3)' }}>
            <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1rem', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.02em', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>3. Vehicle Specifications</h3>
            
            <div className="grid-2-col" style={{ gap: '1.25rem', marginBottom: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label-standard">Number Plate</label>
                <input type="text" value={numberPlate} onChange={(e) => setNumberPlate(e.target.value)} className="form-input-standard" placeholder="E.g., MP-09-AB-1234" required />
              </div>
              <div className="form-group">
                <label className="form-label-standard">Vehicle Classification</label>
                <select value={vehicleType} onChange={(e) => setVehicleType(e.target.value)} className="form-input-standard" style={{ cursor: 'pointer' }}>
                  <option value="TWO_WHEELER">Two Wheeler</option>
                  <option value="FOUR_WHEELER">Four Wheeler</option>
                  <option value="TRUCK">Heavy Utility / Truck</option>
                  <option value="BUS">Staff Bus</option>
                  <option value="OTHER">Other Classification</option>
                </select>
              </div>
            </div>

            <div className="grid-3-col" style={{ gap: '1.25rem', marginBottom: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label-standard">Make</label>
                <input type="text" value={make} onChange={(e) => setMake(e.target.value)} className="form-input-standard" placeholder="E.g., Maruti Suzuki" />
              </div>
              <div className="form-group">
                <label className="form-label-standard">Model</label>
                <input type="text" value={model} onChange={(e) => setModel(e.target.value)} className="form-input-standard" placeholder="E.g., Swift" />
              </div>
              <div className="form-group">
                <label className="form-label-standard">Color</label>
                <input type="text" value={color} onChange={(e) => setColor(e.target.value)} className="form-input-standard" placeholder="E.g., White" />
              </div>
            </div>

            <div className="grid-2-col" style={{ gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label-standard">Driver Name (If different from Visitor)</label>
                <input type="text" value={driverName} onChange={(e) => setDriverName(e.target.value)} className="form-input-standard" placeholder="Driver full name" />
              </div>
              <div className="form-group">
                <label className="form-label-standard">Driver Contact Phone</label>
                <input type="tel" value={driverPhone} onChange={(e) => setDriverPhone(e.target.value)} className="form-input-standard" placeholder="Driver phone number" />
              </div>
            </div>
          </div>
        )}

        {/* Conditional Hostel Form */}
        {passType === 'HOSTEL_GUEST' && (
          <div className="card-standard" style={{ borderColor: 'rgba(192, 132, 252, 0.3)' }}>
            <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1rem', fontWeight: 700, color: '#c084fc', textTransform: 'uppercase', letterSpacing: '0.02em', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>3. Hostel Clearance</h3>
            
            <div className="grid-3-col" style={{ gap: '1.25rem', marginBottom: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label-standard">Hostel Block Designation</label>
                <input type="text" value={hostelBlock} onChange={(e) => setHostelBlock(e.target.value)} className="form-input-standard" placeholder="E.g., Hostel Block C" required />
              </div>
              <div className="form-group">
                <label className="form-label-standard">Room Number</label>
                <input type="text" value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} className="form-input-standard" placeholder="Room Number" required />
              </div>
              <div className="form-group">
                <label className="form-label-standard">Nights of Stay</label>
                <input type="number" min="1" value={plannedNights} onChange={(e) => setPlannedNights(e.target.value)} className="form-input-standard" required />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label-standard">Select Assigned Review Warden</label>
              <select value={wardenId} onChange={(e) => setWardenId(e.target.value)} className="form-input-standard" style={{ cursor: 'pointer' }}>
                {wardens.map(warden => (
                  <option key={warden.id} value={warden.id}>
                    {warden.firstName ? `${warden.firstName} ${warden.lastName}` : warden.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
          <button type="button" onClick={() => navigate('/passes')} className="btn btn-secondary" style={{ padding: '0.65rem 1.75rem' }}>
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn btn-primary" style={{ padding: '0.65rem 1.75rem' }}>
            {loading ? 'Registering...' : 'Register Clearance Request'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreatePassPage;
