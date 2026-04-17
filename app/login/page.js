'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { loginUser } from '@/lib/firebase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const router = useRouter()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const user = await loginUser(email, password)
      
      // Exchange token for session cookie (Fixes Cloud Run "Authenticating" delay)
      if (user && typeof user.getIdToken === 'function') {
        const idToken = await user.getIdToken()
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken })
        })
        
        if (res.ok) {
          const data = await res.json()
          const ROLE_HOME = {
            registration: '/',
            nurse: '/dashboard',
            doctor: '/doctor',
            manager: '/manager',
          }
          // Immediate redirect using server-side role data
          router.push(ROLE_HOME[data.user.role] || '/')
          return
        } else {
          const errorData = await res.json()
          throw new Error(errorData.error || 'Session creation failed')
        }
      } else {
        // Fallback for mock mode or unexpected user object
        router.push('/')
      }
    } catch (err) {
      console.error('Login error:', err)
      setError(err.message || 'Invalid credentials. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="container" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <section className="card" style={{ maxWidth: '400px', width: '100%', padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚕️</div>
          <h1 className="title" style={{ marginBottom: '0.5rem' }}>CareFlow AI+</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Secure Healthcare Management Portal</p>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem' }}>Email Address</label>
            <input
              type="email"
              placeholder="name@hospital.com"
              className="btn"
              style={{ width: '100%', border: '1px solid var(--border)', background: 'var(--white)', textAlign: 'left', padding: '0.75rem' }}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem' }}>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              className="btn"
              style={{ width: '100%', border: '1px solid var(--border)', background: 'var(--white)', textAlign: 'left', padding: '0.75rem' }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div style={{ padding: '0.75rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1.5rem', textAlign: 'center' }}>
              {error}
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '1rem', fontSize: '1rem', fontWeight: 'bold' }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <p>Restricted access for authorized medical personnel only.</p>
        </div>
      </section>
    </div>
  )
}
