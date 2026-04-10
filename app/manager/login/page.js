'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ManagerLoginPage() {
    const [credentials, setCredentials] = useState({ email: '', password: '' })
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleLogin = (e) => {
        e.preventDefault()
        setLoading(true)
        // Simulated manager login - specifically looking for manager role
        if (credentials.email.includes('manager')) {
            localStorage.setItem('userRole', 'manager')
            localStorage.setItem('userName', 'Hospital Administrator')
            router.push('/manager')
        } else {
            alert('Invalid Manager Credentials. Use an email containing "manager".')
        }
        setLoading(false)
    }

    return (
        <div className="container" style={{ maxWidth: '400px', marginTop: '100px' }}>
            <div className="card">
                <h1 className="title" style={{ textAlign: 'center' }}>Manager Login</h1>
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '2rem' }}>Administrative Access Only</p>
                
                <form onSubmit={handleLogin}>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Admin Email</label>
                        <input 
                            type="email" 
                            className="btn" 
                            style={{ width: '100%', textAlign: 'left', border: '1px solid var(--border)' }}
                            placeholder="manager@hospital.com"
                            value={credentials.email}
                            onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                            required
                        />
                    </div>
                    <div style={{ marginBottom: '2rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Password</label>
                        <input 
                            type="password" 
                            className="btn" 
                            style={{ width: '100%', textAlign: 'left', border: '1px solid var(--border)' }}
                            placeholder="••••••••"
                            value={credentials.password}
                            onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                            required
                        />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                        {loading ? 'Authenticating...' : 'Secure Login'}
                    </button>
                </form>
            </div>
        </div>
    )
}
