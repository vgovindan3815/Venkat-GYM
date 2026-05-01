import { useEffect, useMemo, useState } from 'react'
import { GYM_EXERCISE_LIBRARY, type GymExerciseGuide, type MovementGraphic } from '../data/gymLibrary'
import { getWorkoutPlanForDate } from '../data/workoutPlan'
import type {
  BodyPart,
  ExerciseCategory,
  ExerciseEquipment,
  GymActivity,
  GymActivityByDate,
  WorkoutProgress,
  WorkoutProgressByDate,
} from '../types'

type ExercisePlannerProps = {
  dateKey: string
  workoutProgress: WorkoutProgressByDate
  gymActivities: GymActivityByDate
  customSchedule: Record<string, string[]>
  onUpdateProgress: (entry: WorkoutProgress) => void
  onAddActivity: (activity: Omit<GymActivity, 'id' | 'loggedAt'>) => void
  onDeleteActivity: (activityId: number) => void
  onAddToSchedule: (dateKey: string, exerciseIds: string[]) => void
  onRemoveFromSchedule: (dateKey: string, exerciseId: string) => void
}

function equipmentLabel(equipment: ExerciseEquipment): string {
  switch (equipment) {
    case 'barbell':
      return 'Barbell'
    case 'dumbbell':
      return 'Dumbbell'
    case 'cable':
      return 'Cable'
    case 'machine':
      return 'Machine'
    case 'bench':
      return 'Bench'
    case 'bodyweight':
      return 'Bodyweight'
    case 'treadmill':
      return 'Treadmill'
    case 'bike':
      return 'Bike'
    default:
      return 'Equipment'
  }
}

function categoryColor(category: ExerciseCategory): string {
  switch (category) {
    case 'strength':
      return '#38bdf8'
    case 'cardio':
      return '#fb7185'
    case 'mobility':
      return '#34d399'
    case 'sports':
      return '#fbbf24'
    default:
      return '#94a3b8'
  }
}

