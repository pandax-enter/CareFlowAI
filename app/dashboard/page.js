'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthContext'
import { subscribeToNursePatients, subscribeToAllPatients, subscribeToWardPatients, db, subscribeToAlerts, updatePatientRecord } from '@/lib/firebase'

export default function DashboardPage() {
  const router = useRouter()
  const { roleData, logout } = useAuth()
  const [patients, setPatients] = useState([])
  const [loadingMap, setLoadingMap] = useState({})
  const [activeTab, setActiveTab] = useState('my_patients')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [alerts, setAlerts] = useState([])

  const [managerFilter, setManagerFilter] = useState('All')

  useEffect(() => {
    if (!roleData) return;

    let unsubscribe = () => { };

    if (roleData.role === 'manager') {
      if (managerFilter === 'All') {
        unsubscribe = subscribeToAllPatients((data) => { setPatients(data); setLoading(false); });
      } else if (activeTab === 'my_patients') {
        unsubscribe = subscribeToNursePatients(managerFilter, (data) => { setPatients(data); setLoading(false); });
      } else {
        unsubscribe = subscribeToWardPatients(managerFilter, (data) => { setPatients(data); setLoading(false); });
      }
    } else {
      if (!roleData.linkedId) return;
      if (activeTab === 'my_patients') {
        unsubscribe = subscribeToNursePatients(roleData.linkedId, (data) => { setPatients(data); setLoading(false); });
      } else {
        unsubscribe = subscribeToWardPatients(roleData.department, (data) => { setPatients(data); setLoading(false); });
      }
    }

    // Real-time listener for clinical alerts
    const unsubAlerts = subscribeToAlerts((data) => {
      setAlerts(data.filter(a => a.status === 'active'))
    })

    return () => {
      unsubscribe()
      unsubAlerts()
    };
  }, [roleData, activeTab, managerFilter]);

  const handlePatientAction = async (patientId, action) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient || !action) return;

    const confirmMsg = action === 'Discharge' 
      ? `Confirm Discharge for ${patient.name}? This will remove them from active monitoring.`
      : `Initiate Transfer for ${patient.name}?`;

    if (window.confirm(confirmMsg)) {
      setLoadingMap(prev => ({ ...prev, [patientId]: true }));
      try {
        if (action === 'Discharge') {
          await updatePatientRecord(patientId, { status: 'Discharged' });
        } else if (action === 'Transfer') {
          const newWard = window.prompt("Enter destination ward:", patient.assignedWard);
          if (newWard) {
            await updatePatientRecord(patientId, { assignedWard: newWard });
          }
        }
      } catch (err) {
        console.error(err);
        alert("Action failed.");
      } finally {
        setLoadingMap(prev => ({ ...prev, [patientId]: false }));
      }
    }
  };

  if (loading) return <div className="container"><p>Loading Dashboard...</p></div>

  // Filtering Logic
  const filteredBySearch = patients.filter(p => p.id.toLowerCase().includes(searchQuery.toLowerCase()) || p.name.toLowerCase().includes(searchQuery.toLowerCase()))

  const displayList = filteredBySearch.sort((a, b) => {
    const order = { 'Critical': 1, 'Urgent': 2, 'Standard': 3 };
    return (order[a.urgencyLevel] || 99) - (order[b.urgencyLevel] || 99);
  })

  return (
    <div className="container">
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="title">{roleData?.department} Unit Dashboard</h1>
          <p style={{ color: 'var(--text-muted)' }}>Workload: <strong>{patients.length} active patients</strong> in queue</p>
        </div>
      </header>


      {/* Stats Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card" style={{ borderLeft: '4px solid var(--critical)' }}>
          <h3 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>CRITICAL</h3>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--critical)' }}>{patients.filter(p => p.urgencyLevel === 'Critical').length}</div>
        </div>
        <div className="card" style={{ borderLeft: '4px solid var(--warning)' }}>
          <h3 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>URGENT</h3>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--warning)' }}>{patients.filter(p => p.urgencyLevel === 'Urgent').length}</div>
        </div>
        <div className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
          <h3 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>STABLE</h3>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>{patients.filter(p => p.urgencyLevel === 'Standard').length}</div>
        </div>
        <div className="card" style={{ borderLeft: '4px solid var(--success)' }}>
          <h3 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>MY LOAD</h3>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--success)' }}>{patients.length}</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', background: '#f1f5f9', padding: '0.25rem', borderRadius: '8px' }}>
          <button
            className="btn"
            style={{
              fontSize: '0.85rem',
              background: activeTab === 'my_patients' ? 'white' : 'transparent',
              boxShadow: activeTab === 'my_patients' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              color: activeTab === 'my_patients' ? 'var(--primary)' : 'var(--text-muted)',
              border: 'none',
              fontWeight: activeTab === 'my_patients' ? '600' : '500'
            }}
            onClick={() => setActiveTab('my_patients')}
          >
            My Priority Board
          </button>
          <button
            className="btn"
            style={{
              fontSize: '0.85rem',
              background: activeTab === 'shared' ? 'white' : 'transparent',
              boxShadow: activeTab === 'shared' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              color: activeTab === 'shared' ? 'var(--primary)' : 'var(--text-muted)',
              border: 'none',
              fontWeight: activeTab === 'shared' ? '600' : '500'
            }}
            onClick={() => setActiveTab('shared')}
          >
            Ward Overview
          </button>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {roleData?.role === 'manager' && (
            <select
              className="btn"
              value={managerFilter}
              onChange={(e) => setManagerFilter(e.target.value)}
              style={{ padding: '0.6rem 1rem', borderRadius: '20px', border: '1px solid var(--border)', background: 'var(--white)', outline: 'none' }}
            >
              <option value="All">List All Patients Globally</option>
              {activeTab === 'my_patients' ? (
                <>
                  <optgroup label="Nurses">
                    <option value="N001">Nurse Siti Aminah (N001)</option>
                    <option value="N002">Nurse Rajkumar (N002)</option>
                    <option value="N003">Nurse Mei Ling (N003)</option>
                    <option value="N004">Nurse Hafizah (N004)</option>
                    <option value="N005">Nurse Kavitha (N005)</option>
                  </optgroup>
                </>
              ) : (
                <>
                  <optgroup label="Wards">
                    <option value="Cardiac ICU">Cardiac ICU</option>
                    <option value="General Ward 2B">General Ward 2B</option>
                    <option value="Orthopedic / Geriatric">Orthopedic / Geriatric</option>
                  </optgroup>
                </>
              )}
            </select>
          )}
          <input
            type="text"
            placeholder="Search patient name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ padding: '0.6rem 1rem', borderRadius: '20px', border: '1px solid var(--border)', width: '280px', fontSize: '0.9rem' }}
          />
        </div>
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        {displayList.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📋</div>
            <p>No patients currently assigned in this category.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', fontSize: '0.85rem', color: 'var(--text-muted)' }}>PATIENT</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', fontSize: '0.85rem', color: 'var(--text-muted)' }}>STATUS</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', fontSize: '0.85rem', color: 'var(--text-muted)' }}>VITALS</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', fontSize: '0.85rem', color: 'var(--text-muted)' }}>AI INSIGHTS</th>
                <th style={{ padding: '1rem', textAlign: 'right', fontWeight: '600', fontSize: '0.85rem', color: 'var(--text-muted)' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {displayList.map(patient => {
                return (
                  <tr key={patient.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}>
                  <td style={{ padding: '1.25rem 1rem' }}>
                    <Link href={`/patient/${patient.id}`} style={{ textDecoration: 'none' }}>
                      <div style={{ fontWeight: 'bold', color: 'var(--text-dark)' }}>{patient.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {patient.id}</div>
                    </Link>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <span className={`badge badge-${(patient.riskLevel || patient.urgencyLevel || 'low').toLowerCase()}`} style={{ fontSize: '0.7rem', width: 'fit-content' }}>
                        {patient.riskLevel?.toUpperCase() || patient.urgencyLevel?.toUpperCase()}
                      </span>
                      <span style={{
                        fontSize: '0.65rem',
                        fontWeight: 'bold',
                        color: patient.status === 'Admitted' ? '#2563eb' :
                          patient.status === 'Waiting' ? '#d97706' :
                            patient.status === 'Discharged' ? '#64748b' : '#7c3aed',
                        background: patient.status === 'Admitted' ? '#eff6ff' :
                          patient.status === 'Waiting' ? '#fffbeb' :
                            patient.status === 'Discharged' ? '#f1f5f9' : '#f5f3ff',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        width: 'fit-content'
                      }}>
                        {patient.status || 'Triage'}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontSize: '0.85rem', display: 'flex', gap: '0.5rem' }}>
                      <span title="HR"><span style={{ color: 'var(--critical)' }}>❤️</span> {patient.vitals?.hr || '-'}</span>
                      <span title="Temp"><span style={{ color: 'var(--primary)' }}>🌡️</span> {patient.vitals?.temp || '-'}°</span>
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {patient.alerts && patient.alerts.length > 0 ? (
                      <div style={{ background: '#fff1f2', color: '#9f1239', padding: '0.4rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                        ⚠️ {patient.alerts[0]}
                      </div>
                    ) : (
                      <span style={{ color: 'var(--success)', fontSize: '0.8rem', fontWeight: '500' }}>✓ Clinically Stable</span>
                    )}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                       <select
                         className="btn"
                         style={{ fontSize: '0.75rem', padding: '0.4rem 0.5rem', border: '1px solid var(--border)' }}
                         onChange={(e) => handlePatientAction(patient.id, e.target.value)}
                         value=""
                         disabled={loadingMap[patient.id]}
                       >
                         <option value="" disabled>Action</option>
                         <option value="Discharge">Discharge</option>
                         <option value="Transfer">Transfer</option>
                       </select>
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
