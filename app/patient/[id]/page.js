'use client'

import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { mockDoctors } from '@/lib/mockData'
import { db } from '@/lib/firebase'
import { doc, onSnapshot } from 'firebase/firestore'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function PatientProfilePage() {
  const params = useParams()
  const { id } = params
  const [patient, setPatient] = useState(null)
  const [loading, setLoading] = useState(true)

  const [scheduledSlot, setScheduledSlot] = useState(null)
  const [scheduling, setScheduling] = useState(false)
  const [checkedRoutines, setCheckedRoutines] = useState({})

  useEffect(() => {
    if (!id) return;

    // Real-time listener for patient document
    const patientRef = doc(db, 'patients', id);
    const unsubscribe = onSnapshot(patientRef, (docSnap) => {
      if (docSnap.exists()) {
        setPatient({ id: docSnap.id, ...docSnap.data() });
      } else {
        // Fallback for demo if doc doesn't exist in Firestore
        import('@/lib/firebase').then(m => m.getAllPatients().then(all => {
          const found = all.find(p => p.id === id);
          if (found) setPatient(found);
        }));
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [id]);

  if (loading) return <div className="container"><p>Loading patient profile...</p></div>
  if (!patient) return <div className="container"><p>Patient not found.</p></div>

  const toggleRoutine = (index) => {
    setCheckedRoutines(prev => ({
      ...prev,
      [index]: !prev[index]
    }))
  }

  // Calculate Alerts
  const pendingRoutines = patient.careRoutine?.filter((_, i) => !checkedRoutines[i]) || [];
  const lowStockItems = patient.personalInventory?.filter(item => item.stock <= 2) || [];
  
  const doctor = mockDoctors.find(d => d.id === (patient.assignedDoctorId || patient.assignedDoctor));

  const autoSchedule = () => {
    setScheduling(true)
    setTimeout(() => {
      if (doctor && doctor.availableSlots?.length > 0) {
        setScheduledSlot(patient.urgencyLevel === 'Critical' ? doctor.availableSlots[0] : doctor.availableSlots[doctor.availableSlots.length - 1])
      }
      setScheduling(false)
    }, 1000)
  }

  const getStatusColor = (type, value) => {
    if (type === 'hr') {
      if (value < 60 || value > 100) return 'var(--critical)';
      if (value > 90) return 'var(--warning)';
      return 'var(--success)';
    }
    if (type === 'temp') {
      if (value > 38) return 'var(--critical)';
      if (value > 37.5) return 'var(--warning)';
      return 'var(--success)';
    }
    return 'var(--primary)';
  }

  return (
    <div className="container">
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="title">Patient: {patient.name}</h1>
          <p style={{ color: 'var(--text-muted)' }}>ID: {patient.id} | Age: {patient.age} | Status: <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{patient.status}</span></p>
        </div>
        <div style={{ textAlign: 'right' }}>
           <span className={`badge badge-${patient.riskLevel?.toLowerCase() || 'low'}`} style={{ display: 'block', marginBottom: '0.5rem' }}>{patient.riskLevel} Risk</span>
           <Link href="/dashboard" style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>← Back to Dashboard</Link>
        </div>
      </header>

      {/* AI Assistant Alerts Section */}
      {(pendingRoutines.length > 0 || lowStockItems.length > 0) && (
        <section className="card" style={{ background: '#fffbeb', borderLeft: '8px solid var(--warning)', marginBottom: '2rem' }}>
          <h2 className="title" style={{ fontSize: '1rem', color: '#b45309', marginBottom: '1rem' }}>💡 AI Assistant Reminders</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {pendingRoutines.length > 0 && (
              <div style={{ padding: '0.75rem', background: '#fef3c7', borderRadius: '6px', border: '1px solid #fde68a' }}>
                <strong style={{ color: '#92400e', display: 'block', marginBottom: '0.25rem' }}>Routine Checklist</strong>
                <p style={{ fontSize: '0.85rem', color: '#b45309', margin: 0 }}>
                  {pendingRoutines.length} pending tasks for today. Please check vitals or administer medication.
                </p>
              </div>
            )}
            {lowStockItems.length > 0 && (
              <div style={{ padding: '0.75rem', background: '#fee2e2', borderRadius: '6px', border: '1px solid #fecaca' }}>
                <strong style={{ color: '#b91c1c', display: 'block', marginBottom: '0.25rem' }}>Inventory Alert</strong>
                <p style={{ fontSize: '0.85rem', color: '#dc2626', margin: 0 }}>
                  Low stock: {lowStockItems.map(i => i.item).join(', ')}. Replenishment required.
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        
        {/* Left Column: Context & Care Tracker */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <section className="card">
            <h2 className="title" style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Vital Monitoring</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px', borderLeft: `4px solid ${getStatusColor('hr', patient.vitals?.hr)}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1.2rem' }}>❤️</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>HEART RATE</span>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{patient.vitals?.hr || '--'} <span style={{ fontSize: '0.8rem', fontWeight: 'normal' }}>BPM</span></div>
              </div>
              <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px', borderLeft: `4px solid ${getStatusColor('temp', patient.vitals?.temp)}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1.2rem' }}>🌡️</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>TEMP</span>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{patient.vitals?.temp || '--'} <span style={{ fontSize: '0.8rem', fontWeight: 'normal' }}>°C</span></div>
              </div>
              <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1.2rem' }}>⭕</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>BLOOD PRESSURE</span>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{patient.vitals?.bp || '--'}</div>
              </div>
              <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px', borderLeft: '4px solid #06b6d4' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1.2rem' }}>💧</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>O2 LEVEL</span>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{patient.vitals?.o2 || '98'} <span style={{ fontSize: '0.8rem', fontWeight: 'normal' }}>%</span></div>
              </div>
            </div>
            {patient.alerts && patient.alerts.length > 0 && (
              <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#fef2f2', borderRadius: '8px' }}>
                <strong style={{ color: 'var(--critical)', fontSize: '0.9rem', display: 'block', marginBottom: '0.5rem' }}>⚠️ Active Clinical Alerts</strong>
                <ul style={{ paddingLeft: '1.2rem', margin: 0, color: '#991b1b', fontSize: '0.85rem' }}>
                  {patient.alerts.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              </div>
            )}
          </section>

          {(patient.medicalTranscript || patient.prescribedMedications) && (
            <section className="card" style={{ borderLeft: '8px solid #8b5cf6' }}>
              <h2 className="title" style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>📜 Doctor's Orders</h2>
              {patient.medicalTranscript && (
                <div style={{ marginBottom: '1rem' }}>
                  <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Clinical Transcript</h4>
                  <p style={{ fontSize: '0.9rem', whiteSpace: 'pre-wrap', background: '#f8fafc', padding: '0.75rem', borderRadius: '6px' }}>{patient.medicalTranscript}</p>
                </div>
              )}
              {patient.prescribedMedications && (
                <div>
                  <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Prescribed Medication</h4>
                  <p style={{ fontSize: '0.9rem', color: '#1e40af', background: '#eff6ff', padding: '0.75rem', borderRadius: '6px', border: '1px solid #bfdbfe' }}>{patient.prescribedMedications}</p>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', textAlign: 'right' }}>Status: <strong>{patient.transcriptStatus || 'Pending'}</strong></div>
                </div>
              )}
            </section>
          )}

          <section className="card">
            <h2 className="title" style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Daily Care Routine</h2>
            {patient.careRoutine?.length > 0 ? (
              <ul style={{ listStyleType: 'none', padding: 0 }}>
                {patient.careRoutine.map((routine, i) => (
                  <li key={i} style={{ padding: '0.75rem', background: checkedRoutines[i] ? '#f1f5f9' : 'var(--white)', border: '1px solid var(--border)', borderRadius: '4px', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <input 
                      type="checkbox" 
                      checked={!!checkedRoutines[i]} 
                      onChange={() => toggleRoutine(i)} 
                    />
                    <span style={{ textDecoration: checkedRoutines[i] ? 'line-through' : 'none', color: checkedRoutines[i] ? 'var(--text-muted)' : 'inherit' }}>
                      {routine}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
                <p style={{ color: 'var(--text-muted)' }}>No active routines.</p>
            )}
          </section>

        </div>

        {/* Right Column: Vitals Trend & AI Observations */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

          {doctor && (
          <section className="card">
            <h2 className="title" style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Consultation Scheduling</h2>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                 <strong>{doctor.name}</strong>
                 <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Specialty: {doctor.specialty}</div>
              </div>
              <button onClick={autoSchedule} disabled={scheduling} className="btn btn-primary" style={{ fontSize: '0.8rem' }}>
                 {scheduling ? 'Computing...' : 'AI Auto-Schedule'}
              </button>
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
               {doctor.availableSlots?.map(slot => (
                   <div key={slot} style={{ 
                       padding: '0.5rem 1rem', 
                       borderRadius: '20px', 
                       fontSize: '0.85rem',
                       border: scheduledSlot === slot ? '2px solid var(--primary)' : '1px solid var(--border)',
                       background: scheduledSlot === slot ? '#eff6ff' : '#f8fafc',
                       color: scheduledSlot === slot ? 'var(--primary)' : 'inherit',
                       fontWeight: scheduledSlot === slot ? 'bold' : 'normal'
                   }}>
                     {slot}
                   </div>
               ))}
            </div>
            {scheduledSlot && (
                <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--success)', background: '#f0fdf4', padding: '0.5rem', borderRadius: '4px' }}>
                    ✓ Consultation confirmed & reminder generated for {scheduledSlot}.
                </div>
            )}
          </section>
          )}
          
          <section className="card">
            <h2 className="title" style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Trend History</h2>
            <div style={{ width: '100%', height: 350 }}>
              <ResponsiveContainer>
                <LineChart data={patient.trendHistory || []} margin={{ top: 5, right: 30, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis yAxisId="left" label={{ value: 'Heart Rate', angle: -90, position: 'insideLeft', offset: 10 }} />
                  <YAxis yAxisId="right" orientation="right" label={{ value: 'Temp (°C)', angle: 90, position: 'insideRight', offset: 10 }} domain={['35', '40']} />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="hr" stroke="var(--critical)" name="Heart Rate (BPM)" strokeWidth={2} />
                  <Line yAxisId="right" type="monotone" dataKey="temp" stroke="var(--primary)" name="Temperature (°C)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="card" style={{ borderLeft: '8px solid var(--primary)' }}>
             <h2 className="title" style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>AI Clinical Summary</h2>
             <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.6' }}>
                {patient.vitals?.hr ? `Heart rate is currently ${patient.vitals.hr} BPM.` : 'No vital data recorded.'}
                {patient.vitals?.temp ? ` Temperature is ${patient.vitals.temp}°C.` : ''}
                {patient.symptoms && ` Patient reported symptoms: ${patient.symptoms}.`}
                <br /><br />
                <strong>Clinical Notes:</strong> No immediate intervention suggested. Maintain scheduled care routines.
             </p>
          </section>

        </div>

      </div>
    </div>
  )
}
