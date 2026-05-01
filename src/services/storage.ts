import type { PersistedTrackerState, UserProfile } from '../types'

const STORAGE_KEY = 'caloriecounter-state'

const defaultProfile: UserProfile = {
  name: '',
  age: null,
  heightCm: null,
  weightKg: null,
  sex: null,
  photoDataUrl: null,
}

const defaultState: PersistedTrackerState = {
  goal: 1800,
  log: {},
  customFoods: [],
  workoutProgress: {},
  gymActivities: {},
  customSchedule: {},
  userProfile: defaultProfile,
  weightLog: [],
}

export function loadTrackerState(): PersistedTrackerState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return defaultState
    }

    const parsed = JSON.parse(raw) as PersistedTrackerState
    return {
      goal: parsed.goal || defaultState.goal,
      log: parsed.log || defaultState.log,
      customFoods: parsed.customFoods || defaultState.customFoods,
      workoutProgress: parsed.workoutProgress || defaultState.workoutProgress,
      gymActivities: parsed.gymActivities || defaultState.gymActivities,
      customSchedule: parsed.customSchedule || defaultState.customSchedule,
      userProfile: parsed.userProfile || defaultState.userProfile,
      weightLog: parsed.weightLog || defaultState.weightLog,
    }
  } catch {
    return defaultState
  }
}

export function saveTrackerState(nextState: PersistedTrackerState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState))
  } catch {
    // Ignore storage write errors.
  }
}
