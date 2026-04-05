import type { PersistedTrackerState } from '../types'

const STORAGE_KEY = 'caloriecounter-state'

const defaultState: PersistedTrackerState = {
  goal: 1800,
  log: {},
  customFoods: [],
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
