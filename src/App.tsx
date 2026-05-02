import { useEffect, useMemo, useState } from 'react'
import AdminPanel from './components/AdminPanel'
import { MacroBar, RingChart } from './components/charts'
import ExercisePlanner from './components/ExercisePlanner'
import LoginForm from './components/LoginForm'
import ScanFoodModal from './components/ScanFoodModal'
import UserProfile from './components/UserProfile'
import { BASE_FOOD_DB } from './data/foodDb'
import { deleteAccount, getSessionUser, listAccounts, login, logout, registerAccount, syncAccountsFromCloud, syncAccountsToCloud, updateAccountProfile } from './services/auth'
import { predictFoodsWithAI, rankFoodResults, searchFoodsFromPublicRepo } from './services/foodSearch'
import { loadTrackerState, pullTrackerStateFromCloud, pushTrackerStateToCloud, saveTrackerState } from './services/storage'
import type {
  Food,
  FoodSearchResult,
  GymActivity,
  GymActivityByDate,
  LogByDate,
  MealName,
  RegisterAccountInput,
  SessionUser,
  TabName,
  UserAccount,
  UserProfile as UserProfileType,
  WeightEntry,
  WorkoutProgress,
  WorkoutProgressByDate,
} from './types'

const MEALS: MealName[] = ['Breakfast', 'Lunch', 'Dinner', 'Snacks']

function getTodayKey(): string {
  return new Date().toISOString().split('T')[0]
}

function getLast7Days(): string[] {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - index))
    return date.toISOString().split('T')[0]
  })
}

