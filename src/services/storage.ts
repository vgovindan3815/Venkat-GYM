import type { PersistedTrackerState, UserProfile } from '../types'

const STORAGE_KEY_PREFIX = 'caloriecounter-state'

function buildStorageKey(userEmail?: string): string {
  const normalized = userEmail?.trim().toLowerCase()
  return normalized ? `${STORAGE_KEY_PREFIX}:${normalized}` : STORAGE_KEY_PREFIX
}

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

export function loadTrackerState(userEmail?: string): PersistedTrackerState {
  try {
    const raw = window.localStorage.getItem(buildStorageKey(userEmail))
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

export function saveTrackerState(nextState: PersistedTrackerState, userEmail?: string): void {
  try {
    window.localStorage.setItem(buildStorageKey(userEmail), JSON.stringify(nextState))
  } catch {
    // Ignore storage write errors.
  }
}
