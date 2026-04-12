'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthContext'
import { getPatientByIC } from '@/lib/firebase'

// All Malaysian public hospitals from bedutil_facility.csv, grouped by state.
// Names match exactly so the routing API can look them up in the RAG dataset.
const MALAYSIA_HOSPITALS = [
  { state: 'Johor', hospitals: ['Hospital Sultan Ismail Johor Bahru', 'Hospital Sultanah Aminah', 'Hospital Pakar Sultanah Fatimah', 'Hospital Enche\' Besar Hajjah Khalsom', 'Hospital Mersing', 'Hospital Pontian', 'Hospital Segamat'] },
  { state: 'Kedah', hospitals: ['Hospital Sultanah Bahiyah', 'Hospital Sultan Abdul Halim', 'Hospital Kulim', 'Hospital Jitra', 'Hospital Sultanah Maliha', 'Hospital Kuala Nerang', 'Hospital Sik', 'Hospital Yan', 'Hospital Pendang'] },
  { state: 'Kelantan', hospitals: ['Hospital Raja Perempuan Zainab II', 'Hospital Pasir Mas', 'Hospital Tanah Merah', 'Hospital Tumpat', 'Hospital Tengku Anis', 'Hospital Gua Musang', 'Hospital Jeli', 'Hospital Universiti Sains Malaysia'] },
  { state: 'Melaka', hospitals: ['Hospital Melaka', 'Hospital Alor Gajah', 'Hospital Jasin'] },
  { state: 'Negeri Sembilan', hospitals: ['Hospital Tuanku Ja\'afar', 'Hospital Tuanku Ampuan Najihah', 'Hospital Rembau', 'Hospital Tampin'] },
  { state: 'Pahang', hospitals: ['Hospital Tengku Ampuan Afzan', 'Hospital Pekan', 'Hospital Kuala Lipis', 'Hospital Jerantut', 'Hospital Muadzam Shah', 'Hospital Jengka', 'Hospital Bera', 'Hospital Sultanah Hajjah Kalsom'] },
  { state: 'Perak', hospitals: ['Hospital  Raja Permaisuri Bainun', 'Hospital Taiping', 'Hospital Teluk Intan', 'Hospital Seri Manjung', 'Hospital Slim River', 'Hospital Batu Gajah', 'Hospital Kuala Kangsar', 'Hospital Gerik', 'Hospital Kampar', 'Hospital Changkat Melintang', 'Hospital Selama', 'Hospital Sungai Siput', 'Hospital Parit Buntar'] },
  { state: 'Perlis', hospitals: ['Hospital Tuanku Fauziah'] },
  { state: 'Pulau Pinang', hospitals: ['Hospital Pulau Pinang', 'Hospital Bukit Mertajam', 'Hospital Sungai Bakap'] },
  { state: 'Sabah', hospitals: ['Hospital Queen Elizabeth', 'Hospital Queen Elizabeth II', 'Hospital Keningau', 'Hospital Kota Marudu', 'Hospital Semporna', 'Hospital Sipitang', 'Hospital Tambunan', 'Hospital Tuaran', 'Hospital Kunak', 'Hospital Papar', 'Hospital Wanita Dan Kanak-Kanak', 'Hospital Kuala Penyu'] },
  { state: 'Sarawak', hospitals: ['Hospital Umum Sarawak', 'Hospital Miri', 'Hospital Sibu', 'Hospital Bintulu', 'Hospital Kapit', 'Hospital Limbang', 'Hospital Lawas', 'Hospital Sri Aman', 'Hospital Saratok', 'Hospital Sarikei', 'Hospital Serian', 'Hospital Lundu', 'Hospital Dalat', 'Hospital Daro', 'Hospital Betong', 'Hospital Simunjan', 'Hospital Marudi', 'Hospital Sentosa', 'Pusat Jantung Sarawak'] },
  { state: 'Selangor', hospitals: ['Hospital Sungai Buloh', 'Hospital Selayang', 'Hospital Ampang', 'Hospital Kajang', 'Hospital Shah Alam', 'Pusat Kawalan Kusta Negara'] },
  { state: 'Terengganu', hospitals: ['Hospital Sultanah Nur Zahirah', 'Hospital Kemaman', 'Hospital Dungun', 'Hospital Hulu Terengganu', 'Hospital Setiu'] },
  { state: 'W.P. Kuala Lumpur', hospitals: ['Hospital Kuala Lumpur', 'Hospital Tunku Azizah', 'Institut Perubatan Respiratori'] },
  { state: 'W.P. Labuan', hospitals: ['Hospital Labuan'] },
  { state: 'W.P. Putrajaya', hospitals: ['Hospital Putrajaya', 'Institut Kanser Negara'] },
];

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
      // 0. Check for existing patient to prevent duplicates
      const existing = await getPatientByIC(formData.icNumber);
      if (existing) {
        setExistingPatientId(existing.id);
      } else {
        setExistingPatientId(null);
      }

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
      // Clinical Fallback for demo stability
      setResult({
        urgencyLevel: 'Standard',
        requiredSpecialty: 'General',
        destination: 'Normal Ward',
        explanation: 'Clinical AI system temporary fallback. Please proceed with manual oversight.'
      });
      setRoutingResult({ isRoutingNeeded: false, recommendedHospital: formData.hospitalPref });
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
        setAdmitSuccess({ ...data, ward: result.destination, hospital: formData.hospitalPref });
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

  // 2. Main Form Form UI (Admission Success mapped to Modal below)
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
                {MALAYSIA_HOSPITALS.map(({ state, hospitals }) => (
                  <optgroup key={state} label={state}>
                    {hospitals.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ flex: 1, padding: '1rem', fontSize: '1.1rem', fontWeight: 'bold' }}
              disabled={loading}
            >
              {loading ? 'Analyzing...' : '1. Clinical Analysis'}
            </button>
            <button
              type="button"
              onClick={handleRegister}
              className="btn"
              style={{
                flex: 1,
                padding: '1rem',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                background: result ? '#f1f5f9' : '#f1f5f9',
                color: result ? 'black' : '#b6bcc9',
                border: result ? 'none' : '1px solid var(--border)',
                cursor: result ? 'pointer' : 'not-allowed'
              }}
              disabled={!result || admitLoading}
            >
              {admitLoading ? 'Processing...' : '2. Register'}
            </button>
          </div>
        </form>
      </section>

      {/* Post Analysis Area */}
      {result && (
        <div style={{ marginTop: '2rem' }}>
          <div className="card" style={{ borderLeft: `8px solid var(--${result.urgencyLevel?.toLowerCase() === 'standard' ? 'low' : result.urgencyLevel?.toLowerCase()})`, marginBottom: '1.5rem', background: '#f8fafc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
              <h2 className="title" style={{ margin: 0, fontSize: '1.3rem' }}>Analysis: {result.urgencyLevel} Priority</h2>
              <span className={`badge badge-${result.urgencyLevel?.toLowerCase()}`}>{result.urgencyLevel}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
              <div>
                <h3 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Triage & Specialty</h3>
                <p style={{ fontWeight: '500', marginTop: '0.2rem' }}>{result.requiredSpecialty} Unit ({result.destination})</p>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-dark)' }}>{result.explanation}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Post Registration Modal/Popup */}
      {admitSuccess && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="card" style={{ width: '90%', maxWidth: '500px', background: 'white', textAlign: 'center', borderLeft: (routingResult?.isRoutingNeeded) ? '8px solid var(--warning)' : '8px solid var(--success)' }}>

            {(routingResult?.isRoutingNeeded) ? (
              <>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🚑</div>
                <h2 style={{ color: '#92400e', marginBottom: '0.5rem' }}>Hospital Diversion Required</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Patient details recorded. Please follow rerouting instruction below.</p>
                <div style={{ background: '#fef3c7', padding: '1.5rem', borderRadius: '12px', border: '1px solid #fde68a', color: '#92400e' }}>
                  <p style={{ fontWeight: 'bold', fontSize: '1.1rem', margin: '0 0 0.5rem 0' }}>Routed Away from {admitSuccess.hospital}</p>
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>{routingResult.reason}</p>
                  <p style={{ marginTop: '0.75rem', fontSize: '1.05rem' }}>Please safely proceed to: <strong>{routingResult.recommendedHospital}</strong></p>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
                <h2 style={{ color: '#166534', marginBottom: '0.5rem' }}>Patient Registered</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Patient details securely recorded at {admitSuccess.hospital}.</p>
                <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Consultation Number</div>
                  <div style={{ fontSize: '3rem', fontWeight: '800', color: 'var(--primary)', letterSpacing: '2px', marginBottom: '1rem' }}>{admitSuccess.consultationNumber}</div>
                  <p style={{ margin: 0, fontSize: '1.1rem' }}>Please wait at: <strong>{admitSuccess.ward === 'Emergency' || admitSuccess.ward === 'ICU' ? 'Emergency Department' : 'Normal Consultation Area'}</strong></p>
                </div>
              </>
            )}

            <button
              onClick={() => {
                setResult(null);
                setAdmitSuccess(null);
                setRoutingResult(null);
                setFlowState('initial');
                setFormData({ name: '', icNumber: '', age: '', symptoms: '', heartRate: '', temp: '', hospitalPref: 'Hospital Sultan Ismail Johor Bahru' })
              }}
              className="btn btn-primary"
              style={{ padding: '0.75rem 2rem', marginTop: '2rem' }}
            >
              Ok. Next patient
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
