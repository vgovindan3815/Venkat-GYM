import { useState } from 'react'
import { demoCredentials } from '../services/auth'
import type { RegisterAccountInput, SessionUser, Sex } from '../types'

type LoginFormProps = {
  onLogin: (email: string, password: string) => SessionUser | null
  onRegister: (input: RegisterAccountInput) => { session: SessionUser | null; error?: string }
}

export default function LoginForm({ onLogin, onRegister }: LoginFormProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState(demoCredentials.user.email)
  const [password, setPassword] = useState(demoCredentials.user.password)
  const [displayName, setDisplayName] = useState('')
  const [fullName, setFullName] = useState('')
  const [age, setAge] = useState('')
  const [sex, setSex] = useState<Sex | ''>('')
  const [phone, setPhone] = useState('')
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
    if (mode === 'register') {
      const result = onRegister({
        email,
        password,
        displayName,
        fullName,
        age: age ? Number(age) : null,
        sex: sex || null,
        phone,
      })

      if (!result.session) {
        setError(result.error || 'Unable to create account')
        return
      }

      setError('')
      return
    }

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
        <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: 13 }}>
          {mode === 'login' ? 'Sign in as user or admin.' : 'Create your full local profile account.'}
        </p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button
            onClick={() => {
              setMode('login')
              setError('')
            }}
            style={{ flex: 1, border: '1px solid #334155', borderRadius: 10, background: mode === 'login' ? '#22d3ee' : 'transparent', color: mode === 'login' ? '#0b1120' : '#94a3b8', fontWeight: 700, padding: '8px 10px', cursor: 'pointer' }}
          >
            Login
          </button>
          <button
            onClick={() => {
              setMode('register')
              setError('')
              setEmail('')
              setPassword('')
            }}
            style={{ flex: 1, border: '1px solid #334155', borderRadius: 10, background: mode === 'register' ? '#4ade80' : 'transparent', color: mode === 'register' ? '#052e16' : '#94a3b8', fontWeight: 700, padding: '8px 10px', cursor: 'pointer' }}
          >
            Create Profile
          </button>
        </div>

        <div style={{ display: 'grid', gap: 10, marginBottom: 14 }}>
          {mode === 'register' && (
            <>
              <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Display name" style={inputStyle} />
              <input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Full name" style={inputStyle} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <input value={age} onChange={(event) => setAge(event.target.value)} placeholder="Age" type="number" style={inputStyle} />
                <select value={sex} onChange={(event) => setSex(event.target.value as Sex | '')} style={inputStyle}>
                  <option value="">Sex</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Phone" style={inputStyle} />
            </>
          )}
          <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" style={inputStyle} />
          <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" type="password" style={inputStyle} />
        </div>

        {error && <div style={{ color: '#f87171', fontSize: 12, marginBottom: 10 }}>{error}</div>}

        <button onClick={submit} style={{ width: '100%', background: '#22d3ee', border: 'none', borderRadius: 12, color: '#0b1120', padding: '12px 14px', fontWeight: 700, cursor: 'pointer' }}>
          {mode === 'login' ? 'Login' : 'Create Account'}
        </button>

        {mode === 'login' && (
          <div style={{ marginTop: 14, padding: 12, borderRadius: 12, background: '#0f172a', fontSize: 12, color: '#94a3b8' }}>
            <div>User: {demoCredentials.user.email} / {demoCredentials.user.password}</div>
            <div>Admin: {demoCredentials.admin.email} / {demoCredentials.admin.password}</div>
          </div>
        )}
      </div>
    </div>
  )
}
