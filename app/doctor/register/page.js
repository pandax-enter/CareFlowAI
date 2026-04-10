'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthContext'
import { savePatientRecord, assignNextAvailableNurse, getWards } from '@/lib/firebase'
import Link from 'next/link'

export default function DoctorRegistration() {
  const { roleData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    icNumber: '',
    age: '',
    symptoms: '',
    heartRate: '',
    temp: '',
    hospitalPref: 'Hospital Sultan Ismail Johor Bahru'
  })

  const runAnalysis = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error(err);
      alert("AI analysis failed.");
    } finally {
      setLoading(false);
    }
  }

  const handleRegister = async () => {
    if (!result || !roleData) return;
    setSubmitting(true);
    try {
      // Find nurse and ward
      const bestNurse = await assignNextAvailableNurse(result.requiredSpecialty);
      
      const patientData = {
        ...formData,
        age: parseInt(formData.age),
        heartRate: parseInt(formData.heartRate),
        temp: parseFloat(formData.temp),
        riskLevel: result.riskLevel,
        urgencyLevel: result.urgencyLevel,
        requiredSpecialty: result.requiredSpecialty,
        assignedWard: result.destination,
        assignedDoctorId: roleData.linkedId,
        assignedNurseId: bestNurse.id,
        status: 'Admitted',
        registrationTimestamp: new Date().toISOString()
      };

      const patientId = await savePatientRecord(patientData);
      setSuccess({ id: patientId, name: formData.name });
    } catch (err) {
      console.error(err);
      alert("Error saving record.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="container" style={{ maxWidth: '600px', marginTop: '4rem' }}>
        <div className="card" style={{ textAlign: 'center', borderTop: '8px solid var(--secondary)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
          <h1 className="title">Patient Registered</h1>
          <p><strong>{success.name}</strong> has been added to your consultation list.</p>
          <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <Link href="/doctor" className="btn btn-primary">Go to Dashboard</Link>
            <button onClick={() => { setSuccess(null); setFormData({name:'', icNumber:'', age:'', symptoms:'', heartRate:'', temp:'', hospitalPref:'Hospital Sultan Ismail Johor Bahru'}); setResult(null); }} className="btn">Register Another</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container" style={{ maxWidth: '800px' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 className="title">Doctor-Led Patient Intake</h1>
        <p style={{ color: 'var(--text-muted)' }}>Direct registration and AI-assisted priority assessment.</p>
      </header>

      <section className="card">
        <form onSubmit={runAnalysis}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
             <div>
               <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.4rem' }}>Patient Name</label>
               <input 
                className="btn" style={{ width:'100%', border:'1px solid var(--border)', background:'white', textAlign:'left' }}
                value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required
               />
             </div>
             <div>
               <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.4rem' }}>Age</label>
               <input 
                type="number" className="btn" style={{ width:'100%', border:'1px solid var(--border)', background:'white', textAlign:'left' }}
                value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} required
               />
             </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
             <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.4rem' }}>Symptoms / Primary Complaint</label>
             <textarea 
              className="btn" style={{ width:'100%', minHeight:'100px', border:'1px solid var(--border)', background:'white', textAlign:'left' }}
              value={formData.symptoms} onChange={e => setFormData({...formData, symptoms: e.target.value})} required
             />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
             <div>
               <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.4rem' }}>Heart Rate (BPM)</label>
               <input 
                type="number" className="btn" style={{ width:'100%', border:'1px solid var(--border)', background:'white', textAlign:'left' }}
                value={formData.heartRate} onChange={e => setFormData({...formData, heartRate: e.target.value})} required
               />
             </div>
             <div>
               <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.4rem' }}>Temp (°C)</label>
               <input 
                type="number" step="0.1" className="btn" style={{ width:'100%', border:'1px solid var(--border)', background:'white', textAlign:'left' }}
                value={formData.temp} onChange={e => setFormData({...formData, temp: e.target.value})} required
               />
             </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding:'1rem' }} disabled={loading}>
            {loading ? 'Analyzing Clinical State...' : 'Perform AI Assessment'}
          </button>
        </form>
      </section>

      {result && (
        <div className="card" style={{ marginTop: '2rem', borderLeft: `8px solid var(--${result.urgencyLevel?.toLowerCase() === 'standard' ? 'low' : result.urgencyLevel?.toLowerCase()})` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 className="title" style={{ margin: 0 }}>Clinical Triage: {result.urgencyLevel}</h2>
            <span className={`badge badge-${result.urgencyLevel?.toLowerCase()}`}>{result.urgencyLevel}</span>
          </div>
          <p><strong>Department:</strong> {result.requiredSpecialty} | <strong>Assigned Unit:</strong> {result.destination}</p>
          <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>{result.explanation}</p>
          
          <button 
            onClick={handleRegister} 
            className="btn" 
            style={{ width: '100%', marginTop: '2rem', background: 'var(--secondary)', color: 'white', padding: '1rem' }}
            disabled={submitting}
          >
            {submitting ? 'Adding to Clinic Queue...' : 'Add to My Patient Schedule'}
          </button>
        </div>
      )}
    </div>
  )
}
