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
    formData.append('validFrom', validFrom);
    formData.append('validTo', validTo);
    formData.append('purpose', purpose);
    formData.append('notes', notes);
    formData.append('createdByName', createdByName);
    formData.append('creatorDept', creatorDept);
    formData.append('comingFrom', comingFrom);
    formData.append('isMultiEntry', String(isMultiEntry));
    allowedGates.forEach(gate => formData.append('allowedGates', gate));

    // Visitor Details
    let formattedPhone = visitorPhone.trim();
    if (!formattedPhone.startsWith('+')) {
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
      let formattedDriverPhone = (driverPhone || visitorPhone).trim();
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

    try {
      const res = await createPass(formData);
      if (res && res.success) {
        navigate(`/passes/${res.data.id}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create gate pass request');
    } finally {
      setLoading(false);
    }
  };

  const gateOptions = ['Main Gate', 'Hostel Gate', 'Academic Block Gate', 'Research Park Gate'];

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Request Access Pass</h2>
        <p style={{ margin: '0.25rem 0 0 0', color: '#94a3b8', fontSize: '0.875rem' }}>
          Create a digital entry credential. Ensure all details match the visitor's government-issued ID.
        </p>
      </div>

      {error && (
        <div className="alert-message error" style={{ marginBottom: '1.5rem' }}>
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* Pass Configuration */}
        <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '2rem' }}>
          <h3 style={{ margin: '0 0 1.5rem 0' }}>1. Pass Configuration</h3>
          
          <div className="grid-2-col" style={{ gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div className="form-group">
              <label>Pass Type</label>
              <select value={passType} onChange={(e) => setPassType(e.target.value)} className="form-select">
                <option value="VISITOR">Standard Visitor Pass</option>
                <option value="HOSTEL_GUEST">Hostel Overnight Guest</option>
                <option value="VEHICLE">Vehicle Entry Pass</option>
                <option value="EVENT">Event Invitation Pass</option>
                <option value="CONTRACTOR">Contractor Pass</option>
                <option value="PARENT">Parent/Guardian Pass</option>
              </select>
            </div>

            <div className="form-group" style={{ justifyContent: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: '100%', cursor: 'pointer', marginTop: '1.5rem' }}>
                <input 
                  type="checkbox" 
                  checked={isMultiEntry} 
                  onChange={(e) => setIsMultiEntry(e.target.checked)} 
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Allow Multi-Entry (Sliding window)</span>
              </label>
            </div>
          </div>

          <div className="grid-2-col" style={{ gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div className="form-group">
              <label>Valid From</label>
              <input type="datetime-local" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Valid To</label>
              <input type="datetime-local" value={validTo} onChange={(e) => setValidTo(e.target.value)} required />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label>Allowed Gates</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '0.25rem' }}>
              {gateOptions.map(gate => (
                <label key={gate} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', backgroundColor: '#ffffff', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <input 
                    type="checkbox" 
                    checked={allowedGates.includes(gate)} 
                    onChange={() => handleGateChange(gate)} 
                  />
                  <span style={{ fontSize: '0.875rem' }}>{gate}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid-2-col" style={{ gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div className="form-group">
              <label>Pass Created by</label>
              <input type="text" value={createdByName} onChange={(e) => setCreatedByName(e.target.value)} placeholder="Full name of pass creator" required />
            </div>
            <div className="form-group">
              <label>Pass creator Dept/Section</label>
              <input type="text" value={creatorDept} onChange={(e) => setCreatorDept(e.target.value)} placeholder="E.g., CSE Dept, Registrar Office" required />
            </div>
          </div>

          <div className="form-group">
            <label>Purpose of Visit</label>
            <textarea 
              rows={3} 
              value={purpose} 
              onChange={(e) => setPurpose(e.target.value)} 
              placeholder="E.g., Research discussion, hostel guest, project review..."
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

          <div className="form-group" style={{ marginTop: '1.25rem' }}>
            <label>Additional Notes (Optional)</label>
            <input 
              type="text" 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
              placeholder="E.g., Carrying laptop, visitor parking needed..." 
            />
          </div>
        </div>

        {/* Visitor Details */}
        <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '2rem' }}>
          <h3 style={{ margin: '0 0 1.5rem 0' }}>2. Visitor Information</h3>

          <div className="grid-2-col" style={{ gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div className="form-group">
              <label>Full Name</label>
              <input type="text" value={visitorName} onChange={(e) => setVisitorName(e.target.value)} placeholder="Visitor name" required />
            </div>
            <div className="form-group">
              <label>Mobile Number</label>
              <input type="tel" value={visitorPhone} onChange={(e) => setVisitorPhone(e.target.value)} placeholder="10-digit number" required />
            </div>
          </div>

          <div className="grid-2-col" style={{ gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div className="form-group">
              <label>Email Address (Optional)</label>
              <input type="email" value={visitorEmail} onChange={(e) => setVisitorEmail(e.target.value)} placeholder="visitor@email.com" />
            </div>
            <div className="form-group">
              <label>Visitor Category</label>
              <select value={visitorCategory} onChange={(e) => setVisitorCategory(e.target.value)} className="form-select">
                <option value="GENERAL">Regular Visitor</option>
                <option value="VIP">VIP (Auto-approves pass)</option>
                <option value="CONTRACTOR">Contractor</option>
              </select>
            </div>
          </div>

          <div className="grid-2-col" style={{ gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div className="form-group">
              <label>Coming From (Organization / City / Place)</label>
              <input type="text" value={comingFrom} onChange={(e) => setComingFrom(e.target.value)} placeholder="E.g. IIT Delhi, Mumbai, Google" required />
            </div>
          </div>

          <div className="grid-2-col" style={{ gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div className="form-group">
              <label>ID Document Type</label>
              <select value={visitorIdType} onChange={(e) => setVisitorIdType(e.target.value)} className="form-select">
                <option value="AADHAAR">Aadhaar Card</option>
                <option value="PAN_CARD">PAN Card</option>
                <option value="DRIVING_LICENSE">Driving License</option>
                <option value="PASSPORT">Passport</option>
                <option value="OTHER">Student ID Card / Other</option>
              </select>
            </div>
            <div className="form-group">
              <label>ID Document Number</label>
              <input type="text" value={visitorIdNumber} onChange={(e) => setVisitorIdNumber(e.target.value)} placeholder="Enter unique ID number" required />
            </div>
          </div>

          <div className="form-group">
            <label>Upload ID Photo / Selfie</label>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleFileChange} 
              style={{
                backgroundColor: '#ffffff',
                border: '1px dashed var(--border-color)',
                padding: '1rem',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            />
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
              Upload a clear photo of the visitor's face or ID document (Max 5MB, JPEG/PNG).
            </span>
          </div>
        </div>

        {/* Conditional Vehicle Form */}
        {passType === 'VEHICLE' && (
          <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '2rem' }}>
            <h3 style={{ margin: '0 0 1.5rem 0', color: '#3b82f6' }}>3. Vehicle Specifications</h3>
            
            <div className="grid-2-col" style={{ gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div className="form-group">
                <label>Number Plate</label>
                <input type="text" value={numberPlate} onChange={(e) => setNumberPlate(e.target.value)} placeholder="E.g., KA-01-MX-1234" required />
              </div>
              <div className="form-group">
                <label>Vehicle Type</label>
                <select value={vehicleType} onChange={(e) => setVehicleType(e.target.value)} className="form-select">
                  <option value="TWO_WHEELER">Two Wheeler</option>
                  <option value="FOUR_WHEELER">Four Wheeler</option>
                  <option value="TRUCK">Truck / Commercial</option>
                  <option value="BUS">Bus</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>

            <div className="grid-3-col" style={{ gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div className="form-group">
                <label>Make</label>
                <input type="text" value={make} onChange={(e) => setMake(e.target.value)} placeholder="E.g., Honda" />
              </div>
              <div className="form-group">
                <label>Model</label>
                <input type="text" value={model} onChange={(e) => setModel(e.target.value)} placeholder="E.g., Activa / City" />
              </div>
              <div className="form-group">
                <label>Color</label>
                <input type="text" value={color} onChange={(e) => setColor(e.target.value)} placeholder="Black" />
              </div>
            </div>

            <div className="grid-2-col" style={{ gap: '1.5rem' }}>
              <div className="form-group">
                <label>Driver Name (If not visitor)</label>
                <input type="text" value={driverName} onChange={(e) => setDriverName(e.target.value)} placeholder="Driver's name" />
              </div>
              <div className="form-group">
                <label>Driver Phone</label>
                <input type="tel" value={driverPhone} onChange={(e) => setDriverPhone(e.target.value)} placeholder="Driver's number" />
              </div>
            </div>
          </div>
        )}

        {/* Conditional Hostel Form */}
        {passType === 'HOSTEL_GUEST' && (
          <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '2rem' }}>
            <h3 style={{ margin: '0 0 1.5rem 0', color: '#c084fc' }}>3. Hostel Verification</h3>
            
            <div className="grid-3-col" style={{ gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div className="form-group">
                <label>Hostel Block</label>
                <input type="text" value={hostelBlock} onChange={(e) => setHostelBlock(e.target.value)} placeholder="E.g., Block B" required />
              </div>
              <div className="form-group">
                <label>Room Number</label>
                <input type="text" value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} placeholder="Room number" required />
              </div>
              <div className="form-group">
                <label>Nights of Stay</label>
                <input type="number" min="1" value={plannedNights} onChange={(e) => setPlannedNights(e.target.value)} required />
              </div>
            </div>

            <div className="form-group">
              <label>Assigned Warden for Approval</label>
              <select value={wardenId} onChange={(e) => setWardenId(e.target.value)} className="form-select">
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
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button type="button" onClick={() => navigate('/passes')} className="btn btn-secondary" style={{ padding: '0.75rem 2rem' }}>
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn btn-primary" style={{ padding: '0.75rem 2rem' }}>
            {loading ? 'Submitting Request...' : 'Submit Pass Request'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreatePassPage;
