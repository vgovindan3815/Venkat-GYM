import type { RegisterAccountInput, SessionUser, UserAccount, UserRole } from '../types'

const SESSION_KEY = 'caloriecounter-session'
const ACCOUNTS_KEY = 'caloriecounter-accounts'

const DEFAULT_USERS: UserAccount[] = [
  {
    email: 'user@caloriecounter.app',
    password: 'user123',
    displayName: 'General User',
    role: 'user',
    fullName: 'General User',
    age: null,
    sex: null,
    phone: '',
    createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
    updatedAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
  },
  {
    email: 'admin@caloriecounter.app',
    password: 'admin123',
    displayName: 'Admin User',
    role: 'admin',
    fullName: 'Admin User',
    age: null,
    sex: null,
    phone: '',
    createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
    updatedAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
  },
]

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function readAccounts(): UserAccount[] {
  try {
    const raw = window.localStorage.getItem(ACCOUNTS_KEY)
    if (!raw) {
      window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(DEFAULT_USERS))
      return DEFAULT_USERS
    }

    const parsed = JSON.parse(raw) as UserAccount[]
    if (!Array.isArray(parsed) || parsed.length === 0) {
      window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(DEFAULT_USERS))
      return DEFAULT_USERS
    }

    return parsed.map((account) => ({
      ...account,
      fullName: account.fullName || account.displayName,
      age: Number.isFinite(account.age) ? account.age : null,
      sex: account.sex || null,
      phone: account.phone || '',
      createdAt: account.createdAt || new Date().toISOString(),
      updatedAt: account.updatedAt || new Date().toISOString(),
    }))
  } catch {
    return DEFAULT_USERS
  }
}

function writeAccounts(accounts: UserAccount[]): void {
  try {
    window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts))
  } catch {
    // Ignore persistence errors.
  }
}

export function listAccounts(): UserAccount[] {
  return readAccounts()
}

export function registerAccount(input: RegisterAccountInput, role: UserRole = 'user'): { ok: boolean; error?: string } {
  const normalizedEmail = normalizeEmail(input.email)
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    return { ok: false, error: 'Enter a valid email address.' }
  }
  if (!input.password || input.password.length < 4) {
    return { ok: false, error: 'Password should be at least 4 characters.' }
  }
  if (!input.displayName.trim()) {
    return { ok: false, error: 'Display name is required.' }
  }

  const accounts = readAccounts()
  if (accounts.some((account) => account.email === normalizedEmail)) {
    return { ok: false, error: 'An account with that email already exists.' }
  }

  const now = new Date().toISOString()
  const next: UserAccount = {
    email: normalizedEmail,
    password: input.password,
    displayName: input.displayName.trim(),
    role,
    fullName: input.fullName.trim() || input.displayName.trim(),
    age: Number.isFinite(input.age) ? input.age : null,
    sex: input.sex,
    phone: input.phone.trim(),
    createdAt: now,
    updatedAt: now,
  }

  writeAccounts([...accounts, next])
  return { ok: true }
}

export function updateAccountProfile(email: string, updates: Partial<Omit<UserAccount, 'email' | 'createdAt'>>): boolean {
  const normalizedEmail = normalizeEmail(email)
  const accounts = readAccounts()
  const index = accounts.findIndex((account) => account.email === normalizedEmail)
  if (index < 0) return false

  accounts[index] = {
    ...accounts[index],
    ...updates,
    email: accounts[index].email,
    createdAt: accounts[index].createdAt,
    updatedAt: new Date().toISOString(),
  }

  writeAccounts(accounts)
  return true
}

export function deleteAccount(email: string): boolean {
  const normalizedEmail = normalizeEmail(email)
  const accounts = readAccounts()
  const next = accounts.filter((account) => account.email !== normalizedEmail)
  if (next.length === accounts.length) return false
  writeAccounts(next)
  return true
}

export function login(email: string, password: string): SessionUser | null {
  const normalizedEmail = normalizeEmail(email)
  const account = readAccounts().find((user) => user.email === normalizedEmail && user.password === password)
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
