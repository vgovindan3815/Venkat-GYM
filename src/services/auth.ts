import type { RegisterAccountInput, SessionUser, UserAccount, UserRole } from '../types'
import { readCloudValue, writeCloudValue } from './cloudSync'
import { clearCloudSessionToken, startCloudSession, startCloudSessionWithGoogle } from './cloudSession'
import { createPasswordHash, verifyPasswordHash } from './password'

const SESSION_KEY = 'caloriecounter-session'
const ACCOUNTS_KEY = 'caloriecounter-accounts'
const CLOUD_ACCOUNTS_KEY = 'accounts:v1'

function seedDefaultUsers(): UserAccount[] {
  const createdAt = new Date('2026-01-01T00:00:00.000Z').toISOString()
  const userPassword = createPasswordHash('user123')
  const adminPassword = createPasswordHash('admin123')

  return [
    {
      email: 'user@caloriecounter.app',
      displayName: 'General User',
      role: 'user',
      fullName: 'General User',
      age: null,
      sex: null,
      phone: '',
      createdAt,
      updatedAt: createdAt,
      ...userPassword,
    },
    {
      email: 'admin@caloriecounter.app',
      displayName: 'Admin User',
      role: 'admin',
      fullName: 'Admin User',
      age: null,
      sex: null,
      phone: '',
      createdAt,
      updatedAt: createdAt,
      ...adminPassword,
    },
  ]
}

function normalizeAccount(account: UserAccount): { account: UserAccount; changed: boolean } {
  let changed = false

  let passwordHash = account.passwordHash
  let passwordSalt = account.passwordSalt
  let passwordIterations = account.passwordIterations

  if (!passwordHash || !passwordSalt) {
    if (account.password) {
      const hashed = createPasswordHash(account.password)
      passwordHash = hashed.passwordHash
      passwordSalt = hashed.passwordSalt
      passwordIterations = hashed.passwordIterations
      changed = true
    }
  }

  const normalized: UserAccount = {
    ...account,
    authProvider: account.authProvider || 'local',
    email: normalizeEmail(account.email),
    fullName: account.fullName || account.displayName,
    age: Number.isFinite(account.age) ? account.age : null,
    sex: account.sex || null,
    phone: account.phone || '',
    createdAt: account.createdAt || new Date().toISOString(),
    updatedAt: account.updatedAt || new Date().toISOString(),
    passwordHash,
    passwordSalt,
    passwordIterations,
    password: undefined,
  }

  if (account.password) changed = true
  return { account: normalized, changed }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function createLocalSession(account: UserAccount): SessionUser {
  return {
    email: account.email,
    displayName: account.displayName,
    role: account.role,
  }
}

function persistSession(session: SessionUser): void {
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch {
    // Ignore persistence errors and still return the session.
  }
}

function decodeGoogleIdToken(idToken: string): { email: string; name: string } | null {
  const parts = idToken.split('.')
  if (parts.length < 2) return null

  try {
    const payloadPart = parts[1]
    const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    const json = window.atob(padded)
    const payload = JSON.parse(json) as { email?: string; name?: string; email_verified?: boolean | string }

    const email = normalizeEmail(payload.email || '')
    const isVerified = payload.email_verified === true || payload.email_verified === 'true'
    if (!email || !isVerified) return null

    return {
      email,
      name: (payload.name || email).trim(),
    }
  } catch {
    return null
  }
}

function readAccounts(): UserAccount[] {
  try {
    const raw = window.localStorage.getItem(ACCOUNTS_KEY)
    if (!raw) {
      const defaults = seedDefaultUsers()
      window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(defaults))
      return defaults
    }

    const parsed = JSON.parse(raw) as UserAccount[]
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const defaults = seedDefaultUsers()
      window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(defaults))
      return defaults
    }

    let migrated = false
    const normalized = parsed.map((account) => {
      const result = normalizeAccount(account)
      migrated = migrated || result.changed
      return result.account
    })

    if (migrated) {
      writeAccounts(normalized)
      void syncAccountsToCloud(normalized)
    }

    return normalized
  } catch {
    return seedDefaultUsers()
  }
}

function writeAccounts(accounts: UserAccount[]): void {
  try {
    window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts))
  } catch {
    // Ignore persistence errors.
  }
}

export async function syncAccountsFromCloud(): Promise<UserAccount[] | null> {
  const cloudAccounts = await readCloudValue<UserAccount[]>(CLOUD_ACCOUNTS_KEY)
  if (!cloudAccounts || !Array.isArray(cloudAccounts) || cloudAccounts.length === 0) {
    return null
  }

  let migrated = false
  const normalized = cloudAccounts.map((account) => {
    const result = normalizeAccount(account)
    migrated = migrated || result.changed
    return result.account
  })

  writeAccounts(normalized)
  if (migrated) {
    void syncAccountsToCloud(normalized)
  }

  return normalized
}

