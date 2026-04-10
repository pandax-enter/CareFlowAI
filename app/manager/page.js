'use client'

import { useState, useEffect } from 'react'
import { db, subscribeToAlerts, deleteAlert, subscribeToInventory, createAlert } from '@/lib/firebase'
import { collection, onSnapshot, doc, updateDoc, query, where, getDocs } from 'firebase/firestore'
import { useAuth } from '@/components/AuthContext'
import Link from 'next/link'

export default function ManagerDashboard() {
  const { roleData } = useAuth()
  const [nurses, setNurses] = useState([])
  const [doctors, setDoctors] = useState([])
  const [patients, setPatients] = useState([])
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [activeTab, setActiveTab] = useState('nurses')

  useEffect(() => {
    // Real-time listener for nurses
    const unsubNurses = onSnapshot(collection(db, 'nurses'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        specialty: doc.data().specialty || doc.data().specialization || 'General',
        performanceScore: doc.data().performanceScore || 85,
        basePay: doc.data().basePay || 3000
      }))
      setNurses(data)
    })

    // Real-time listener for doctors
    const unsubDoctors = onSnapshot(collection(db, 'doctors'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        specialty: doc.data().specialty || 'General',
        availableSlots: doc.data().availableSlots || []
      }))
      setDoctors(data)
    })

    // Real-time listener for patients (Admitted only)
    const qPatients = query(collection(db, 'patients'), where('status', '==', 'Admitted'));
    const unsubPatients = onSnapshot(qPatients, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPatients(data);
      setLoading(false);
    });

    // Real-time listener for alerts
    const unsubAlerts = subscribeToAlerts((data) => {
      setAlerts(data.filter(a => a.status !== 'resolved'));
    });

    // Real-time listener for inventory (auto-alert generation)
    const unsubInventory = subscribeToInventory((items) => {
      items.forEach(async (item) => {
        if (item.stock < (item.minThreshold || 50)) {
           // Check if an alert already exists for this item
           const existing = alerts.find(a => a.message.includes(item.name) && a.status === 'active');
           if (!existing) {
             await createAlert({ 
               message: `Low Stock: ${item.name} (${item.stock} left)`, 
               type: 'warning',
               sourceId: item.id
             });
           }
        }
      });
    });

    return () => {
      unsubNurses()
      unsubDoctors()
      unsubPatients()
      unsubAlerts()
      unsubInventory()
    }
  }, [alerts])

  const handlePayIncrease = async (nurseId) => {
    setActionLoading(nurseId)
    try {
      const nurse = nurses.find(n => n.id === nurseId)
      const newPay = (nurse.basePay || 3000) + 200
      await updateDoc(doc(db, 'nurses', nurseId), { basePay: newPay })
      alert(`Pay increase approved for ${nurse.name}. New Base Pay: RM${newPay}`)
    } catch (err) {
      console.error(err)
      alert("Failed to update pay.")
    } finally {
      setActionLoading(null)
    }
  }

  const handleTransferLoad = (id, type) => {
    setActionLoading(id)
    alert(`Initiating workload redistribution for ${type === 'nurse' ? 'Nurse' : 'Doctor'} ${id}...`)
    setTimeout(() => {
      alert("Workload rebalanced across available pool.")
      setActionLoading(null)
    }, 1500)
  }

  if (loading) return <div className="container"><p>Loading Managerial Data...</p></div>

  const SAFE_THRESHOLD = 50

  return (
    <div className="container">
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="title">Operations Command Center</h1>
          <p style={{ color: 'var(--text-muted)' }}>Hospital-wide Workload Monitoring & Optimization</p>
        </div>
      </header>

      {/* High-level Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="card" style={{ background: 'var(--primary)', color: 'white' }}>
              <h3 style={{ fontSize: '0.8rem', opacity: 0.9, marginBottom: '0.5rem', textTransform: 'uppercase' }}>Active Nurses</h3>
              <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{nurses.length}</div>
          </div>
          <div className="card" style={{ background: '#3b82f6', color: 'white' }}>
              <h3 style={{ fontSize: '0.8rem', opacity: 0.9, marginBottom: '0.5rem', textTransform: 'uppercase' }}>Doctors on Duty</h3>
              <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{doctors.length}</div>
          </div>
          <div className="card" style={{ background: '#f8fafc', borderLeft: '4px solid var(--success)' }}>
              <h3 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Avg Performance</h3>
              <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
                  {nurses.length ? Math.round(nurses.reduce((acc, n) => acc + (n.performanceScore || 0), 0) / nurses.length) : 0}%
              </div>
          </div>
          <div className="card" style={{ background: '#f8fafc', borderLeft: '4px solid var(--warning)' }}>
              <h3 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Active Alerts</h3>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--warning)' }}>{alerts.length}</div>
          </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem' }}>
        <div>
          {/* Tabs for Roster View */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', background: '#f1f5f9', padding: '0.4rem', borderRadius: '8px', width: 'fit-content' }}>
              <button 
                onClick={() => setActiveTab('nurses')}
                className="btn"
                style={{ 
                  background: activeTab === 'nurses' ? 'white' : 'transparent',
                  boxShadow: activeTab === 'nurses' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  color: activeTab === 'nurses' ? 'var(--primary)' : 'var(--text-muted)',
                  border: 'none',
                  fontWeight: '600'
                }}
              >
                Nurses Roster
              </button>
              <button 
                onClick={() => setActiveTab('doctors')}
                className="btn"
                style={{ 
                  background: activeTab === 'doctors' ? 'white' : 'transparent',
                  boxShadow: activeTab === 'doctors' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  color: activeTab === 'doctors' ? 'var(--primary)' : 'var(--text-muted)',
                  border: 'none',
                  fontWeight: '600'
                }}
              >
                Doctors Roster
              </button>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {activeTab === 'nurses' ? (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                          <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.85rem' }}>STAFF MEMBER</th>
                          <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.85rem' }}>SPECIALTY</th>
                          <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.85rem' }}>WORKLOAD STATUS</th>
                          <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.85rem' }}>PERFORMANCE</th>
                          <th style={{ padding: '1rem', textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.85rem' }}>ACTIONS</th>
                      </tr>
                  </thead>
                  <tbody>
                      {nurses.map(nurse => {
                          const nurseLoad = patients.filter(p => p.assignedNurseId === nurse.id).length
                          const isOverloaded = nurseLoad > 5 // Safe threshold for mock
                          return (
                              <tr key={nurse.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                  <td style={{ padding: '1.25rem 1rem' }}>
                                      <div style={{ fontWeight: 600 }}>{nurse.name}</div>
                                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {nurse.id}</div>
                                  </td>
                                  <td style={{ padding: '1rem' }}>
                                      <span className="badge" style={{ background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe' }}>{nurse.specialty}</span>
                                  </td>
                                  <td style={{ padding: '1rem' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                          <div style={{ width: '120px', height: '10px', background: '#e2e8f0', borderRadius: '5px', overflow: 'hidden' }}>
                                              <div style={{ 
                                                  width: `${Math.min(100, (nurseLoad / 10) * 100)}%`, 
                                                  height: '100%', 
                                                  background: isOverloaded ? 'var(--critical)' : '#10b981' 
                                              }}></div>
                                          </div>
                                          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: isOverloaded ? 'var(--critical)' : '#059669' }}>{nurseLoad} pts</span>
                                      </div>
                                  </td>
                                  <td style={{ padding: '1rem' }}>
                                      <div style={{ fontWeight: '600', color: nurse.performanceScore > 90 ? '#059669' : '#d97706' }}>{nurse.performanceScore}%</div>
                                  </td>
                                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                          <button disabled={actionLoading === nurse.id} onClick={() => handleTransferLoad(nurse.id, 'nurse')} className="btn" style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}>Transfer</button>
                                          <button disabled={actionLoading === nurse.id} onClick={() => handlePayIncrease(nurse.id)} className="btn btn-primary" style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem', background: 'var(--success)', border: 'none' }}>RM++</button>
                                      </div>
                                  </td>
                              </tr>
                          )
                      })}
                  </tbody>
                </table>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                          <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.85rem' }}>DOCTOR</th>
                          <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.85rem' }}>SPECIALIZATION</th>
                          <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.85rem' }}>PATIENT LOAD</th>
                          <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.85rem' }}>AVAILABILITY</th>
                          <th style={{ padding: '1rem', textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.85rem' }}>ACTIONS</th>
                      </tr>
                  </thead>
                  <tbody>
                      {doctors.map(doctor => {
                          const docLoad = patients.filter(p => p.assignedDoctorId === doctor.id).length
                          return (
                            <tr key={doctor.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '1.25rem 1rem' }}>
                                    <div style={{ fontWeight: 600 }}>{doctor.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {doctor.id}</div>
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    <span className="badge" style={{ background: '#f5f3ff', color: '#5b21b6', border: '1px solid #ddd6fe' }}>{doctor.specialty}</span>
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--primary)' }}>{docLoad} active</div>
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                        {doctor.availableSlots?.slice(0, 2).map((s, i) => (
                                            <span key={i} style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: '#f1f5f9', borderRadius: '4px' }}>{s}</span>
                                        ))}
                                        {doctor.availableSlots?.length > 2 && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>+{doctor.availableSlots.length - 2} more</span>}
                                    </div>
                                </td>
                                <td style={{ padding: '1rem', textAlign: 'right' }}>
                                    <button disabled={actionLoading === doctor.id} onClick={() => handleTransferLoad(doctor.id, 'doctor')} className="btn" style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}>Redistribute</button>
                                </td>
                            </tr>
                          )
                      })}
                  </tbody>
                </table>
              )}
          </div>
        </div>

        <aside>
          <div className="card" style={{ padding: '1rem' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              🚩 Clinical Alerts
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {alerts.length === 0 ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>No active alerts</p>
              ) : (
                alerts.map(alert => (
                  <div key={alert.id} style={{ 
                    padding: '0.75rem', 
                    borderRadius: '8px', 
                    background: alert.type === 'critical' ? '#fee2e2' : '#fef3c7', 
                    border: `1px solid ${alert.type === 'critical' ? '#fecaca' : '#fde68a'}`,
                    position: 'relative'
                  }}>
                    <button 
                      onClick={() => deleteAlert(alert.id)}
                      style={{ position: 'absolute', top: '5px', right: '5px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '0.8rem', opacity: 0.5 }}
                    >✕</button>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: alert.type === 'critical' ? '#991b1b' : '#92400e', marginBottom: '0.25rem' }}>{alert.message}</div>
                    <div style={{ fontSize: '0.7rem', color: alert.type === 'critical' ? '#b91c1c' : '#78350f', opacity: 0.8 }}>
                      {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