function EquipmentGraphic({ equipment }: { equipment: ExerciseEquipment }) {
  if (equipment === 'treadmill') {
    return (
      <svg width="58" height="42" viewBox="0 0 58 42" fill="none" aria-hidden>
        <rect x="7" y="26" width="38" height="9" rx="3" fill="#334155" />
        <rect x="11" y="28" width="30" height="5" rx="2" fill="#0f172a" />
        <rect x="44" y="9" width="5" height="17" rx="2" fill="#64748b" />
        <rect x="37" y="8" width="13" height="4" rx="2" fill="#94a3b8" />
      </svg>
    )
  }

  if (equipment === 'bike') {
    return (
      <svg width="58" height="42" viewBox="0 0 58 42" fill="none" aria-hidden>
        <circle cx="14" cy="30" r="8" stroke="#64748b" strokeWidth="3" />
        <circle cx="42" cy="30" r="8" stroke="#64748b" strokeWidth="3" />
        <path d="M14 30L25 22L31 30H42" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
        <path d="M24 14H32" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
      </svg>
    )
  }

  if (equipment === 'dumbbell') {
    return (
      <svg width="58" height="42" viewBox="0 0 58 42" fill="none" aria-hidden>
        <rect x="10" y="14" width="7" height="14" rx="2" fill="#64748b" />
        <rect x="17" y="18" width="24" height="6" rx="3" fill="#94a3b8" />
        <rect x="41" y="14" width="7" height="14" rx="2" fill="#64748b" />
      </svg>
    )
  }

  if (equipment === 'barbell') {
    return (
      <svg width="58" height="42" viewBox="0 0 58 42" fill="none" aria-hidden>
        <rect x="6" y="12" width="5" height="18" rx="2" fill="#64748b" />
        <rect x="11" y="16" width="4" height="10" rx="2" fill="#94a3b8" />
        <rect x="15" y="19" width="28" height="4" rx="2" fill="#cbd5e1" />
        <rect x="43" y="16" width="4" height="10" rx="2" fill="#94a3b8" />
        <rect x="47" y="12" width="5" height="18" rx="2" fill="#64748b" />
      </svg>
    )
  }

  if (equipment === 'cable') {
    return (
      <svg width="58" height="42" viewBox="0 0 58 42" fill="none" aria-hidden>
        <rect x="10" y="8" width="9" height="26" rx="2" fill="#334155" />
        <rect x="36" y="8" width="9" height="26" rx="2" fill="#334155" />
        <path d="M14.5 12H40.5" stroke="#94a3b8" strokeWidth="2.5" />
        <path d="M28 12V26" stroke="#cbd5e1" strokeWidth="2.5" />
        <circle cx="28" cy="29" r="3" fill="#94a3b8" />
      </svg>
    )
  }

  if (equipment === 'machine') {
    return (
      <svg width="58" height="42" viewBox="0 0 58 42" fill="none" aria-hidden>
        <rect x="10" y="8" width="6" height="26" rx="2" fill="#64748b" />
        <rect x="33" y="8" width="6" height="26" rx="2" fill="#64748b" />
        <rect x="16" y="13" width="17" height="4" rx="2" fill="#94a3b8" />
        <rect x="19" y="21" width="11" height="9" rx="2" fill="#334155" />
      </svg>
    )
  }

  if (equipment === 'bench') {
    return (
      <svg width="58" height="42" viewBox="0 0 58 42" fill="none" aria-hidden>
        <rect x="12" y="17" width="30" height="6" rx="3" fill="#94a3b8" />
        <rect x="16" y="23" width="5" height="10" rx="2" fill="#64748b" />
        <rect x="33" y="23" width="5" height="10" rx="2" fill="#64748b" />
      </svg>
    )
  }

  return (
    <svg width="58" height="42" viewBox="0 0 58 42" fill="none" aria-hidden>
      <circle cx="29" cy="12" r="5" fill="#94a3b8" />
      <rect x="25" y="18" width="8" height="14" rx="4" fill="#64748b" />
      <path d="M25 22L18 28" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
      <path d="M33 22L40 28" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

function MovementGraphicView({ movement }: { movement: MovementGraphic }) {
  if (movement === 'squat') {
    return (
      <svg width="210" height="140" viewBox="0 0 210 140" fill="none" aria-hidden>
        <rect x="0" y="0" width="210" height="140" rx="16" fill="#0f172a" />
        <circle cx="65" cy="38" r="10" fill="#cbd5e1" />
        <path d="M65 48V76L50 92" stroke="#94a3b8" strokeWidth="6" strokeLinecap="round" />
        <path d="M65 76L82 95" stroke="#94a3b8" strokeWidth="6" strokeLinecap="round" />
        <path d="M52 57H80" stroke="#94a3b8" strokeWidth="6" strokeLinecap="round" />
        <rect x="35" y="52" width="60" height="4" rx="2" fill="#38bdf8" />
        <circle cx="145" cy="38" r="10" fill="#cbd5e1" />
        <path d="M145 48V70L130 100" stroke="#22d3ee" strokeWidth="6" strokeLinecap="round" />
        <path d="M145 70L162 100" stroke="#22d3ee" strokeWidth="6" strokeLinecap="round" />
        <path d="M132 58H160" stroke="#22d3ee" strokeWidth="6" strokeLinecap="round" />
        <rect x="116" y="53" width="60" height="4" rx="2" fill="#38bdf8" />
      </svg>
    )
  }

  if (movement === 'run' || movement === 'cycle') {
    return (
      <svg width="210" height="140" viewBox="0 0 210 140" fill="none" aria-hidden>
        <rect x="0" y="0" width="210" height="140" rx="16" fill="#0f172a" />
        <rect x="20" y="98" width="170" height="8" rx="4" fill="#1e293b" />
        <circle cx="82" cy="43" r="10" fill="#cbd5e1" />
        <path d="M82 53L95 72L119 80" stroke="#22d3ee" strokeWidth="6" strokeLinecap="round" />
        <path d="M95 72L82 92" stroke="#22d3ee" strokeWidth="6" strokeLinecap="round" />
        <path d="M97 73L118 95" stroke="#22d3ee" strokeWidth="6" strokeLinecap="round" />
        <path d="M89 62L108 54" stroke="#22d3ee" strokeWidth="6" strokeLinecap="round" />
      </svg>
    )
  }

  if (movement === 'plank') {
    return (
      <svg width="210" height="140" viewBox="0 0 210 140" fill="none" aria-hidden>
        <rect x="0" y="0" width="210" height="140" rx="16" fill="#0f172a" />
        <rect x="20" y="98" width="170" height="8" rx="4" fill="#1e293b" />
        <circle cx="55" cy="82" r="8" fill="#cbd5e1" />
        <path d="M62 84H152" stroke="#22d3ee" strokeWidth="8" strokeLinecap="round" />
        <path d="M76 86L66 99" stroke="#22d3ee" strokeWidth="6" strokeLinecap="round" />
        <path d="M142 86L154 99" stroke="#22d3ee" strokeWidth="6" strokeLinecap="round" />
      </svg>
    )
  }

  if (movement === 'lunge') {
    return (
      <svg width="210" height="140" viewBox="0 0 210 140" fill="none" aria-hidden>
        <rect x="0" y="0" width="210" height="140" rx="16" fill="#0f172a" />
        <circle cx="95" cy="35" r="10" fill="#cbd5e1" />
        <path d="M95 45V73" stroke="#22d3ee" strokeWidth="6" strokeLinecap="round" />
        <path d="M95 73L74 100" stroke="#22d3ee" strokeWidth="6" strokeLinecap="round" />
        <path d="M95 73L126 97" stroke="#22d3ee" strokeWidth="6" strokeLinecap="round" />
        <path d="M82 57L112 57" stroke="#22d3ee" strokeWidth="6" strokeLinecap="round" />
      </svg>
    )
  }

  if (movement === 'row' || movement === 'pulldown') {
    return (
      <svg width="210" height="140" viewBox="0 0 210 140" fill="none" aria-hidden>
        <rect x="0" y="0" width="210" height="140" rx="16" fill="#0f172a" />
        <rect x="150" y="20" width="10" height="90" rx="3" fill="#334155" />
        <path d="M155 35H110" stroke="#64748b" strokeWidth="3" />
        <circle cx="90" cy="38" r="10" fill="#cbd5e1" />
        <path d="M90 48V76" stroke="#22d3ee" strokeWidth="6" strokeLinecap="round" />
        <path d="M90 76L76 100" stroke="#22d3ee" strokeWidth="6" strokeLinecap="round" />
        <path d="M90 76L103 100" stroke="#22d3ee" strokeWidth="6" strokeLinecap="round" />
        <path d="M98 58L120 45" stroke="#22d3ee" strokeWidth="6" strokeLinecap="round" />
      </svg>
    )
  }

  if (movement === 'hinge') {
    return (
      <svg width="210" height="140" viewBox="0 0 210 140" fill="none" aria-hidden>
        <rect x="0" y="0" width="210" height="140" rx="16" fill="#0f172a" />
        <circle cx="70" cy="42" r="10" fill="#cbd5e1" />
        <path d="M70 52L100 66" stroke="#22d3ee" strokeWidth="6" strokeLinecap="round" />
        <path d="M100 66L112 94" stroke="#22d3ee" strokeWidth="6" strokeLinecap="round" />
        <path d="M100 66L86 95" stroke="#22d3ee" strokeWidth="6" strokeLinecap="round" />
        <rect x="50" y="84" width="72" height="4" rx="2" fill="#38bdf8" />
      </svg>
    )
  }

  return (
    <svg width="210" height="140" viewBox="0 0 210 140" fill="none" aria-hidden>
      <rect x="0" y="0" width="210" height="140" rx="16" fill="#0f172a" />
      <circle cx="70" cy="35" r="10" fill="#cbd5e1" />
      <path d="M70 45V73" stroke="#22d3ee" strokeWidth="6" strokeLinecap="round" />
      <path d="M70 73L58 97" stroke="#22d3ee" strokeWidth="6" strokeLinecap="round" />
      <path d="M70 73L84 97" stroke="#22d3ee" strokeWidth="6" strokeLinecap="round" />
      <path d="M58 58H90" stroke="#22d3ee" strokeWidth="6" strokeLinecap="round" />
    </svg>
  )
}

const BODY_PART_CONFIG: Record<BodyPart, { label: string; color: string }> = {
  chest:     { label: 'Chest',     color: '#fb7185' },
  arms:      { label: 'Arms',      color: '#38bdf8' },
  shoulders: { label: 'Shoulders', color: '#fbbf24' },
  abdomen:   { label: 'Core / Abs', color: '#34d399' },
  thighs:    { label: 'Thighs',    color: '#a78bfa' },
  back:      { label: 'Back',      color: '#f97316' },
  cardio:    { label: 'Cardio',    color: '#22d3ee' },
}

function HumanBodyMap({
  selected,
  onToggle,
}: {
  selected: Set<BodyPart>
  onToggle: (part: BodyPart) => void
}) {
  const c = (part: BodyPart) => selected.has(part) ? BODY_PART_CONFIG[part].color : '#1e293b'
  const stroke = (part: BodyPart) => selected.has(part) ? BODY_PART_CONFIG[part].color : '#334155'
  const btn = (part: BodyPart): React.CSSProperties => ({
    cursor: 'pointer',
    outline: 'none',
    userSelect: 'none',
  })

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      {/* SVG body front view */}
      <svg
        width="120" height="260"
        viewBox="0 0 120 260"
        style={{ flexShrink: 0 }}
        aria-label="Human body map — tap a region to filter exercises"
      >
        {/* Head */}
        <circle cx="60" cy="22" r="16" fill="#1e293b" stroke="#334155" strokeWidth="1.5" />

        {/* Neck */}
        <rect x="53" y="37" width="14" height="12" fill="#1e293b" />

        {/* Shoulders (left + right, same zone) */}
        <rect x="10" y="46" width="26" height="16" rx="7"
          fill={c('shoulders')} stroke={stroke('shoulders')} strokeWidth="1.5"
          style={btn('shoulders')} onClick={() => onToggle('shoulders')} />
        <rect x="84" y="46" width="26" height="16" rx="7"
          fill={c('shoulders')} stroke={stroke('shoulders')} strokeWidth="1.5"
          style={btn('shoulders')} onClick={() => onToggle('shoulders')} />

        {/* Chest */}
        <rect x="36" y="49" width="48" height="36" rx="6"
          fill={c('chest')} stroke={stroke('chest')} strokeWidth="1.5"
          style={btn('chest')} onClick={() => onToggle('chest')} />

        {/* Upper arms */}
        <rect x="8" y="62" width="20" height="32" rx="8"
          fill={c('arms')} stroke={stroke('arms')} strokeWidth="1.5"
          style={btn('arms')} onClick={() => onToggle('arms')} />
        <rect x="92" y="62" width="20" height="32" rx="8"
          fill={c('arms')} stroke={stroke('arms')} strokeWidth="1.5"
          style={btn('arms')} onClick={() => onToggle('arms')} />

        {/* Forearms */}
        <rect x="10" y="96" width="16" height="28" rx="7"
          fill={c('arms')} stroke={stroke('arms')} strokeWidth="1.5"
          style={btn('arms')} onClick={() => onToggle('arms')} />
        <rect x="94" y="96" width="16" height="28" rx="7"
          fill={c('arms')} stroke={stroke('arms')} strokeWidth="1.5"
          style={btn('arms')} onClick={() => onToggle('arms')} />

        {/* Abdomen */}
        <rect x="36" y="85" width="48" height="40" rx="5"
          fill={c('abdomen')} stroke={stroke('abdomen')} strokeWidth="1.5"
          style={btn('abdomen')} onClick={() => onToggle('abdomen')} />

        {/* Hip bridge */}
        <rect x="34" y="125" width="52" height="18" rx="4" fill="#1e293b" stroke="#334155" strokeWidth="1" />

        {/* Left thigh */}
        <rect x="35" y="143" width="23" height="52" rx="9"
          fill={c('thighs')} stroke={stroke('thighs')} strokeWidth="1.5"
          style={btn('thighs')} onClick={() => onToggle('thighs')} />
        {/* Right thigh */}
        <rect x="62" y="143" width="23" height="52" rx="9"
          fill={c('thighs')} stroke={stroke('thighs')} strokeWidth="1.5"
          style={btn('thighs')} onClick={() => onToggle('thighs')} />

        {/* Shins */}
        <rect x="37" y="197" width="19" height="42" rx="7" fill="#1e293b" stroke="#334155" strokeWidth="1" />
        <rect x="64" y="197" width="19" height="42" rx="7" fill="#1e293b" stroke="#334155" strokeWidth="1" />

        {/* Feet */}
        <rect x="34" y="239" width="24" height="10" rx="4" fill="#1e293b" stroke="#334155" strokeWidth="1" />
        <rect x="62" y="239" width="24" height="10" rx="4" fill="#1e293b" stroke="#334155" strokeWidth="1" />
      </svg>

      {/* Body part buttons (for easy tap on mobile) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, flex: 1 }}>
        {(Object.entries(BODY_PART_CONFIG) as [BodyPart, { label: string; color: string }][]).map(([part, cfg]) => (
          <button
            key={part}
            onClick={() => onToggle(part)}
            style={{
              border: `1.5px solid ${selected.has(part) ? cfg.color : '#334155'}`,
              background: selected.has(part) ? `${cfg.color}22` : 'transparent',
              borderRadius: 10,
              padding: '7px 10px',
              textAlign: 'left',
              cursor: 'pointer',
              color: selected.has(part) ? cfg.color : '#94a3b8',
              fontSize: 13,
              fontWeight: selected.has(part) ? 700 : 500,
              display: 'flex',
              alignItems: 'center',
              gap: 7,
            }}
          >
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: cfg.color, display: 'inline-block', flexShrink: 0 }} />
            {cfg.label}
            {selected.has(part) && <span style={{ marginLeft: 'auto', fontSize: 10 }}>✓</span>}
          </button>
        ))}
        {selected.size > 0 && (
          <button
            onClick={() => onToggle('_clear' as BodyPart)}
            style={{ border: '1px solid #334155', background: 'transparent', borderRadius: 10, padding: '5px 10px', color: '#64748b', fontSize: 11, cursor: 'pointer' }}
          >
            Clear selection
          </button>
        )}
      </div>
    </div>
  )
}

const FREE_EXERCISE_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises'

function ExerciseGuideModal({ exercise, onClose }: { exercise: GymExerciseGuide; onClose: () => void }) {
  const [imgIndex, setImgIndex] = useState(0)
  const [imgError, setImgError] = useState(false)
  const [playing, setPlaying] = useState(true)

  const photoUrl = exercise.photoId && !imgError
    ? `${FREE_EXERCISE_BASE}/${exercise.photoId}/${imgIndex}.jpg`
    : null

  // Auto-loop between start (0) and end (1) with a 1.2s hold on each frame
  useEffect(() => {
    if (!exercise.photoId || imgError || !playing) return
    const timer = setInterval(() => {
      setImgIndex((prev) => (prev === 0 ? 1 : 0))
    }, 1200)
    return () => clearInterval(timer)
  }, [exercise.photoId, imgError, playing])

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(2, 6, 23, 0.88)', zIndex: 120, display: 'grid', alignItems: 'end' }}>
      <div style={{ background: '#111c2f', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 430, margin: '0 auto', padding: 16, maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 8 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#f8fafc' }}>{exercise.name}</div>
            <div style={{ marginTop: 3, fontSize: 12, color: '#94a3b8' }}>
              {equipmentLabel(exercise.equipment)} • {exercise.category} • {exercise.targetMuscles.join(', ')}
            </div>
          </div>
          <button onClick={onClose} style={{ background: '#1e293b', border: 'none', color: '#94a3b8', borderRadius: 10, padding: '6px 10px', cursor: 'pointer' }}>
            Close
          </button>
        </div>

        {/* Photo or SVG graphic */}
        <div style={{ marginTop: 12, borderRadius: 12, overflow: 'hidden', background: '#0f172a', position: 'relative' }}>
          {photoUrl ? (
            <>
              <img
                src={photoUrl}
                alt={`${exercise.name} ${imgIndex === 0 ? 'start' : 'end'} position`}
                onError={() => {
                  if (imgIndex === 0) {
                    setImgIndex(1)
                  } else {
                    setImgError(true)
                  }
                }}
                style={{ width: '100%', display: 'block', maxHeight: 220, objectFit: 'cover', transition: 'opacity 0.3s ease' }}
              />
              {/* Playback controls */}
              {!imgError && (
                <div style={{ position: 'absolute', bottom: 8, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 8px' }}>
                  {/* Start / End label */}
                  <span style={{ fontSize: 11, background: '#22d3ee', color: '#0b1120', borderRadius: 6, padding: '3px 8px', fontWeight: 700 }}>
                    {imgIndex === 0 ? 'Start' : 'End'}
                  </span>
                  {/* Play / Pause */}
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => setPlaying((p) => !p)}
                      style={{ border: 'none', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: 14, background: '#1e293b', color: playing ? '#facc15' : '#4ade80', minWidth: 36 }}
                    >{playing ? '⏸' : '▶'}</button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={{ display: 'grid', placeItems: 'center', padding: 20 }}>
              <MovementGraphicView movement={exercise.graphic} />
            </div>
          )}
        </div>

        <div style={{ marginTop: 10, fontSize: 12, color: '#94a3b8' }}>{exercise.overview}</div>

        <div style={{ marginTop: 12, fontSize: 12, color: '#64748b' }}>How to do it</div>
        {exercise.steps.map((step, index) => (
          <div key={`${exercise.id}-step-${index}`} style={{ marginTop: 6, fontSize: 13, color: '#e2e8f0' }}>
            {index + 1}. {step}
          </div>
        ))}

        <div style={{ marginTop: 12, fontSize: 12, color: '#64748b' }}>Coaching tips</div>
        {exercise.tips.map((tip, index) => (
          <div key={`${exercise.id}-tip-${index}`} style={{ marginTop: 6, fontSize: 13, color: '#cbd5e1' }}>
            • {tip}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ExercisePlanner({
  dateKey,
  workoutProgress,
  gymActivities,
  customSchedule,
  onUpdateProgress,
  onAddActivity,
  onDeleteActivity,
  onAddToSchedule,
  onRemoveFromSchedule,
}: ExercisePlannerProps) {
  const plan = useMemo(() => getWorkoutPlanForDate(dateKey), [dateKey])

  const progressById = useMemo(() => {
    const map = new Map<string, WorkoutProgress>()
    for (const item of workoutProgress[dateKey] ?? []) {
      map.set(item.exerciseId, item)
    }
    return map
  }, [workoutProgress, dateKey])

  const activitiesToday = gymActivities[dateKey] ?? []

  const [viewMode, setViewMode] = useState<'schedule' | 'library' | 'bodymap'>('schedule')
  const [librarySearch, setLibrarySearch] = useState('')
  const [libraryCategory, setLibraryCategory] = useState<ExerciseCategory | 'all'>('all')
  const [libraryEquipment, setLibraryEquipment] = useState<ExerciseEquipment | 'all'>('all')
  const [selectedExercise, setSelectedExercise] = useState<GymExerciseGuide | null>(null)

  // Body map state
  const [selectedBodyParts, setSelectedBodyParts] = useState<Set<BodyPart>>(new Set())
  const [selectedForSchedule, setSelectedForSchedule] = useState<Set<string>>(new Set())

  const [activityName, setActivityName] = useState('')
  const [activityCategory, setActivityCategory] = useState<ExerciseCategory>('strength')
  const [activityDuration, setActivityDuration] = useState('45')
  const [activityCalories, setActivityCalories] = useState('250')
  const [activityNotes, setActivityNotes] = useState('')

  const completedCount = plan.exercises.filter((exercise) => progressById.get(exercise.id)?.completed).length
  const completionRatio = completedCount / Math.max(plan.exercises.length, 1)

  const plannedMinutes = plan.exercises.reduce((sum, exercise) => {
    const liftingEstimate = (exercise.sets || 0) * 3
    return sum + (exercise.durationMin || liftingEstimate)
  }, 0)

  const loggedMinutes = activitiesToday.reduce((sum, activity) => sum + activity.durationMin, 0)
  const loggedCalories = activitiesToday.reduce((sum, activity) => sum + activity.caloriesBurned, 0)

  const libraryExercises = useMemo(() => {
    const query = librarySearch.trim().toLowerCase()
    return GYM_EXERCISE_LIBRARY.filter((exercise) => {
      if (libraryCategory !== 'all' && exercise.category !== libraryCategory) return false
      if (libraryEquipment !== 'all' && exercise.equipment !== libraryEquipment) return false
      if (!query) return true
      return (
        exercise.name.toLowerCase().includes(query) ||
        exercise.targetMuscles.some((muscle) => muscle.toLowerCase().includes(query))
      )
    })
  }, [librarySearch, libraryCategory, libraryEquipment])

  const bodyMapExercises = useMemo(() => {
    if (selectedBodyParts.size === 0) return GYM_EXERCISE_LIBRARY
    return GYM_EXERCISE_LIBRARY.filter((ex) =>
      ex.bodyParts.some((part) => selectedBodyParts.has(part))
    )
  }, [selectedBodyParts])

  const customExerciseIds = customSchedule[dateKey] ?? []
  const customExercises = GYM_EXERCISE_LIBRARY.filter((ex) => customExerciseIds.includes(ex.id))

  function toggleBodyPart(part: BodyPart) {
    setSelectedBodyParts((prev) => {
      const next = new Set(prev)
      if (next.has(part)) next.delete(part)
      else next.add(part)
      return next
    })
    setSelectedForSchedule(new Set())
  }

  function clearBodyParts() {
    setSelectedBodyParts(new Set())
    setSelectedForSchedule(new Set())
  }

  function toggleScheduleSelection(id: string) {
    setSelectedForSchedule((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function commitToSchedule() {
    if (selectedForSchedule.size === 0) return
    onAddToSchedule(dateKey, Array.from(selectedForSchedule))
    setSelectedForSchedule(new Set())
  }

  function handleAddActivity() {
    const durationMin = Number(activityDuration)
    const caloriesBurned = Number(activityCalories)

    if (!activityName.trim() || !Number.isFinite(durationMin) || durationMin <= 0) {
      return
    }

    onAddActivity({
      name: activityName.trim(),
      category: activityCategory,
      durationMin,
      caloriesBurned: Number.isFinite(caloriesBurned) && caloriesBurned > 0 ? caloriesBurned : 0,
      notes: activityNotes.trim() || undefined,
    })

    setActivityName('')
    setActivityDuration('45')
    setActivityCalories('250')
    setActivityNotes('')
  }

  const panelStyle = {
    background: '#131e30',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
  }

  const inputStyle = {
    width: '100%',
    boxSizing: 'border-box' as const,
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: 12,
    color: '#e2e8f0',
    padding: '10px 14px',
    fontSize: 14,
    outline: 'none',
  }

  const chipStyle = (active: boolean, tint = '#22d3ee') => ({
    background: active ? tint : 'transparent',
    border: `1px solid ${active ? tint : '#334155'}`,
    borderRadius: 999,
    color: active ? '#0b1120' : '#cbd5e1',
    padding: '7px 12px',
    fontSize: 12,
    cursor: 'pointer',
    fontWeight: active ? 700 : 500,
  })

  return (
    <>
      {selectedExercise && <ExerciseGuideModal exercise={selectedExercise} onClose={() => setSelectedExercise(null)} />}

      <section style={panelStyle}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <button style={chipStyle(viewMode === 'schedule')} onClick={() => setViewMode('schedule')}>Today Schedule</button>
          <button style={chipStyle(viewMode === 'bodymap', '#a78bfa')} onClick={() => setViewMode('bodymap')}>Body Map</button>
          <button style={chipStyle(viewMode === 'library', '#4ade80')} onClick={() => setViewMode('library')}>Full Library</button>
        </div>

        {viewMode === 'schedule' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
              <div>
                <div style={{ fontSize: 11, color: '#64748b', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Today&apos;s workout</div>
                <div style={{ marginTop: 3, fontWeight: 700, fontSize: 20, color: '#f8fafc' }}>{plan.title}</div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{plan.focus}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#22d3ee' }}>{Math.round(completionRatio * 100)}%</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>completed</div>
              </div>
            </div>

            <div style={{ marginTop: 12, background: '#0f172a', borderRadius: 999, height: 9, overflow: 'hidden' }}>
              <div style={{ width: `${Math.round(completionRatio * 100)}%`, height: '100%', background: 'linear-gradient(90deg, #0891b2, #22d3ee)' }} />
            </div>

            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b' }}>
              <span>Warmup: {plan.warmup}</span>
              <span>Planned: {plannedMinutes} min</span>
            </div>
          </>
        )}

        {viewMode === 'library' && (
          <>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Choose any exercise to open full graphical form guide.</div>
            <input
              value={librarySearch}
              onChange={(event) => setLibrarySearch(event.target.value)}
              placeholder="Search by name or muscle..."
              style={{ ...inputStyle, marginBottom: 8 }}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <select style={inputStyle} value={libraryCategory} onChange={(event) => setLibraryCategory(event.target.value as ExerciseCategory | 'all')}>
                <option value="all">All categories</option>
                <option value="strength">Strength</option>
                <option value="cardio">Cardio</option>
                <option value="mobility">Mobility</option>
                <option value="sports">Sports</option>
              </select>
              <select style={inputStyle} value={libraryEquipment} onChange={(event) => setLibraryEquipment(event.target.value as ExerciseEquipment | 'all')}>
                <option value="all">All equipment</option>
                <option value="barbell">Barbell</option>
                <option value="dumbbell">Dumbbell</option>
                <option value="cable">Cable</option>
                <option value="machine">Machine</option>
                <option value="bench">Bench</option>
                <option value="bodyweight">Bodyweight</option>
                <option value="treadmill">Treadmill</option>
                <option value="bike">Bike</option>
              </select>
            </div>
          </>
        )}

        {viewMode === 'bodymap' && (
          <>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10 }}>
              Tap a body region or a button to filter exercises. Select exercises then add them to today's schedule.
            </div>
            <HumanBodyMap
              selected={selectedBodyParts}
              onToggle={(part) => {
                if ((part as string) === '_clear') { clearBodyParts(); return }
                toggleBodyPart(part)
              }}
            />
            {selectedBodyParts.size > 0 && (
              <button
                onClick={clearBodyParts}
                style={{ marginTop: 10, border: '1px solid #334155', background: 'transparent', borderRadius: 10, padding: '6px 10px', color: '#64748b', fontSize: 11, cursor: 'pointer' }}
              >
                Clear all
              </button>
            )}
          </>
        )}
      </section>

      <section style={panelStyle}>
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>
          {viewMode === 'schedule'
            ? 'Equipment-guided workout cards (tap for visual how-to)'
            : viewMode === 'bodymap'
            ? `Exercises for selected muscle groups (${bodyMapExercises.length})`
            : `Gym exercise options (${libraryExercises.length})`}
        </div>

        {/* Floating "Add to schedule" bar in body map mode */}
        {viewMode === 'bodymap' && selectedForSchedule.size > 0 && (
          <button
            onClick={commitToSchedule}
            style={{ width: '100%', border: 'none', background: 'linear-gradient(135deg, #7c3aed, #a78bfa)', color: '#fff', borderRadius: 12, padding: '11px 12px', fontWeight: 700, cursor: 'pointer', marginBottom: 12 }}
          >
            Add {selectedForSchedule.size} exercise{selectedForSchedule.size > 1 ? 's' : ''} to Today's Schedule
          </button>
        )}

        {(viewMode === 'schedule' ? [...plan.exercises, ...customExercises.map(ex => ({ ...ex, isCustom: true }))] : viewMode === 'bodymap' ? bodyMapExercises : libraryExercises).map((exercise) => {
          const guide = GYM_EXERCISE_LIBRARY.find((item) => item.id === exercise.id || item.name.toLowerCase() === exercise.name.toLowerCase())
          const progress = progressById.get(exercise.id)
          const category = 'category' in exercise ? exercise.category : (guide?.category ?? 'strength')
          const categoryTint = categoryColor(category)
          const isCustom = 'isCustom' in exercise && exercise.isCustom
          const isSelectedForSchedule = selectedForSchedule.has(exercise.id)
          const bodyParts = guide?.bodyParts ?? []

          return (
            <article
              key={exercise.id}
              onClick={() => { if (guide) setSelectedExercise(guide) }}
              style={{ border: `1px solid ${viewMode === 'bodymap' && isSelectedForSchedule ? '#a78bfa' : '#1e293b'}`, borderRadius: 16, padding: 12, marginBottom: 10, background: viewMode === 'bodymap' && isSelectedForSchedule ? '#1e1338' : '#0f172a', cursor: guide ? 'pointer' : 'default' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ background: '#111827', borderRadius: 12, width: 62, height: 46, display: 'grid', placeItems: 'center', border: '1px solid #1f2937' }}>
                    <EquipmentGraphic equipment={exercise.equipment} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>
                      {exercise.name}
                      {isCustom && <span style={{ marginLeft: 6, fontSize: 10, background: '#7c3aed33', color: '#a78bfa', borderRadius: 6, padding: '2px 6px' }}>Added</span>}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                      {equipmentLabel(exercise.equipment)} • {exercise.targetMuscles.join(', ')}
                    </div>
                  </div>
                </div>
                {guide && <div style={{ fontSize: 18, color: '#334155' }}>›</div>}
              </div>

              {/* Body part tags in body map and library modes */}
              {viewMode !== 'schedule' && bodyParts.length > 0 && (
                <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {bodyParts.map((part) => (
                    <span key={part} style={{ fontSize: 10, borderRadius: 999, padding: '3px 8px', background: `${BODY_PART_CONFIG[part].color}22`, color: BODY_PART_CONFIG[part].color, border: `1px solid ${BODY_PART_CONFIG[part].color}55` }}>
                      {BODY_PART_CONFIG[part].label}
                    </span>
                  ))}
                </div>
              )}

              <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {'sets' in exercise && exercise.sets && <span style={{ fontSize: 11, background: '#13233b', borderRadius: 999, padding: '4px 9px', color: '#93c5fd' }}>{exercise.sets} sets</span>}
                {'reps' in exercise && exercise.reps && <span style={{ fontSize: 11, background: '#2b1d3b', borderRadius: 999, padding: '4px 9px', color: '#d8b4fe' }}>{exercise.reps} reps</span>}
                {'durationMin' in exercise && exercise.durationMin && <span style={{ fontSize: 11, background: '#1f2937', borderRadius: 999, padding: '4px 9px', color: '#67e8f9' }}>{exercise.durationMin} min</span>}
                {'restSec' in exercise && exercise.restSec && <span style={{ fontSize: 11, background: '#193127', borderRadius: 999, padding: '4px 9px', color: '#6ee7b7' }}>{exercise.restSec}s rest</span>}
                <span style={{ fontSize: 11, background: '#111827', borderRadius: 999, padding: '4px 9px', color: categoryTint, border: `1px solid ${categoryTint}55` }}>{category}</span>

                {/* In body map mode: checkbox to select for schedule */}
                {viewMode === 'bodymap' && (
                  <label
                    onClick={(e) => e.stopPropagation()}
                    style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: isSelectedForSchedule ? '#a78bfa' : '#64748b', cursor: 'pointer' }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelectedForSchedule}
                      onChange={() => toggleScheduleSelection(exercise.id)}
                    />
                    Add
                  </label>
                )}
              </div>

              {viewMode === 'schedule' && !isCustom && (
                <label onClick={(e) => e.stopPropagation()} style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#cbd5e1' }}>
                  <input
                    type="checkbox"
                    checked={Boolean(progress?.completed)}
                    onChange={(event) =>
                      onUpdateProgress({
                        exerciseId: exercise.id,
                        completed: event.target.checked,
                        setsDone: progress?.setsDone,
                        repsDone: progress?.repsDone,
                        durationDoneMin: progress?.durationDoneMin,
                        notes: progress?.notes,
                      })
                    }
                  />
                  Done today
                </label>
              )}

              {viewMode === 'schedule' && isCustom && (
                <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#cbd5e1' }}>
                    <input
                      type="checkbox"
                      checked={Boolean(progress?.completed)}
                      onChange={(event) =>
                        onUpdateProgress({
                          exerciseId: exercise.id,
                          completed: event.target.checked,
                        })
                      }
                    />
                    Done today
                  </label>
                  <button
                    onClick={() => onRemoveFromSchedule(dateKey, exercise.id)}
                    style={{ border: 'none', background: 'transparent', color: '#64748b', fontSize: 11, cursor: 'pointer', padding: '4px 8px' }}
                  >
                    Remove
                  </button>
                </div>
              )}

              {'instructions' in exercise && viewMode === 'schedule' && !isCustom && (
                <div style={{ marginTop: 10, fontSize: 12, color: '#94a3b8' }}>{exercise.instructions}</div>
              )}
            </article>
          )
        })}

        {viewMode === 'schedule' && <div style={{ marginTop: 6, fontSize: 12, color: '#64748b' }}>Cooldown: {plan.cooldown}</div>}
      </section>

      <section style={panelStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
          <div style={{ background: '#0f172a', borderRadius: 12, padding: 10 }}>
            <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase' }}>Completed</div>
            <div style={{ marginTop: 4, fontSize: 20, fontWeight: 700, color: '#22d3ee' }}>{completedCount}/{plan.exercises.length}</div>
          </div>
          <div style={{ background: '#0f172a', borderRadius: 12, padding: 10 }}>
            <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase' }}>Gym minutes</div>
            <div style={{ marginTop: 4, fontSize: 20, fontWeight: 700, color: '#34d399' }}>{loggedMinutes}</div>
          </div>
          <div style={{ background: '#0f172a', borderRadius: 12, padding: 10 }}>
            <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase' }}>Burned</div>
            <div style={{ marginTop: 4, fontSize: 20, fontWeight: 700, color: '#fb7185' }}>{loggedCalories}</div>
          </div>
        </div>

        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Track gym activity</div>
        <input
          style={{ ...inputStyle, marginBottom: 8 }}
          value={activityName}
          onChange={(event) => setActivityName(event.target.value)}
          placeholder="Activity name (example: Leg day circuit)"
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
          <select style={inputStyle} value={activityCategory} onChange={(event) => setActivityCategory(event.target.value as ExerciseCategory)}>
            <option value="strength">Strength</option>
            <option value="cardio">Cardio</option>
            <option value="mobility">Mobility</option>
            <option value="sports">Sports</option>
          </select>
          <input
            style={inputStyle}
            type="number"
            min="1"
            value={activityDuration}
            onChange={(event) => setActivityDuration(event.target.value)}
            placeholder="Duration (min)"
          />
        </div>
        <input
          style={{ ...inputStyle, marginBottom: 8 }}
          type="number"
          min="0"
          value={activityCalories}
          onChange={(event) => setActivityCalories(event.target.value)}
          placeholder="Calories burned"
        />
        <textarea
          style={{ ...inputStyle, minHeight: 72, resize: 'vertical', marginBottom: 8 }}
          value={activityNotes}
          onChange={(event) => setActivityNotes(event.target.value)}
          placeholder="Notes (optional)"
        />
        <button
          onClick={handleAddActivity}
          style={{ width: '100%', border: 'none', background: 'linear-gradient(135deg, #16a34a, #4ade80)', color: '#052e16', borderRadius: 12, padding: '10px 12px', fontWeight: 700, cursor: 'pointer' }}
        >
          Save Activity Locally
        </button>

        <div style={{ marginTop: 14 }}>
          {activitiesToday.length === 0 && <div style={{ fontSize: 12, color: '#64748b' }}>No gym activities logged for today.</div>}
          {activitiesToday.map((activity) => (
            <div key={activity.id} style={{ borderTop: '1px solid #1e293b', padding: '10px 0', display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <div>
                <div style={{ fontSize: 13, color: '#e2e8f0' }}>{activity.name}</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                  {activity.category} • {activity.durationMin} min • {activity.caloriesBurned} kcal
                </div>
                {activity.notes && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{activity.notes}</div>}
              </div>
              <button
                onClick={() => onDeleteActivity(activity.id)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 18, alignSelf: 'flex-start' }}
                aria-label="Delete activity"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
