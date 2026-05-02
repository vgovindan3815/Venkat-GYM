export type UserRole = 'user' | 'admin'

export type UserAccount = {
  email: string
  authProvider?: 'local' | 'google'
  password?: string
  passwordHash?: string
  passwordSalt?: string
  passwordIterations?: number
  displayName: string
  role: UserRole
  fullName: string
  age: number | null
  sex: Sex | null
  phone: string
  createdAt: string
  updatedAt: string
}

export type RegisterAccountInput = {
  email: string
  password: string
  displayName: string
  fullName: string
  age: number | null
  sex: Sex | null
  phone: string
}

export type SessionUser = {
  email: string
  displayName: string
  role: UserRole
}

export type MealName = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks'
export type TabName = 'today' | 'log' | 'history' | 'exercise' | 'profile' | 'admin'

export type Sex = 'male' | 'female' | 'other'

export type WeightEntry = {
  date: string  // YYYY-MM-DD
  weightKg: number
}

export type UserProfile = {
  name: string
  age: number | null
  heightCm: number | null
  weightKg: number | null
  sex: Sex | null
  photoDataUrl: string | null
}

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

export type ExerciseCategory = 'strength' | 'cardio' | 'mobility' | 'sports'

export type BodyPart = 'chest' | 'arms' | 'shoulders' | 'abdomen' | 'thighs' | 'back' | 'cardio'

export type ExerciseEquipment =
  | 'barbell'
  | 'dumbbell'
  | 'cable'
  | 'machine'
  | 'bench'
  | 'bodyweight'
  | 'treadmill'
  | 'bike'

export type WorkoutExercise = {
  id: string
  name: string
  equipment: ExerciseEquipment
  category: ExerciseCategory
  sets?: number
  reps?: string
  durationMin?: number
  restSec?: number
  targetMuscles: string[]
  instructions: string
}

export type WorkoutDayPlan = {
  key: string
  title: string
  focus: string
  warmup: string
  exercises: WorkoutExercise[]
  cooldown: string
}

export type WorkoutProgress = {
  exerciseId: string
  completed: boolean
  setsDone?: number
  repsDone?: string
  durationDoneMin?: number
  notes?: string
}

export type WorkoutProgressByDate = Record<string, WorkoutProgress[]>

export type GymActivity = {
  id: number
  name: string
  category: ExerciseCategory
  durationMin: number
  caloriesBurned: number
  equipment?: ExerciseEquipment
  notes?: string
  loggedAt: string
}

export type GymActivityByDate = Record<string, GymActivity[]>

export type DayLog = Partial<Record<MealName, LoggedFood[]>>
export type LogByDate = Record<string, DayLog>

export type PersistedTrackerState = {
  goal: number
  log: LogByDate
  customFoods: Food[]
  workoutProgress: WorkoutProgressByDate
  gymActivities: GymActivityByDate
  customSchedule: Record<string, string[]>
  userProfile: UserProfile
  weightLog: WeightEntry[]
}

export type ScanResult = {
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  confidence?: 'high' | 'medium' | 'low'
  notes?: string
  provider?: 'gemini' | 'offline'
}
