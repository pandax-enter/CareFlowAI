'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthContext'
import { subscribeToDoctorPatients, subscribeToAllPatients, updatePatientRecord } from '@/lib/firebase'
import Link from 'next/link'

export default function DoctorDashboard() {
  const { roleData } = useAuth();
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [transcript, setTranscript] = useState('')
  const [medications, setMedications] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [managerFilter, setManagerFilter] = useState('All')

  useEffect(() => {
    if (!roleData) return;

    let unsubscribe = () => {};

    if (roleData.role === 'manager') {
       if (managerFilter === 'All') {
          unsubscribe = subscribeToAllPatients((data) => { setPatients(data); setLoading(false); });
       } else {
          unsubscribe = subscribeToDoctorPatients(managerFilter, (data) => { setPatients(data); setLoading(false); });
       }
    } else {
       if (roleData?.linkedId) {
         unsubscribe = subscribeToDoctorPatients(roleData.linkedId, (data) => {
           setPatients(data);
           setLoading(false);
         });
       } else {
         setLoading(false);
       }
    }
    return () => unsubscribe();
  }, [roleData, managerFilter]);

  const handleSubmitTranscript = async (e) => {
    e.preventDefault();
    if (!selectedPatient) return;
    
    setSubmitting(true);
    try {
      await updatePatientRecord(selectedPatient.id, {
        medicalTranscript: transcript,
        prescribedMedications: medications,
        transcriptStatus: 'Pending Pharmacist',
        lastConsultation: new Date().toISOString()
      });
      alert(`Consultation notes for ${selectedPatient.name} submitted to pharmacy.`);
      setSelectedPatient(null);
      setTranscript('');
      setMedications('');
    } catch (err) {
      console.error(err);
      alert("Error submitting transcript.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="container"><p>Loading Patient Schedule...</p></div>

  return (
    <div className="container">
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="title">Doctor Consultation Dashboard</h1>
          <p style={{ color: 'var(--text-muted)' }}>Daily Consultation Schedule & Clinical Documentation</p>
        </div>
        {roleData?.role === 'manager' && (
          <select
            className="btn"
            value={managerFilter}
            onChange={(e) => setManagerFilter(e.target.value)}
            style={{ padding: '0.6rem 1rem', borderRadius: '20px', border: '1px solid var(--border)', background: 'var(--white)', outline: 'none' }}
          >
            <option value="All">List All Patients Globally</option>
            <optgroup label="Doctors">
              <option value="D001">Dr. Sarah Lim (D001)</option>
              <option value="D002">Dr. Ahmad Faizal (D002)</option>
              <option value="D003">Dr. Emily Chen (D003)</option>
              <option value="D004">Dr. Raj Kumar (D004)</option>
              <option value="D005">Dr. Siti Nurhaliza (D005)</option>
              <option value="D006">Dr. Wei Ling (D006)</option>
              <option value="D007">Dr. John Doe (D007)</option>
            </optgroup>
          </select>
        )}
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: selectedPatient ? '1fr 1fr' : '1fr', gap: '2rem' }}>
        
        {/* Patient Schedule List */}
        <section className="card">
          <h2 className="title" style={{ fontSize: '1.2rem', marginBottom: '1.5rem' }}>Today's Consultations</h2>
          {patients.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No patients scheduled for today.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {patients.map(patient => (
                <div 
                  key={patient.id} 
                  className="card" 
                  style={{ 
                    cursor: 'pointer', 
                    padding: '1rem', 
                    border: selectedPatient?.id === patient.id ? '2px solid var(--primary)' : '1px solid var(--border)',
                    background: selectedPatient?.id === patient.id ? '#eff6ff' : 'white'
                  }}
                  onClick={() => setSelectedPatient(patient)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 'bold' }}>{patient.name}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Age: {patient.age} | Risk: {patient.riskLevel}</div>
                    </div>
                    <span className={`badge badge-${patient.urgencyLevel?.toLowerCase() || 'standard'}`}>{patient.urgencyLevel}</span>
                  </div>
                  <div style={{ marginTop: '0.5rem', display: 'flex', gap: '1rem', fontSize: '0.8rem' }}>
                    <Link href={`/patient/${patient.id}`} style={{ color: 'var(--primary)', fontWeight: '600' }}>View Full Profile</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Clinical Documentation Panel */}
        {selectedPatient && (
          <section className="card" style={{ borderTop: '8px solid var(--primary)' }}>
            <h2 className="title" style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Clinical Documentation</h2>
            <p style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>Documenting for: <strong>{selectedPatient.name}</strong></p>
            
            <form onSubmit={handleSubmitTranscript}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem' }}>Medical Transcript</label>
                <textarea
                  placeholder="Clinical findings, diagnosis, and observations..."
                  className="btn"
                  style={{ width: '100%', minHeight: '150px', border: '1px solid var(--border)', background: 'var(--white)', textAlign: 'left', padding: '0.75rem' }}
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  required
                ></textarea>
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem' }}>Medications (Forward to Pharmacist)</label>
                <textarea
                  placeholder="Item name, dosage, and frequency (e.g., Paracetamol 500mg TDS)..."
                  className="btn"
                  style={{ width: '100%', minHeight: '80px', border: '1px solid var(--border)', background: 'var(--white)', textAlign: 'left', padding: '0.75rem' }}
                  value={medications}
                  onChange={(e) => setMedications(e.target.value)}
                  required
                ></textarea>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ flex: 1, padding: '1rem' }}
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : 'File Transcript & Medication'}
                </button>
                <button 
                  type="button" 
                  className="btn" 
                  onClick={() => setSelectedPatient(null)}
                  style={{ background: '#f8fafc' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

      </div>
    </div>
  )
}
