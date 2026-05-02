import type { PersistedTrackerState, UserProfile } from '../types'
import { readCloudValue, writeCloudValue } from './cloudSync'

const STORAGE_KEY_PREFIX = 'caloriecounter-state'

function buildStorageKey(userEmail?: string): string {
  const normalized = userEmail?.trim().toLowerCase()
  return normalized ? `${STORAGE_KEY_PREFIX}:${normalized}` : STORAGE_KEY_PREFIX
}

function buildCloudKey(userEmail?: string): string {
  const normalized = userEmail?.trim().toLowerCase()
  return normalized ? `tracker:v1:${normalized}` : 'tracker:v1:guest'
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

export async function pullTrackerStateFromCloud(userEmail?: string): Promise<PersistedTrackerState | null> {
  const cloudState = await readCloudValue<PersistedTrackerState>(buildCloudKey(userEmail))
  if (!cloudState) return null

  try {
    window.localStorage.setItem(buildStorageKey(userEmail), JSON.stringify(cloudState))
  } catch {
    // Ignore storage write errors.
  }

  return {
    goal: cloudState.goal || defaultState.goal,
    log: cloudState.log || defaultState.log,
    customFoods: cloudState.customFoods || defaultState.customFoods,
    workoutProgress: cloudState.workoutProgress || defaultState.workoutProgress,
    gymActivities: cloudState.gymActivities || defaultState.gymActivities,
    customSchedule: cloudState.customSchedule || defaultState.customSchedule,
    userProfile: cloudState.userProfile || defaultState.userProfile,
    weightLog: cloudState.weightLog || defaultState.weightLog,
  }
}

export async function pushTrackerStateToCloud(nextState: PersistedTrackerState, userEmail?: string): Promise<boolean> {
  return writeCloudValue(buildCloudKey(userEmail), nextState)
}