export async function syncAccountsToCloud(accounts?: UserAccount[]): Promise<boolean> {
  const payload = accounts ?? readAccounts()
  return writeCloudValue(CLOUD_ACCOUNTS_KEY, payload)
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
  const hashedPassword = createPasswordHash(input.password)
  const next: UserAccount = {
    email: normalizedEmail,
    displayName: input.displayName.trim(),
    role,
    fullName: input.fullName.trim() || input.displayName.trim(),
    age: Number.isFinite(input.age) ? input.age : null,
    sex: input.sex,
    phone: input.phone.trim(),
    createdAt: now,
    updatedAt: now,
    ...hashedPassword,
  }

  const updated = [...accounts, next]
  writeAccounts(updated)
  void syncAccountsToCloud(updated)
  return { ok: true }
}

export function updateAccountProfile(email: string, updates: Partial<Omit<UserAccount, 'email' | 'createdAt'>>): boolean {
  const normalizedEmail = normalizeEmail(email)
  const accounts = readAccounts()
  const index = accounts.findIndex((account) => account.email === normalizedEmail)
  if (index < 0) return false

  const passwordPatch = updates.password
    ? createPasswordHash(updates.password)
    : {}

  accounts[index] = {
    ...accounts[index],
    ...updates,
    ...passwordPatch,
    email: accounts[index].email,
    createdAt: accounts[index].createdAt,
    updatedAt: new Date().toISOString(),
    password: undefined,
  }

  writeAccounts(accounts)
  void syncAccountsToCloud(accounts)
  return true
}

export function deleteAccount(email: string): boolean {
  const normalizedEmail = normalizeEmail(email)
  const accounts = readAccounts()
  const next = accounts.filter((account) => account.email !== normalizedEmail)
  if (next.length === accounts.length) return false
  writeAccounts(next)
  void syncAccountsToCloud(next)
  return true
}

export function login(email: string, password: string): SessionUser | null {
  const normalizedEmail = normalizeEmail(email)
  const account = readAccounts().find((user) => {
    if (user.email !== normalizedEmail) return false
    return verifyPasswordHash(password, user)
  })
  if (!account) {
    return null
  }

  const session = createLocalSession(account)
  persistSession(session)

  void startCloudSession(account.email, password)

  return session
}

export async function loginWithGoogle(idToken: string): Promise<SessionUser | null> {
  const cloudSession = await startCloudSessionWithGoogle(idToken)
  if (cloudSession) {
    const accounts = readAccounts()
    const existing = accounts.find((account) => account.email === normalizeEmail(cloudSession.email))
    if (!existing) {
      const now = new Date().toISOString()
      const newGoogleAccount: UserAccount = {
        authProvider: 'google',
        email: normalizeEmail(cloudSession.email),
        displayName: cloudSession.displayName,
        role: cloudSession.role,
        fullName: cloudSession.displayName,
        age: null,
        sex: null,
        phone: '',
        createdAt: now,
        updatedAt: now,
      }
      const updated = [...accounts, newGoogleAccount]
      writeAccounts(updated)
      void syncAccountsToCloud(updated)
    }

    persistSession(cloudSession)
    return cloudSession
  }

  // Local fallback for pure Vite dev where /api routes are unavailable.
  const decoded = decodeGoogleIdToken(idToken)
  if (!decoded) return null

  const accounts = readAccounts()
  const idx = accounts.findIndex((account) => account.email === decoded.email)
  const now = new Date().toISOString()

  if (idx >= 0) {
    accounts[idx] = {
      ...accounts[idx],
      authProvider: 'google',
      displayName: accounts[idx].displayName || decoded.name,
      fullName: accounts[idx].fullName || decoded.name,
      updatedAt: now,
    }
  } else {
    const newGoogleAccount: UserAccount = {
      authProvider: 'google',
      email: decoded.email,
      displayName: decoded.name,
      role: 'user',
      fullName: decoded.name,
      age: null,
      sex: null,
      phone: '',
      createdAt: now,
      updatedAt: now,
    }
    accounts.push(newGoogleAccount)
  }

  writeAccounts(accounts)
  const account = accounts.find((item) => item.email === decoded.email)
  if (!account) return null

  const session = createLocalSession(account)
  persistSession(session)
  return session
}

export function logout(): void {
  try {
    window.localStorage.removeItem(SESSION_KEY)
  } catch {
    // Ignore persistence errors.
  }

  clearCloudSessionToken()
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
