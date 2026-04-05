export type UserRole = 'user' | 'admin'

export type UserAccount = {
  email: string
  password: string
  displayName: string
  role: UserRole
}

export type SessionUser = {
  email: string
  displayName: string
  role: UserRole
}

export type MealName = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks'
export type TabName = 'today' | 'log' | 'history' | 'admin'

export type Food = {
  id?: string
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
}

export type FoodSearchSource = 'local' | 'public' | 'ai'

export type FoodSearchResult = Food & {
  source: FoodSearchSource
  cacheStatus?: 'live' | 'cache-memory' | 'cache-storage'
}

export type LoggedFood = Food & {
  id: number
}

export type DayLog = Partial<Record<MealName, LoggedFood[]>>
export type LogByDate = Record<string, DayLog>

export type PersistedTrackerState = {
  goal: number
  log: LogByDate
  customFoods: Food[]
}

export type ScanResult = {
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  confidence?: 'high' | 'medium' | 'low'
  notes?: string
}
