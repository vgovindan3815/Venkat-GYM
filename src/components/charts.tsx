import type { CSSProperties } from 'react'

export function MacroBar({
  label,
  value,
  max,
  color,
}: {
  label: string
  value: number
  max: number
  color: string
}) {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: '#94a3b8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{label}</span>
        <span style={{ fontSize: 12, color: '#e2e8f0', fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}>{Math.round(value)}g</span>
      </div>
      <div style={{ background: '#1e293b', borderRadius: 999, height: 8, overflow: 'hidden' }}>
        <div style={{ width: `${percentage}%`, height: '100%', background: color, borderRadius: 999, transition: 'width 0.3s ease' }} />
      </div>
    </div>
  )
}

export function RingChart({ consumed, goal }: { consumed: number; goal: number }) {
  const progress = goal > 0 ? Math.min(consumed / goal, 1) : 0
  const radius = 52
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference - progress * circumference
  const overGoal = consumed > goal

  const centerStyle: CSSProperties = {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  }

  return (
    <div style={{ position: 'relative', width: 140, height: 140, flexShrink: 0 }}>
      <svg width="140" height="140" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="70" cy="70" r={radius} fill="none" stroke="#1e293b" strokeWidth="12" />
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke={overGoal ? '#f43f5e' : '#22d3ee'}
          strokeWidth="12"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.3s ease' }}
        />
      </svg>
      <div style={centerStyle}>
        <div style={{ fontSize: 26, fontWeight: 700, color: overGoal ? '#f43f5e' : '#f8fafc' }}>{consumed}</div>
        <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>kcal eaten</div>
        <div style={{ fontSize: 10, color: overGoal ? '#f43f5e' : '#22d3ee', marginTop: 2 }}>
          {overGoal ? `+${consumed - goal} over` : `${Math.max(goal - consumed, 0)} left`}
        </div>
      </div>
    </div>
  )
}
