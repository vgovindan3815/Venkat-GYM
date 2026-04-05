import { useState } from 'react'
import { demoCredentials } from '../services/auth'
import type { SessionUser } from '../types'

type LoginFormProps = {
  onLogin: (email: string, password: string) => SessionUser | null
}

export default function LoginForm({ onLogin }: LoginFormProps) {
  const [email, setEmail] = useState(demoCredentials.user.email)
  const [password, setPassword] = useState(demoCredentials.user.password)
  const [error, setError] = useState('')

  const inputStyle = {
    width: '100%',
    boxSizing: 'border-box' as const,
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: 12,
    color: '#e2e8f0',
    padding: '12px 14px',
    fontSize: 14,
    outline: 'none',
  }

  function submit() {
    const session = onLogin(email, password)
    if (!session) {
      setError('Invalid email or password')
      return
    }

    setError('')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0b1120', color: '#e2e8f0', display: 'grid', placeItems: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 420, background: '#131e30', borderRadius: 20, padding: 22, boxShadow: '0 24px 48px rgba(0,0,0,0.25)' }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 26 }}>Caloriecounter</h1>
        <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: 13 }}>Sign in as user or admin.</p>

        <div style={{ display: 'grid', gap: 10, marginBottom: 14 }}>
          <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" style={inputStyle} />
          <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" type="password" style={inputStyle} />
        </div>

        {error && <div style={{ color: '#f87171', fontSize: 12, marginBottom: 10 }}>{error}</div>}

        <button onClick={submit} style={{ width: '100%', background: '#22d3ee', border: 'none', borderRadius: 12, color: '#0b1120', padding: '12px 14px', fontWeight: 700, cursor: 'pointer' }}>
          Login
        </button>

        <div style={{ marginTop: 14, padding: 12, borderRadius: 12, background: '#0f172a', fontSize: 12, color: '#94a3b8' }}>
          <div>User: {demoCredentials.user.email} / {demoCredentials.user.password}</div>
          <div>Admin: {demoCredentials.admin.email} / {demoCredentials.admin.password}</div>
        </div>
      </div>
    </div>
  )
}