function formatDate(key: string): string {
  return new Date(`${key}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function dedupeSearchResults(results: FoodSearchResult[]): FoodSearchResult[] {
  const seen = new Set<string>()
  return results.filter((item) => {
    const key = item.name.trim().toLowerCase()
    if (!key || seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

function isLikelyEnglishName(name: string): boolean {
  const compact = name.replace(/\s+/g, '')
  if (compact.length < 3) {
    return false
  }

  const asciiChars = (compact.match(/[\x00-\x7F]/g) || []).length
  const latinLetters = (compact.match(/[A-Za-z]/g) || []).length
  const asciiRatio = asciiChars / compact.length

  return asciiRatio >= 0.85 && latinLetters >= 3
}

function tabLabel(tab: TabName): string {
  if (tab === 'today') return 'Today'
  if (tab === 'log') return 'Log'
  if (tab === 'history') return 'History'
  if (tab === 'exercise') return 'Exercise'
  if (tab === 'profile') return 'Profile'
  return 'Admin'
}

function App() {
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(() => getSessionUser())
  const [accounts, setAccounts] = useState<UserAccount[]>(() => listAccounts())
  const [tab, setTab] = useState<TabName>('today')
  const [goal, setGoal] = useState(1800)
  const [goalInput, setGoalInput] = useState('1800')
  const [editingGoal, setEditingGoal] = useState(false)
  const [log, setLog] = useState<LogByDate>({})
  const [customFoods, setCustomFoods] = useState<Food[]>([])
  const [workoutProgress, setWorkoutProgress] = useState<WorkoutProgressByDate>({})
  const [gymActivities, setGymActivities] = useState<GymActivityByDate>({})
  const [customSchedule, setCustomSchedule] = useState<Record<string, string[]>>({})
  const [userProfile, setUserProfile] = useState<UserProfileType>({
    name: '', age: null, heightCm: null, weightKg: null, sex: null, photoDataUrl: null,
  })
  const [weightLog, setWeightLog] = useState<WeightEntry[]>([])
  const [selectedMeal, setSelectedMeal] = useState<MealName>('Breakfast')
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<FoodSearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchStatus, setSearchStatus] = useState('')
  const [strictEnglishOnly, setStrictEnglishOnly] = useState(true)
  const [searchTelemetry, setSearchTelemetry] = useState({
    totalSearches: 0,
    lastLatencyMs: 0,
    liveHits: 0,
    memoryHits: 0,
    persistentHits: 0,
  })
  const [addAmount, setAddAmount] = useState('1')
  const [addMode, setAddMode] = useState<'servings' | 'grams'>('servings')
  const [customName, setCustomName] = useState('')
  const [customCalories, setCustomCalories] = useState('')
  const [customProtein, setCustomProtein] = useState('')
  const [customCarbs, setCustomCarbs] = useState('')
  const [customFat, setCustomFat] = useState('')
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [showScanModal, setShowScanModal] = useState(false)
  const [addToast, setAddToast] = useState('')

  const today = getTodayKey()

  useEffect(() => {
    // Pull latest account list snapshot from cloud (if available).
    void (async () => {
      const cloudAccounts = await syncAccountsFromCloud()
      if (cloudAccounts) {
        setAccounts(cloudAccounts)
      }
    })()
  }, [])

  useEffect(() => {
    if (!sessionUser) return
    const trackerState = loadTrackerState(sessionUser.email)
    setGoal(trackerState.goal)
    setGoalInput(String(trackerState.goal))
    setLog(trackerState.log)
    setCustomFoods(trackerState.customFoods)
    setWorkoutProgress(trackerState.workoutProgress)
    setGymActivities(trackerState.gymActivities)
    setCustomSchedule(trackerState.customSchedule ?? {})
    setUserProfile(trackerState.userProfile ?? { name: '', age: null, heightCm: null, weightKg: null, sex: null, photoDataUrl: null })
    setWeightLog(trackerState.weightLog ?? [])

    // Hydrate from cloud snapshot and override local state if found.
    void (async () => {
      const cloudState = await pullTrackerStateFromCloud(sessionUser.email)
      if (!cloudState) return

      setGoal(cloudState.goal)
      setGoalInput(String(cloudState.goal))
      setLog(cloudState.log)
      setCustomFoods(cloudState.customFoods)
      setWorkoutProgress(cloudState.workoutProgress)
      setGymActivities(cloudState.gymActivities)
      setCustomSchedule(cloudState.customSchedule ?? {})
      setUserProfile(cloudState.userProfile ?? { name: '', age: null, heightCm: null, weightKg: null, sex: null, photoDataUrl: null })
      setWeightLog(cloudState.weightLog ?? [])
    })()
  }, [sessionUser])

  useEffect(() => {
    if (!sessionUser) return
    const nextState = { goal, log, customFoods, workoutProgress, gymActivities, customSchedule, userProfile, weightLog }
    saveTrackerState(nextState, sessionUser.email)
    void pushTrackerStateToCloud(nextState, sessionUser.email)
  }, [goal, log, customFoods, workoutProgress, gymActivities, customSchedule, userProfile, weightLog, sessionUser])

  useEffect(() => {
    if (tab === 'admin' && sessionUser?.role !== 'admin') {
      setTab('today')
    }
  }, [tab, sessionUser])

  useEffect(() => {
    if (!addToast) return
    const timer = window.setTimeout(() => setAddToast(''), 1300)
    return () => window.clearTimeout(timer)
  }, [addToast])

  const foodDb = useMemo(() => [...BASE_FOOD_DB, ...customFoods], [customFoods])

  useEffect(() => {
    const query = search.trim()
    if (!query) {
      setSearchResults([])
      setSearchStatus('')
      setSearchLoading(false)
      return
    }

    let cancelled = false
    const timer = window.setTimeout(async () => {
      const startedAt = performance.now()
      const localMatches: FoodSearchResult[] = foodDb
        .filter((food) => food.name.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 4)
        .map((food) => ({ ...food, source: 'local' }))

      setSearchLoading(true)

      const [publicResult, aiResult] = await Promise.allSettled([
        searchFoodsFromPublicRepo(query),
        predictFoodsWithAI(query),
      ])

      if (cancelled) {
        return
      }

      const publicMatches = publicResult.status === 'fulfilled' ? publicResult.value : []
      const aiMatches = aiResult.status === 'fulfilled' ? aiResult.value : []
      const mergedCandidates = dedupeSearchResults([...localMatches, ...publicMatches, ...aiMatches])
      const filteredCandidates = strictEnglishOnly
        ? mergedCandidates.filter((item) => isLikelyEnglishName(item.name))
        : mergedCandidates

      const merged = rankFoodResults(query, filteredCandidates).slice(0, 10)

      const currentHits = merged.reduce(
        (acc, item) => {
          if (item.cacheStatus === 'live') {
            acc.live += 1
          } else if (item.cacheStatus === 'cache-memory') {
            acc.memory += 1
          } else if (item.cacheStatus === 'cache-storage') {
            acc.persistent += 1
          }
          return acc
        },
        { live: 0, memory: 0, persistent: 0 },
      )

      setSearchTelemetry((previous) => ({
        totalSearches: previous.totalSearches + 1,
        lastLatencyMs: Math.round(performance.now() - startedAt),
        liveHits: previous.liveHits + currentHits.live,
        memoryHits: previous.memoryHits + currentHits.memory,
        persistentHits: previous.persistentHits + currentHits.persistent,
      }))

      setSearchResults(merged)
      setSearchLoading(false)

      const englishTag = strictEnglishOnly ? ' (English only)' : ''
      if (publicMatches.length > 0 && aiMatches.length > 0) {
        setSearchStatus(`Live public + AI matches${englishTag}`)
      } else if (publicMatches.length > 0) {
        setSearchStatus(`Live public matches${englishTag}`)
      } else if (aiMatches.length > 0) {
        setSearchStatus(`AI predicted matches${englishTag}`)
      } else if (localMatches.length > 0) {
        setSearchStatus(`Local matches${englishTag}`)
      } else {
        setSearchStatus('No matches found')
      }
    }, 300)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [foodDb, search, strictEnglishOnly])

  const todayEntries = log[today] ?? {}
  const allEntries = MEALS.flatMap((meal) => todayEntries[meal] ?? [])
  const totalCalories = allEntries.reduce((sum, entry) => sum + entry.calories, 0)
  const totalProtein = allEntries.reduce((sum, entry) => sum + (entry.protein || 0), 0)
  const totalCarbs = allEntries.reduce((sum, entry) => sum + (entry.carbs || 0), 0)
  const totalFat = allEntries.reduce((sum, entry) => sum + (entry.fat || 0), 0)

  const historyData = getLast7Days().map((day) => {
    const entries = Object.values(log[day] ?? {}).flat()
    const calories = entries.reduce((sum, entry) => sum + entry.calories, 0)
    return { day, calories }
  })

  const maxHistoryCalories = Math.max(goal, ...historyData.map((entry) => entry.calories), 1)

  function handleLogin(email: string, password: string): SessionUser | null {
    const session = login(email, password)
    setSessionUser(session)
    const nextAccounts = listAccounts()
    setAccounts(nextAccounts)
    void syncAccountsToCloud(nextAccounts)
    return session
  }

  function handleRegister(input: RegisterAccountInput): { session: SessionUser | null; error?: string } {
    const created = registerAccount(input, 'user')
    if (!created.ok) {
      return { session: null, error: created.error }
    }

    const session = login(input.email, input.password)
    setSessionUser(session)
    const nextAccounts = listAccounts()
    setAccounts(nextAccounts)
    void syncAccountsToCloud(nextAccounts)
    return { session }
  }

  function handleLogout() {
    logout()
    setSessionUser(null)
    setTab('today')
  }

  function addFood(food: Food, meal: MealName = selectedMeal) {
    setLog((previousLog) => {
      const dayLog = previousLog[today] ?? {}
      const mealEntries = dayLog[meal] ?? []

      return {
        ...previousLog,
        [today]: {
          ...dayLog,
          [meal]: [...mealEntries, { ...food, id: Date.now() + Math.floor(Math.random() * 1000) }],
        },
      }
    })

    setSearch('')
    setSearchResults([])
    setSearchStatus('')
  }

  function addFoodWithToast(food: Food, meal: MealName = selectedMeal) {
    addFood(food, meal)
    setAddToast(`Added ${food.name}`)
  }

  function withNormalizedAmount(food: FoodSearchResult): Food {
    const rawAmount = Number(addAmount)
    const amount = Number.isFinite(rawAmount) && rawAmount > 0 ? rawAmount : 1

    const factor =
      addMode === 'servings'
        ? amount
        : food.source === 'public'
          ? amount / 100
          : amount

    const suffix =
      addMode === 'servings'
        ? amount === 1
          ? ''
          : ` x${amount}`
        : food.source === 'public'
          ? ` (${amount}g)`
          : ` x${amount}`

    return {
      name: `${food.name}${suffix}`,
      calories: Math.max(0, Math.round(food.calories * factor)),
      protein: Math.max(0, Math.round(food.protein * factor * 10) / 10),
      carbs: Math.max(0, Math.round(food.carbs * factor * 10) / 10),
      fat: Math.max(0, Math.round(food.fat * factor * 10) / 10),
    }
  }

  function removeEntry(meal: MealName, id: number) {
    setLog((previousLog) => {
      const dayLog = previousLog[today] ?? {}

      return {
        ...previousLog,
        [today]: {
          ...dayLog,
          [meal]: (dayLog[meal] ?? []).filter((entry) => entry.id !== id),
        },
      }
    })
  }

  function handleTodayMealTap(meal: MealName) {
    setSelectedMeal(meal)
    // Briefly show selection highlight before opening Log tab.
    window.setTimeout(() => setTab('log'), 140)
  }

  function handleGoalSave() {
    const nextGoal = Number(goalInput)
    if (!Number.isFinite(nextGoal) || nextGoal <= 0) {
      setGoalInput(String(goal))
      setEditingGoal(false)
      return
    }

    setGoal(nextGoal)
    setEditingGoal(false)
  }

  function handleCustomFoodAdd() {
    if (!customName.trim() || !customCalories.trim()) {
      return
    }

    addFood({
      name: customName.trim(),
      calories: Number(customCalories),
      protein: Number(customProtein) || 0,
      carbs: Number(customCarbs) || 0,
      fat: Number(customFat) || 0,
    })

    setCustomName('')
    setCustomCalories('')
    setCustomProtein('')
    setCustomCarbs('')
    setCustomFat('')
    setShowCustomForm(false)
  }

  function addCustomCatalogFood(food: Food) {
    setCustomFoods((previous) => [...previous, food])
  }

  function removeCustomCatalogFood(index: number) {
    setCustomFoods((previous) => previous.filter((_, currentIndex) => currentIndex !== index))
  }

  function upsertWorkoutProgress(entry: WorkoutProgress) {
    setWorkoutProgress((previous) => {
      const current = previous[today] ?? []
      const next = [...current]
      const index = next.findIndex((item) => item.exerciseId === entry.exerciseId)

      if (index >= 0) {
        next[index] = entry
      } else {
        next.push(entry)
      }

      return {
        ...previous,
        [today]: next,
      }
    })
  }

  function addGymActivity(activity: Omit<GymActivity, 'id' | 'loggedAt'>) {
    const nextActivity: GymActivity = {
      ...activity,
      id: Date.now() + Math.floor(Math.random() * 1000),
      loggedAt: new Date().toISOString(),
    }

    setGymActivities((previous) => {
      const dayActivities = previous[today] ?? []
      return {
        ...previous,
        [today]: [nextActivity, ...dayActivities],
      }
    })
  }

  function removeGymActivity(activityId: number) {
    setGymActivities((previous) => {
      const dayActivities = previous[today] ?? []
      return {
        ...previous,
        [today]: dayActivities.filter((item) => item.id !== activityId),
      }
    })
  }

  function addToCustomSchedule(dateKey: string, exerciseIds: string[]) {
    setCustomSchedule((previous) => ({
      ...previous,
      [dateKey]: [...new Set([...(previous[dateKey] ?? []), ...exerciseIds])],
    }))
  }

  function removeFromCustomSchedule(dateKey: string, exerciseId: string) {
    setCustomSchedule((previous) => ({
      ...previous,
      [dateKey]: (previous[dateKey] ?? []).filter((id) => id !== exerciseId),
    }))
  }

  if (!sessionUser) {
    return <LoginForm onLogin={handleLogin} onRegister={handleRegister} />
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

  const chipButtonStyle = (active: boolean, color = '#22d3ee') => ({
    background: active ? color : 'transparent',
    border: `1px solid ${active ? color : '#334155'}`,
    borderRadius: 999,
    color: active ? '#0b1120' : '#94a3b8',
    padding: '7px 14px',
    fontSize: 13,
    cursor: 'pointer',
    fontWeight: active ? 700 : 500,
  })

  const visibleTabs: TabName[] =
    sessionUser.role === 'admin'
      ? ['today', 'log', 'exercise', 'profile', 'history', 'admin']
      : ['today', 'log', 'exercise', 'profile', 'history']

  return (
    <div style={{ minHeight: '100vh', background: '#0b1120', color: '#e2e8f0', maxWidth: 430, margin: '0 auto', paddingBottom: 'calc(88px + env(safe-area-inset-bottom))' }}>
      {showScanModal && (
        <ScanFoodModal
          selectedMeal={selectedMeal}
          onAdd={(food) => addFood(food)}
          onClose={() => setShowScanModal(false)}
        />
      )}

      <div style={{ padding: '24px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 11, color: '#475569', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600 }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#f8fafc', marginTop: 4 }}>Calorie Counter</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>
            {sessionUser.displayName} ({sessionUser.role})
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          {editingGoal ? (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                value={goalInput}
                onChange={(event) => setGoalInput(event.target.value)}
                style={{ ...inputStyle, width: 90, padding: '6px 10px', fontSize: 13 }}
                type="number"
              />
              <button onClick={handleGoalSave} style={{ ...chipButtonStyle(true), padding: '6px 12px' }}>
                Save
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditingGoal(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'right', color: 'inherit', padding: 0 }}
            >
              <div style={{ fontSize: 11, color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Daily Goal</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#22d3ee' }}>
                {goal} <span style={{ fontSize: 12, color: '#475569' }}>kcal</span>
              </div>
            </button>
          )}
          <button onClick={handleLogout} style={{ marginTop: 8, background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#94a3b8', padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>
            Logout
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, padding: '16px 20px 0', flexWrap: 'wrap' }}>
        {visibleTabs.map((nextTab) => (
          <button key={nextTab} onClick={() => setTab(nextTab)} style={chipButtonStyle(tab === nextTab, nextTab === 'admin' ? '#a78bfa' : nextTab === 'exercise' ? '#4ade80' : '#22d3ee')}>
            {tabLabel(nextTab)}
          </button>
        ))}
      </div>

      <div style={{ padding: '20px' }}>
        {tab === 'today' && (
          <>
            <div style={{ background: '#131e30', borderRadius: 20, padding: 20, display: 'flex', gap: 20, alignItems: 'center', marginBottom: 16 }}>
              <RingChart consumed={totalCalories} goal={goal} />
              <div style={{ flex: 1 }}>
                <MacroBar label="Protein" value={totalProtein} max={Math.round((goal * 0.3) / 4)} color="#22d3ee" />
                <MacroBar label="Carbs" value={totalCarbs} max={Math.round((goal * 0.45) / 4)} color="#a78bfa" />
                <MacroBar label="Fat" value={totalFat} max={Math.round((goal * 0.25) / 9)} color="#fb923c" />
              </div>
            </div>

            {MEALS.map((meal) => {
              const items = todayEntries[meal] ?? []
              const mealCalories = items.reduce((sum, entry) => sum + entry.calories, 0)
              const isSelectedMeal = selectedMeal === meal

              return (
                <section
                  key={meal}
                  onClick={() => handleTodayMealTap(meal)}
                  style={{
                    background: '#131e30',
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 12,
                    cursor: 'pointer',
                    border: `1.5px solid ${isSelectedMeal ? '#22c55e' : '#1e293b'}`,
                    boxShadow: isSelectedMeal ? '0 0 0 1px #16a34a55 inset' : 'none',
                    transition: 'border-color 140ms ease, box-shadow 140ms ease, transform 120ms ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: items.length > 0 ? 10 : 0 }}>
                    <span style={{ fontWeight: 600, fontSize: 15 }}>{meal}</span>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 13, color: '#64748b' }}>{mealCalories} kcal</span>
                      <span style={{ fontSize: 11, color: isSelectedMeal ? '#4ade80' : '#64748b', border: `1px solid ${isSelectedMeal ? '#15803d' : '#334155'}`, borderRadius: 999, padding: '3px 8px', background: isSelectedMeal ? '#052e16' : '#1e293b' }}>
                        Tap to add
                      </span>
                    </div>
                  </div>
                  {items.length === 0 && <div style={{ fontSize: 13, color: '#64748b' }}>No items logged yet.</div>}
                  {items.map((item) => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: '1px solid #1e293b' }}>
                      <div>
                        <div style={{ fontSize: 13, color: '#e2e8f0' }}>{item.name}</div>
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                          P:{item.protein}g • C:{item.carbs}g • F:{item.fat}g
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 13 }}>{item.calories}</span>
                        <button
                          onClick={(event) => {
                            event.stopPropagation()
                            removeEntry(meal, item.id)
                          }}
                          style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 18 }}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </section>
              )
            })}
          </>
        )}

        {tab === 'log' && (
          <>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>Add to meal</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {MEALS.map((meal) => (
                  <button key={meal} onClick={() => setSelectedMeal(meal)} style={chipButtonStyle(selectedMeal === meal)}>
                    {meal}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setShowScanModal(true)}
              style={{ width: '100%', border: 'none', background: 'linear-gradient(135deg, #0891b2, #22d3ee)', color: '#0b1120', borderRadius: 14, padding: '12px 14px', fontWeight: 700, cursor: 'pointer', marginBottom: 12 }}
            >
              Scan Food with AI
            </button>

            <div style={{ position: 'relative', marginBottom: 12 }}>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search food database..." style={inputStyle} />
              {searchLoading && <div style={{ marginTop: 6, color: '#64748b', fontSize: 12 }}>Searching public foods and AI suggestions...</div>}
              {!!search && !searchLoading && !!searchStatus && <div style={{ marginTop: 6, color: '#64748b', fontSize: 12 }}>{searchStatus}</div>}
              <div style={{ marginTop: 8, background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, padding: 10 }}>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>Search Debug</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 11, color: '#94a3b8' }}>
                  <span>Total searches: {searchTelemetry.totalSearches}</span>
                  <span>Last latency: {searchTelemetry.lastLatencyMs}ms</span>
                  <span>Live hits: {searchTelemetry.liveHits}</span>
                  <span>Memory hits: {searchTelemetry.memoryHits}</span>
                  <span>Persistent hits: {searchTelemetry.persistentHits}</span>
                </div>
                <label style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#cbd5e1' }}>
                  <input
                    type="checkbox"
                    checked={strictEnglishOnly}
                    onChange={(event) => setStrictEnglishOnly(event.target.checked)}
                  />
                  Strict English-only results
                </label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                <input
                  value={addAmount}
                  onChange={(event) => setAddAmount(event.target.value)}
                  type="number"
                  min="0.1"
                  step="0.1"
                  style={inputStyle}
                  placeholder="Amount"
                />
                <select
                  value={addMode}
                  onChange={(event) => setAddMode(event.target.value as 'servings' | 'grams')}
                  style={inputStyle}
                >
                  <option value="servings">Servings</option>
                  <option value="grams">Grams (best for public foods)</option>
                </select>
              </div>
              {searchResults.length > 0 && (
                <div style={{ background: '#131e30', border: '1px solid #1e293b', borderRadius: 12, marginTop: 6, overflow: 'hidden' }}>
                  {searchResults.map((food, index) => (
                    <button
                      key={`${food.name}-${index}`}
                      onClick={() => addFood(withNormalizedAmount(food))}
                      style={{
                        width: '100%',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: index < searchResults.length - 1 ? '1px solid #1e293b' : 'none',
                        padding: '11px 14px',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        textAlign: 'left',
                        color: 'inherit',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 13, color: '#e2e8f0' }}>{food.name}</div>
                        <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>
                          P:{food.protein}g • C:{food.carbs}g • F:{food.fat}g
                        </div>
                        <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
                          Source: {food.source === 'public' ? 'Public repository' : food.source === 'ai' ? 'AI prediction' : 'Local'}
                        </div>
                        {food.cacheStatus && (
                          <div style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>
                            Cache: {food.cacheStatus === 'live' ? 'Live fetch' : food.cacheStatus === 'cache-memory' ? 'Memory cache' : 'Persistent cache'}
                          </div>
                        )}
                      </div>
                      <span style={{ fontSize: 13, color: '#22d3ee' }}>{food.calories}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button onClick={() => setShowCustomForm((current) => !current)} style={{ ...chipButtonStyle(showCustomForm, '#a78bfa'), width: '100%', marginBottom: 12 }}>
              {showCustomForm ? 'Cancel custom food' : 'Add custom meal item'}
            </button>

            {showCustomForm && (
              <div style={{ background: '#131e30', borderRadius: 16, padding: 16, marginBottom: 12 }}>
                <input value={customName} onChange={(event) => setCustomName(event.target.value)} placeholder="Food name" style={{ ...inputStyle, marginBottom: 8 }} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                  <input value={customCalories} onChange={(event) => setCustomCalories(event.target.value)} placeholder="Calories*" type="number" style={inputStyle} />
                  <input value={customProtein} onChange={(event) => setCustomProtein(event.target.value)} placeholder="Protein (g)" type="number" style={inputStyle} />
                  <input value={customCarbs} onChange={(event) => setCustomCarbs(event.target.value)} placeholder="Carbs (g)" type="number" style={inputStyle} />
                  <input value={customFat} onChange={(event) => setCustomFat(event.target.value)} placeholder="Fat (g)" type="number" style={inputStyle} />
                </div>
                <button onClick={handleCustomFoodAdd} style={{ ...chipButtonStyle(true, '#a78bfa'), width: '100%' }}>
                  Add to {selectedMeal}
                </button>
              </div>
            )}

            <div style={{ background: '#131e30', borderRadius: 16, padding: 16 }}>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>Common foods</div>
              <div style={{ fontSize: 11, color: '#4ade80', marginBottom: 8 }}>Tap anywhere on a row to add food</div>
              {foodDb.map((food, index) => (
                <button
                  key={`${food.name}-${index}`}
                  onClick={() => addFoodWithToast(food)}
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    border: '1px solid #166534',
                    borderRadius: 12,
                    padding: '12px 10px',
                    marginBottom: index < foodDb.length - 1 ? 8 : 0,
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    textAlign: 'left',
                    color: 'inherit',
                    transition: 'transform 120ms ease, border-color 120ms ease, background 120ms ease',
                  }}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.borderColor = '#22c55e'
                    event.currentTarget.style.background = '#10231a'
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.borderColor = '#166534'
                    event.currentTarget.style.background = '#0f172a'
                  }}
                  onMouseDown={(event) => {
                    event.currentTarget.style.transform = 'scale(0.99)'
                  }}
                  onMouseUp={(event) => {
                    event.currentTarget.style.transform = 'scale(1)'
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, color: '#e2e8f0' }}>{food.name}</div>
                    <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>
                      P:{food.protein}g • C:{food.carbs}g • F:{food.fat}g
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 13, color: '#22d3ee' }}>{food.calories}</span>
                    <span style={{ color: '#4ade80', fontSize: 11, fontWeight: 700, border: '1px solid #166534', borderRadius: 999, padding: '3px 8px', background: '#052e16' }}>
                      + Add
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {tab === 'history' && (
          <>
            <div style={{ background: '#131e30', borderRadius: 20, padding: 20, marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>Last 7 days</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 120 }}>
                {historyData.map((entry, index) => {
                  const height = Math.max((entry.calories / maxHistoryCalories) * 100, entry.calories > 0 ? 8 : 2)
                  const isToday = index === historyData.length - 1
                  const isOver = entry.calories > goal

                  return (
                    <div key={entry.day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div style={{ fontSize: 9, color: '#475569' }}>{entry.calories > 0 ? entry.calories : ''}</div>
                      <div
                        style={{
                          width: '100%',
                          height: `${height}%`,
                          minHeight: 4,
                          background: isOver ? '#f43f5e' : isToday ? '#22d3ee' : '#1e3a5f',
                          borderRadius: 6,
                        }}
                      />
                      <div style={{ fontSize: 9, color: isToday ? '#22d3ee' : '#475569' }}>{formatDate(entry.day).split(' ')[0]}</div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                {
                  label: 'Avg Calories',
                  value: Math.round(historyData.reduce((sum, entry) => sum + entry.calories, 0) / Math.max(historyData.filter((entry) => entry.calories > 0).length, 1)),
                  unit: 'kcal',
                  color: '#22d3ee',
                },
                {
                  label: 'Days Logged',
                  value: historyData.filter((entry) => entry.calories > 0).length,
                  unit: '/ 7',
                  color: '#a78bfa',
                },
                {
                  label: 'Under Goal',
                  value: historyData.filter((entry) => entry.calories > 0 && entry.calories <= goal).length,
                  unit: 'days',
                  color: '#34d399',
                },
                {
                  label: 'Over Goal',
                  value: historyData.filter((entry) => entry.calories > goal).length,
                  unit: 'days',
                  color: '#f43f5e',
                },
              ].map((stat) => (
                <div key={stat.label} style={{ background: '#131e30', borderRadius: 16, padding: 16 }}>
                  <div style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{stat.label}</div>
                  <div style={{ marginTop: 6 }}>
                    <span style={{ fontSize: 26, fontWeight: 700, color: stat.color }}>{stat.value}</span>
                    <span style={{ fontSize: 12, color: '#475569', marginLeft: 4 }}>{stat.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'exercise' && (
          <ExercisePlanner
            dateKey={today}
            workoutProgress={workoutProgress}
            gymActivities={gymActivities}
            customSchedule={customSchedule}
            onUpdateProgress={upsertWorkoutProgress}
            onAddActivity={addGymActivity}
            onDeleteActivity={removeGymActivity}
            onAddToSchedule={addToCustomSchedule}
            onRemoveFromSchedule={removeFromCustomSchedule}
          />
        )}

        {tab === 'profile' && (
          <UserProfile
            profile={userProfile}
            weightLog={weightLog}
            onSaveProfile={(p) => setUserProfile(p)}
            onAddWeight={(entry) => {
              setWeightLog((prev) => {
                // Replace same-day entry if exists, otherwise append
                const filtered = prev.filter((e) => e.date !== entry.date)
                return [...filtered, entry]
              })
            }}
          />
        )}

        {tab === 'admin' && sessionUser.role === 'admin' && (
          <AdminPanel
            customFoods={customFoods}
            onAddFood={addCustomCatalogFood}
            onDeleteFood={removeCustomCatalogFood}
            accounts={accounts}
            currentAdminEmail={sessionUser.email}
            onCreateAccount={(input, role) => {
              const result = registerAccount(input, role)
              if (result.ok) {
                setAccounts(listAccounts())
              }
              return result
            }}
            onDeleteAccount={(email) => {
              if (email === sessionUser.email) return
              deleteAccount(email)
              setAccounts(listAccounts())
            }}
            onUpdateAccount={(email, updates) => {
              const ok = updateAccountProfile(email, updates)
              if (ok) {
                setAccounts(listAccounts())
                if (email === sessionUser.email) {
                  setSessionUser((prev) => (prev ? { ...prev, displayName: updates.displayName || prev.displayName, role: updates.role || prev.role } : prev))
                }
                return { ok: true }
              }
              return { ok: false, error: 'Could not update account.' }
            }}
          />
        )}
      </div>

      {addToast && (
        <div
          style={{
            position: 'fixed',
            left: '50%',
            transform: 'translateX(-50%)',
            bottom: 'calc(82px + env(safe-area-inset-bottom))',
            background: '#052e16',
            border: '1px solid #22c55e',
            color: '#86efac',
            borderRadius: 999,
            padding: '8px 14px',
            fontSize: 12,
            fontWeight: 700,
            zIndex: 140,
            maxWidth: '90%',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {addToast}
        </div>
      )}

      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, background: '#0b1120', borderTop: '1px solid #1e293b', display: 'flex', padding: '12px 0', paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}>
        {visibleTabs.map((item) => (
          <button
            key={item}
            onClick={() => setTab(item)}
            style={{ flex: 1, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, color: tab === item ? '#22d3ee' : '#475569' }}
          >
            <span style={{ fontSize: 12, fontWeight: 600 }}>{tabLabel(item)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default App
