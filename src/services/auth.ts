import type { SessionUser, UserAccount } from '../types'

const SESSION_KEY = 'caloriecounter-session'

const USERS: UserAccount[] = [
  {
    email: 'user@caloriecounter.app',
    password: 'user123',
    displayName: 'General User',
    role: 'user',
  },
  {
    email: 'admin@caloriecounter.app',
    password: 'admin123',
    displayName: 'Admin User',
    role: 'admin',
  },
]

export function login(email: string, password: string): SessionUser | null {
  const normalizedEmail = email.trim().toLowerCase()
  const account = USERS.find((user) => user.email === normalizedEmail && user.password === password)
  if (!account) {
    return null
  }

  const session: SessionUser = {
    email: account.email,
    displayName: account.displayName,
    role: account.role,
  }

  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch {
    // Ignore persistence errors and still return the session.
  }

  return session
}

export function logout(): void {
  try {
    window.localStorage.removeItem(SESSION_KEY)
  } catch {
    // Ignore persistence errors.
  }
}

export function getSessionUser(): SessionUser | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as SessionUser
    if (!parsed.email || !parsed.role || !parsed.displayName) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

export const demoCredentials = {
  user: { email: 'user@caloriecounter.app', password: 'user123' },
  admin: { email: 'admin@caloriecounter.app', password: 'admin123' },
}
