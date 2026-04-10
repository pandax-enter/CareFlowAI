'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthContext'
import { getPatientByIC } from '@/lib/firebase'

export default function TriagePage() {
  const { roleData } = useAuth();
  
  // flowState: 'initial' | 'mydigitalid_processing' | 'form'
  const [flowState, setFlowState] = useState('initial');
  
  const [formData, setFormData] = useState({
    name: '',
    icNumber: '',
    age: '',
    symptoms: '',
    heartRate: '',
    temp: '',
    hospitalPref: 'Hospital Sultan Ismail Johor Bahru'
  })
  
  const [isVerified, setIsVerified] = useState(false);
  const [existingPatientId, setExistingPatientId] = useState(null);

  const [result, setResult] = useState(null)
  const [routingResult, setRoutingResult] = useState(null)
  
  const [loading, setLoading] = useState(false)
  const [admitLoading, setAdmitLoading] = useState(false)
  const [admitSuccess, setAdmitSuccess] = useState(null)

  const handleMyDigitalID = () => {
    setFlowState('mydigitalid_processing');
    
    // Simulate Identity Provider Delay
    setTimeout(async () => {
      const mockIdentity = {
        name: "Ahmad bin Daud",
        icNumber: "880512-14-5566",
        age: 36,
        address: "123 Jalan Ampang, Kuala Lumpur"
      };

      try {
        const existing = await getPatientByIC(mockIdentity.icNumber);
        if (existing) {
          setExistingPatientId(existing.id);
        }
        setFormData(prev => ({ ...prev, name: mockIdentity.name, icNumber: mockIdentity.icNumber, age: mockIdentity.age }));
        setIsVerified(true);
      } catch (err) {
        console.error("Identity lookup failed", err);
      }
      setFlowState('form');
    }, 1500);
  }

  const handleManualRegistration = () => {
    setIsVerified(false);
    setExistingPatientId(null);
    setFormData({ name: '', icNumber: '', age: '', symptoms: '', heartRate: '', temp: '', hospitalPref: 'Hospital Sultan Ismail Johor Bahru' });
    setFlowState('form');
  }

  const runAnalysis = async (e) => {
    if (e) e.preventDefault();
    if (!formData.name || !formData.age) return alert("Patient Name and Age are required.");

    setLoading(true);
    setResult(null);
    setRoutingResult(null);
    
    try {
      // 1. Run AI Triage
      const triageRes = await fetch('/api/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const triageData = await triageRes.json();
      setResult(triageData);

      // 2. Check Routing if clinical risk is present
      if (triageData.riskLevel !== 'Low') {
        const routeRes = await fetch('/api/routing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ triageRisk: triageData.riskLevel, requiredSpecialty: triageData.requiredSpecialty, currentHospital: formData.hospitalPref }),
        });
        const routeData = await routeRes.json();
        setRoutingResult(routeData);
      } else {
          setRoutingResult({ isRoutingNeeded: false, recommendedHospital: formData.hospitalPref, reason: "Patient is low risk." });
      }

    } catch (error) {
      console.error('Analysis error:', error);
      alert('Error connecting to clinical services.');
    } finally {
      setLoading(false);
    }
  }

  const handleRegister = async () => {
    if (!result) return;
    setAdmitLoading(true);
    try {
      const res = await fetch('/api/admit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          patientInfo: {
            name: formData.name,
            icNumber: formData.icNumber,
            isVerified: isVerified,
            age: formData.age,
            symptoms: formData.symptoms,
            vitals: { hr: formData.heartRate, temp: formData.temp, bp: '-' }
          },
          assessment: result,
          hospitalName: routingResult?.recommendedHospital || formData.hospitalPref,
          existingPatientId
        })
      });
      const data = await res.json();
      if (data.success) {
        setAdmitSuccess({ ...data, ward: result.destination, hospital: routingResult?.recommendedHospital || formData.hospitalPref });
      } else {
        alert(`Registration Failed: ${data.message || data.error}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error processing registration.");
    } finally {
      setAdmitLoading(false);
    }
  }

  // --- RENDERING VIEWS --- //

  // 1. Initial State
  if (flowState === 'initial' || flowState === 'mydigitalid_processing') {
    return (
      <div className="container" style={{ maxWidth: '600px', marginTop: '4rem' }}>
        <section className="card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <div style={{ marginBottom: '2rem' }}>
            <h1 className="title" style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>Patient Identity Registration</h1>
            <p style={{ color: 'var(--text-muted)' }}>Authenticate identity securely to proceed with a consultation.</p>
          </div>

          {flowState === 'mydigitalid_processing' ? (
            <div style={{ padding: '2rem' }}>
              <div style={{ fontSize: '2rem', animation: 'pulse 1.5s infinite', marginBottom: '1rem' }}>📱</div>
              <p style={{ fontWeight: '500', color: 'var(--primary)' }}>Authenticating via MyDigital ID...</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Retrieving verified identity packet</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <button 
                onClick={handleMyDigitalID}
                className="btn btn-primary"
                style={{ padding: '1rem', fontSize: '1.1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
              >
                <span>🛡️</span> Register with MyDigital ID
              </button>
              
              <div style={{ display: 'flex', alignItems: 'center', margin: '0.5rem 0' }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
                <span style={{ padding: '0 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>OR</span>
                <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
              </div>

              <button 
                onClick={handleManualRegistration}
                className="btn"
                style={{ background: '#f8fafc', border: '1px solid var(--border)', padding: '1rem', color: 'var(--text-dark)' }}
              >
                Continue without MyDigital ID
              </button>
            </div>
          )}
        </section>
      </div>
    );
  }

  // 2. Admission Success Screen
  if (admitSuccess) {
    const isRedirected = admitSuccess.hospital !== formData.hospitalPref;

    return (
      <div className="container" style={{ maxWidth: '700px', marginTop: '2rem' }}>
        <div className="card" style={{ borderLeft: '8px solid var(--success)', background: '#f0fdf4', textAlign: 'center', padding: '3rem 2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
            <h2 className="title" style={{ color: '#166534', fontSize: '1.8rem', marginBottom: '0.5rem' }}>Patient Successfully Registered</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', margin: '2rem 0' }}>
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', width: '100%', maxWidth: '400px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>Consultation Number</div>
                <div style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--primary)', letterSpacing: '2px' }}>{admitSuccess.consultationNumber}</div>
              </div>
            </div>

            {isRedirected ? (
              <div style={{ background: '#fef3c7', padding: '1.5rem', borderRadius: '8px', border: '1px solid #fde68a', color: '#92400e', marginBottom: '2rem' }}>
                <p style={{ fontWeight: 'bold', fontSize: '1.1rem', margin: '0 0 0.5rem 0' }}>Hospital Diversion Directed</p>
                <p style={{ margin: 0 }}>You have been redirected to the nearest available hospital: <strong>{admitSuccess.hospital}</strong></p>
              </div>
            ) : (
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', border: '1px solid #bbf7d0', color: '#166534', marginBottom: '2rem', textAlign: 'left' }}>
                <p style={{ margin: '0 0 0.5rem 0', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Assigned Care Pathway:</span> 
                  <strong>{admitSuccess.ward === 'Emergency' || admitSuccess.ward === 'ICU' ? 'Emergency Ward' : 'Normal Consultation Queue'}</strong>
                </p>
                <p style={{ margin: 0, display: 'flex', justifyContent: 'space-between' }}>
                  <span>Location Instruction:</span>
                  <strong>{admitSuccess.ward === 'Emergency' || admitSuccess.ward === 'ICU' ? 'Please proceed to Emergency Department immediately' : 'Please wait at the General Consultation Area'}</strong>
                </p>
              </div>
            )}

            <div>
                <button 
                  onClick={() => {
                    setResult(null); 
                    setAdmitSuccess(null); 
                    setFlowState('initial');
                    setFormData({name: '', icNumber: '', age: '', symptoms: '', heartRate: '', temp: '', hospitalPref: 'Hospital Sultan Ismail Johor Bahru'})
                  }} 
                  className="btn btn-primary"
                  style={{ padding: '0.75rem 2rem' }}
                >
                  Register Next Patient
                </button>
            </div>
        </div>
      </div>
    );
  }

  // 3. Form and Triage Analysis View
  const maskedIC = formData.icNumber ? formData.icNumber.replace(/^(\d{6})-(\d{2})-/, '******-**-') : '';

  return (
    <div className="container" style={{ maxWidth: '900px' }}>
      <section className="card">
        <header style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h1 className="title" style={{ margin: 0 }}>Patient Intake</h1>
              {isVerified && <span className="badge" style={{ background: '#dcfce7', color: '#166534' }}>✓ ID Verified</span>}
            </div>
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>Intelligent Triage & Routing System</p>
          </div>
          <button onClick={() => {
            setFlowState('initial');
            setIsVerified(false);
            setExistingPatientId(null);
            setResult(null);
            setRoutingResult(null);
            setFormData({ name: '', icNumber: '', age: '', symptoms: '', heartRate: '', temp: '', hospitalPref: 'Hospital Sultan Ismail Johor Bahru' });
          }} className="btn" style={{ fontSize: '0.8rem', background: '#f1f5f9' }}>Redo Registration</button>
        </header>

        {existingPatientId && (
          <div style={{ background: '#eff6ff', padding: '0.75rem 1rem', borderRadius: '6px', border: '1px solid #bfdbfe', color: '#1e40af', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            <strong>ℹ️ Returning Patient Recognized:</strong> Identity matched via IC Number. Medical history will be linked.
          </div>
        )}

        <form onSubmit={runAnalysis}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Full Name</label>
              <input
                type="text"
                className="btn"
                style={{ width: '100%', border: '1px solid var(--border)', background: isVerified ? '#f8fafc' : 'var(--white)', textAlign: 'left' }}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                readOnly={isVerified}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>IC Number</label>
              <input
                type="text"
                placeholder={isVerified ? "" : "e.g. 880512-14-5566"}
                className="btn"
                style={{ width: '100%', border: '1px solid var(--border)', background: isVerified ? '#f8fafc' : 'var(--white)', textAlign: 'left' }}
                value={isVerified ? maskedIC : formData.icNumber}
                onChange={(e) => {
                  if (!isVerified) setFormData({ ...formData, icNumber: e.target.value })
                }}
                readOnly={isVerified}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Age</label>
              <input
                type="number"
                className="btn"
                style={{ width: '100%', border: '1px solid var(--border)', background: isVerified ? '#f8fafc' : 'var(--white)', textAlign: 'left' }}
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                readOnly={isVerified}
                required
              />
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Clinical Presentation (Symptoms)</label>
            <textarea
              placeholder="Brief description of patient condition..."
              className="btn"
              style={{ width: '100%', minHeight: '80px', border: '1px solid var(--border)', background: 'var(--white)', textAlign: 'left', padding: '0.75rem' }}
              value={formData.symptoms}
              onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
              required
            ></textarea>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.85rem' }}>HR (BPM)</label>
              <input
                type="number"
                placeholder="72"
                className="btn"
                style={{ width: '100%', border: '1px solid var(--border)', background: 'var(--white)', textAlign: 'left' }}
                value={formData.heartRate}
                onChange={(e) => setFormData({ ...formData, heartRate: e.target.value })}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.85rem' }}>Temp (°C)</label>
              <input
                type="number"
                step="0.1"
                placeholder="36.6"
                className="btn"
                style={{ width: '100%', border: '1px solid var(--border)', background: 'var(--white)', textAlign: 'left' }}
                value={formData.temp}
                onChange={(e) => setFormData({ ...formData, temp: e.target.value })}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.85rem' }}>Hospital</label>
              <select
                className="btn"
                style={{ width: '100%', border: '1px solid var(--border)', background: 'var(--white)', textAlign: 'left' }}
                value={formData.hospitalPref}
                onChange={(e) => setFormData({ ...formData, hospitalPref: e.target.value })}
              >
                <option value="Hospital Sultan Ismail Johor Bahru">Johor Bahru (Sultan Ismail)</option>
                <option value="Hospital Kuala Lumpur">Kuala Lumpur (HKL)</option>
                <option value="Hospital Putrajaya">Putrajaya</option>
                <option value="Hospital Sungai Buloh">Sungai Buloh</option>
              </select>
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', fontWeight: 'bold' }}
            disabled={loading}
          >
            {loading ? 'Analyzing Clinical Priority...' : 'Registration Analysis'}
          </button>
        </form>
      </section>

      {/* Post Analysis Area */}
      {result && (
        <div style={{ marginTop: '2rem' }}>
          <div className="card" style={{ borderLeft: `8px solid var(--${result.urgencyLevel?.toLowerCase() === 'standard' ? 'low' : result.urgencyLevel?.toLowerCase()})`, marginBottom: '1.5rem' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 className="title" style={{ margin: 0 }}>Triage: {result.urgencyLevel} Priority</h2>
                <span className={`badge badge-${result.urgencyLevel?.toLowerCase()}`}>{result.urgencyLevel}</span>
             </div>
             <p><strong>Proposed Unit:</strong> {result.requiredSpecialty} ({result.destination})</p>
             <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{result.explanation}</p>
          </div>

          {routingResult && routingResult.isRoutingNeeded && (
            <div className={`card`} style={{ background: '#fffbeb', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
               <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Hospital Optimization Required</h3>
               <p style={{ margin: 0 }}><strong>Allocated to:</strong> {routingResult.recommendedHospital}</p>
               <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>{routingResult.reason}</p>
            </div>
          )}

          <button 
            onClick={handleRegister}
            className="btn btn-primary"
            style={{ width: '100%', padding: '1.25rem', fontSize: '1.2rem', background: 'var(--success)', border: 'none' }}
            disabled={admitLoading}
          >
            {admitLoading ? 'Processing Saving...' : 'Register'}
          </button>
        </div>
      )}
    </div>
  )
}
