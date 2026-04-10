'use client';
import { AuthProvider, useAuth } from '../components/AuthContext';
import Link from 'next/link';

export function Navbar() {
  const { roleData, logout } = useAuth();
  if (!roleData) return null;

  return (
    <header style={{ padding: '1rem 2rem', background: '#ffffff', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--primary)' }}>
        <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>⚕️ CareFlow AI+</Link>
      </div>
      <nav style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
        {roleData.role === 'registration_staff' && (
          <Link href="/" className="nav-link">Registration</Link>
        )}
        {roleData.role === 'nurse' && (
          <>
            <Link href="/" className="nav-link">Registration</Link>
            <Link href="/dashboard" className="nav-link">Nurse Dashboard</Link>
            <Link href="/inventory" className="nav-link">Supply Intelligence</Link>
          </>
        )}
        {roleData.role === 'doctor' && (
          <Link href="/doctor" className="nav-link">Doctor Dashboard</Link>
        )}
        {roleData.role === 'manager' && (
          <>
            <Link href="/" className="nav-link">Registration</Link>
            <Link href="/dashboard" className="nav-link">Nurse Dashboard</Link>
            <Link href="/doctor" className="nav-link">Doctor Dashboard</Link>
            <Link href="/inventory" className="nav-link">Supply Intelligence</Link>
            <Link href="/manager" className="nav-link">Operations</Link>
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
