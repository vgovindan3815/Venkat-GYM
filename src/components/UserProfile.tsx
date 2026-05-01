import { useRef, useState } from 'react'
import type { Sex, UserProfile, WeightEntry } from '../types'

type Props = {
  profile: UserProfile
  weightLog: WeightEntry[]
  onSaveProfile: (profile: UserProfile) => void
  onAddWeight: (entry: WeightEntry) => void
}

const panelStyle: React.CSSProperties = {
  background: '#131e30',
  borderRadius: 20,
  padding: 20,
  marginBottom: 16,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#0f172a',
  border: '1px solid #1e293b',
  borderRadius: 10,
  color: '#e2e8f0',
  padding: '10px 12px',
  fontSize: 14,
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: 5,
  display: 'block',
}

function cmToFtIn(cm: number): string {
  const totalInches = cm / 2.54
  const ft = Math.floor(totalInches / 12)
  const inches = Math.round(totalInches % 12)
  return `${ft}′${inches}″`
}

function kgToLbs(kg: number): string {
  return (kg * 2.20462).toFixed(1)
}

export default function UserProfile({ profile, weightLog, onSaveProfile, onAddWeight }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<UserProfile>(profile)
  const [newWeight, setNewWeight] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setDraft((prev) => ({ ...prev, photoDataUrl: reader.result as string }))
    }
    reader.readAsDataURL(file)
  }

  function handleSave() {
    onSaveProfile(draft)
    setEditing(false)
  }

  function handleCancel() {
    setDraft(profile)
    setEditing(false)
  }

  function handleAddWeight() {
    const kg = parseFloat(newWeight)
    if (!kg || kg <= 0) return
    const today = new Date().toISOString().split('T')[0]
    onAddWeight({ date: today, weightKg: kg })
    setNewWeight('')
  }

  // Sort weight log newest first
  const sortedLog = [...weightLog].sort((a, b) => b.date.localeCompare(a.date))
  const latestWeight = sortedLog[0]?.weightKg ?? null

  // Weight chart: last 12 entries oldest → newest
  const chartEntries = [...weightLog].sort((a, b) => a.date.localeCompare(b.date)).slice(-12)
  const minW = chartEntries.length > 0 ? Math.min(...chartEntries.map((e) => e.weightKg)) - 2 : 0
  const maxW = chartEntries.length > 0 ? Math.max(...chartEntries.map((e) => e.weightKg)) + 2 : 100
  const range = maxW - minW || 1

  const bmi =
    profile.heightCm && latestWeight
      ? (latestWeight / Math.pow(profile.heightCm / 100, 2)).toFixed(1)
      : null

  function bmiCategory(b: number): { label: string; color: string } {
    if (b < 18.5) return { label: 'Underweight', color: '#67e8f9' }
    if (b < 25) return { label: 'Healthy', color: '#4ade80' }
    if (b < 30) return { label: 'Overweight', color: '#facc15' }
    return { label: 'Obese', color: '#f87171' }
  }

  return (
    <div>
      {/* Avatar + summary */}
      <section style={panelStyle}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div
            style={{ width: 80, height: 80, borderRadius: '50%', overflow: 'hidden', background: '#0f172a', border: '2px solid #1e293b', flexShrink: 0, display: 'grid', placeItems: 'center', cursor: 'pointer' }}
            onClick={() => editing && fileInputRef.current?.click()}
          >
            {draft.photoDataUrl ? (
              <img src={draft.photoDataUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
                <circle cx="19" cy="14" r="8" fill="#334155" />
                <ellipse cx="19" cy="32" rx="14" ry="8" fill="#334155" />
              </svg>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#f8fafc' }}>{profile.name || 'Your Profile'}</div>
            {profile.age && (
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                Age {profile.age} • {profile.sex || ''}
              </div>
            )}
            {profile.heightCm && (
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                {profile.heightCm} cm ({cmToFtIn(profile.heightCm)})
              </div>
            )}
            {latestWeight && (
              <div style={{ fontSize: 13, color: '#22d3ee', fontWeight: 600, marginTop: 4 }}>
                {latestWeight} kg ({kgToLbs(latestWeight)} lbs)
              </div>
            )}
          </div>
          <button
            onClick={() => setEditing((p) => !p)}
            style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, color: '#94a3b8', padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}
          >
            {editing ? 'Cancel' : 'Edit'}
          </button>
        </div>

        {/* BMI */}
        {bmi && (
          <div style={{ marginTop: 14, display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ background: '#0f172a', borderRadius: 12, padding: '10px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>BMI</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: bmiCategory(parseFloat(bmi)).color }}>{bmi}</div>
              <div style={{ fontSize: 11, color: bmiCategory(parseFloat(bmi)).color }}>{bmiCategory(parseFloat(bmi)).label}</div>
            </div>
          </div>
        )}
      </section>

      {/* Edit form */}
      {editing && (
        <section style={panelStyle}>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />

          <div style={{ marginBottom: 12 }}>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{ border: '1px dashed #334155', background: 'transparent', borderRadius: 10, color: '#64748b', padding: '8px 14px', cursor: 'pointer', fontSize: 13, width: '100%' }}
            >
              {draft.photoDataUrl ? '📷 Change photo' : '📷 Upload profile photo'}
            </button>
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>Name</label>
            <input style={inputStyle} value={draft.name} onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))} placeholder="Your name" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={labelStyle}>Age</label>
              <input style={inputStyle} type="number" min="1" max="120" value={draft.age ?? ''} onChange={(e) => setDraft((p) => ({ ...p, age: e.target.value ? Number(e.target.value) : null }))} placeholder="Years" />
            </div>
            <div>
              <label style={labelStyle}>Sex</label>
              <select style={inputStyle} value={draft.sex ?? ''} onChange={(e) => setDraft((p) => ({ ...p, sex: (e.target.value as Sex) || null }))}>
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Height (cm)</label>
              <input style={inputStyle} type="number" min="50" max="280" value={draft.heightCm ?? ''} onChange={(e) => setDraft((p) => ({ ...p, heightCm: e.target.value ? Number(e.target.value) : null }))} placeholder="e.g. 175" />
              {draft.heightCm ? <div style={{ fontSize: 10, color: '#475569', marginTop: 3 }}>{cmToFtIn(draft.heightCm)}</div> : null}
            </div>
            <div>
              <label style={labelStyle}>Weight (kg)</label>
              <input style={inputStyle} type="number" min="20" max="500" step="0.1" value={draft.weightKg ?? ''} onChange={(e) => setDraft((p) => ({ ...p, weightKg: e.target.value ? Number(e.target.value) : null }))} placeholder="e.g. 75" />
              {draft.weightKg ? <div style={{ fontSize: 10, color: '#475569', marginTop: 3 }}>{kgToLbs(draft.weightKg)} lbs</div> : null}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleSave}
              style={{ flex: 1, border: 'none', background: 'linear-gradient(135deg, #0891b2, #22d3ee)', color: '#0b1120', borderRadius: 12, padding: '11px', fontWeight: 700, cursor: 'pointer' }}
            >
              Save Profile
            </button>
            <button
              onClick={handleCancel}
              style={{ border: '1px solid #334155', background: 'transparent', borderRadius: 12, color: '#64748b', padding: '11px 16px', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </section>
      )}

      {/* Weekly weight log */}
      <section style={panelStyle}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', marginBottom: 14 }}>Weight Tracker</div>

        {/* Add entry */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input
            style={{ ...inputStyle, flex: 1 }}
            type="number"
            min="20"
            max="500"
            step="0.1"
            value={newWeight}
            onChange={(e) => setNewWeight(e.target.value)}
            placeholder="Today's weight (kg)"
          />
          <button
            onClick={handleAddWeight}
            style={{ border: 'none', background: '#22d3ee', color: '#0b1120', borderRadius: 10, padding: '10px 16px', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}
          >
            Log
          </button>
        </div>

        {/* Sparkline chart */}
        {chartEntries.length >= 2 && (
          <div style={{ marginBottom: 16, background: '#0f172a', borderRadius: 12, padding: '12px 8px 8px' }}>
            <svg viewBox={`0 0 ${chartEntries.length * 30} 60`} style={{ width: '100%', height: 60, overflow: 'visible' }}>
              <polyline
                points={chartEntries.map((e, i) => {
                  const x = i * 30 + 15
                  const y = 55 - ((e.weightKg - minW) / range) * 50
                  return `${x},${y}`
                }).join(' ')}
                fill="none"
                stroke="#22d3ee"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {chartEntries.map((e, i) => {
                const x = i * 30 + 15
                const y = 55 - ((e.weightKg - minW) / range) * 50
                return (
                  <g key={e.date}>
                    <circle cx={x} cy={y} r="3" fill="#22d3ee" />
                    <text x={x} y={60} textAnchor="middle" fontSize="7" fill="#475569">
                      {e.date.slice(5)}
                    </text>
                  </g>
                )
              })}
            </svg>
          </div>
        )}

        {/* Log list */}
        {sortedLog.length === 0 ? (
          <div style={{ fontSize: 13, color: '#475569', textAlign: 'center', padding: '12px 0' }}>
            No weight entries yet. Log your first weigh-in above.
          </div>
        ) : (
          <div>
            {sortedLog.slice(0, 10).map((entry) => {
              const prev = sortedLog.find((e) => e.date < entry.date)
              const diff = prev ? entry.weightKg - prev.weightKg : null
              return (
                <div key={entry.date} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderTop: '1px solid #1e293b' }}>
                  <div style={{ fontSize: 13, color: '#94a3b8' }}>{entry.date}</div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    {diff !== null && (
                      <span style={{ fontSize: 11, color: diff < 0 ? '#4ade80' : diff > 0 ? '#f87171' : '#64748b' }}>
                        {diff > 0 ? '+' : ''}{diff.toFixed(1)} kg
                      </span>
                    )}
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#f8fafc' }}>{entry.weightKg} kg</span>
                    <span style={{ fontSize: 11, color: '#475569' }}>{kgToLbs(entry.weightKg)} lbs</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
