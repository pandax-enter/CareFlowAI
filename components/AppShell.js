'use client';
import { AuthProvider, useAuth } from '../components/AuthContext';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { subscribeToNursePatients, subscribeToDoctorPatients } from '@/lib/firebase';
import { useRef } from 'react';

export function Navbar() {
  const { roleData, logout } = useAuth();
  const pathname = usePathname();
  if (!roleData) return null;

  const isActive = (path) => {
    if (path === '/') return pathname === '/';
    // Strict matching for doctor dashboard to prevent overlap with Registration
    if (path === '/doctor') return pathname === '/doctor' || pathname.startsWith('/doctor/');
    return pathname.startsWith(path);
  };

  const linkStyle = (path) => {
    const active = isActive(path);
    return {
      textDecoration: 'none',
      color: active ? 'var(--primary)' : 'var(--text-muted)',
      fontWeight: active ? 'bold' : '500',
      borderBottom: active ? '2px solid var(--primary)' : 'none',
      paddingBottom: '0.2rem',
      transition: 'all 0.2s ease',
      cursor: 'pointer'
    };
  };

  // Clinical Notification Engine
  useEffect(() => {
    if (roleData?.role === 'nurse' && roleData.linkedId) {
      if (sessionStorage.getItem('notified_care_routine')) return;

      const unsub = subscribeToNursePatients(roleData.linkedId, (patients) => {
        const pending = patients.flatMap(p =>
          (p.careRoutine || []).filter(r => {
            const isObj = typeof r === 'object' && r !== null;
            return isObj ? !r.completed : true;
          }).map(r => {
            const isObj = typeof r === 'object' && r !== null;
            return {
              task: isObj ? r.task : r,
              time: (isObj && r.time) ? r.time : 'ASAP',
              patientName: p.name
            };
          })
        );

        if (pending.length > 0) {
          const dueTask = pending[0];
          const timeDisplay = dueTask.time === 'ASAP' ? 'ASAP' : `Clock Time: ${dueTask.time}`;
          alert(`🏥 Clinical Notification:\nCare Routine Task Due!\n\nPatient: ${dueTask.patientName}\nTask: ${dueTask.task || 'Routine Care'}\nTime: ${timeDisplay}`);
          sessionStorage.setItem('notified_care_routine', 'true');
          unsub();
        }
      });
      return () => unsub();
    }
  }, [roleData]);

  // New Patient Assignment Alert Engine
  const knownPatientsRef = useRef(new Set());
  const initialLoadRef = useRef(true);

  useEffect(() => {
    if (!roleData || !roleData.linkedId) return;
    if (roleData.role === 'manager') return; // Managers are observers; suppress clinical alerts

    const assignAlert = (patients) => {
       const currentIds = new Set(patients.map(p => p.id));
       
       if (initialLoadRef.current) {
          knownPatientsRef.current = currentIds;
          initialLoadRef.current = false;
          return;
       }

       // Find new patients that weren't in the previous state array
       const newPatients = patients.filter(p => !knownPatientsRef.current.has(p.id));
       
       if (newPatients.length > 0) {
          const newPatient = newPatients[0];
          alert(`🚨 System Alert:\nNew Patient Assigned!\n\nPatient: ${newPatient.name || 'Unknown'}\nRisk Level: ${newPatient.riskLevel || 'Standard'}\nWard/Unit: ${newPatient.assignedWard || 'General'}\n\nPlease check your dashboard.`);
          
          // Update known
          knownPatientsRef.current = currentIds;
       }
    };

    let unsub = () => {};
    if (roleData.role === 'nurse') {
        unsub = subscribeToNursePatients(roleData.linkedId, assignAlert);
    } else if (roleData.role === 'doctor') {
        unsub = subscribeToDoctorPatients(roleData.linkedId, assignAlert);
    }
    
    return () => unsub();
  }, [roleData]);

  return (
    <header style={{
      padding: '1rem 2rem',
      background: '#ffffff',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      position: 'sticky',
      top: 0,
      zIndex: 1000
    }}>
      <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--primary)' }}>
        <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>⚕️ CareFlow AI+</Link>
      </div>
      <nav style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
        {/* Navigation Logic */}
        {roleData.role === 'doctor' && (
          <>
            <Link href="/" style={linkStyle('/')} className="nav-link">Registration</Link>
            <Link href="/doctor" style={linkStyle('/doctor')} className="nav-link">Doctor Dashboard</Link>
            <Link href="/inventory" style={linkStyle('/inventory')} className="nav-link">Supply Intelligence</Link>
          </>
        )}
        {roleData.role !== 'doctor' && (
          <>
            {(roleData.role === 'registration_staff' || roleData.role === 'nurse' || roleData.role === 'manager') && (
              <Link href="/" style={linkStyle('/')} className="nav-link">Registration</Link>
            )}
            {roleData.role === 'nurse' && (
              <>
                <Link href="/dashboard" style={linkStyle('/dashboard')} className="nav-link">Nurse Dashboard</Link>
                <Link href="/inventory" style={linkStyle('/inventory')} className="nav-link">Supply Intelligence</Link>
              </>
            )}
            {roleData.role === 'manager' && (
              <>
                <Link href="/dashboard" style={linkStyle('/dashboard')} className="nav-link">Nurse Dashboard</Link>
                <Link href="/doctor" style={linkStyle('/doctor')} className="nav-link">Doctor Dashboard</Link>
                <Link href="/inventory" style={linkStyle('/inventory')} className="nav-link">Supply Intelligence</Link>
                <Link href="/manager" style={linkStyle('/manager')} className="nav-link">Operations</Link>
              </>
            )}
          </>
        )}
        <div style={{ marginLeft: '1rem', paddingLeft: '1rem', borderLeft: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: '600' }}>{roleData.name}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{roleData.role.replace(/_/g, ' ')}</div>
          </div>
          <button onClick={logout} className="btn" style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem', background: '#fee2e2', color: '#991b1b', border: 'none' }}>Logout</button>
        </div>
      </nav>
    </header>
  );
}

export function AppShell({ children }) {
  return (
    <AuthProvider>
      <Navbar />
      <main>{children}</main>
    </AuthProvider>
  );
}
