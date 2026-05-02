import CryptoJS from 'crypto-js'

const PASSWORD_ITERATIONS = 120000
const PASSWORD_KEY_SIZE = 256 / 32

type PasswordHashResult = {
  passwordHash: string
  passwordSalt: string
  passwordIterations: number
}

function randomSalt(): string {
  return CryptoJS.lib.WordArray.random(16).toString()
}

export function createPasswordHash(password: string): PasswordHashResult {
  const passwordSalt = randomSalt()
  const passwordHash = CryptoJS.PBKDF2(password, passwordSalt, {
    keySize: PASSWORD_KEY_SIZE,
    iterations: PASSWORD_ITERATIONS,
  }).toString()

  return {
    passwordHash,
    passwordSalt,
    passwordIterations: PASSWORD_ITERATIONS,
  }
}

export function verifyPasswordHash(password: string, account: { passwordHash?: string; passwordSalt?: string; passwordIterations?: number }): boolean {
  if (!account.passwordHash || !account.passwordSalt) {
    return false
  }

  const iterations = account.passwordIterations && account.passwordIterations > 0
    ? account.passwordIterations
    : PASSWORD_ITERATIONS

  const candidateHash = CryptoJS.PBKDF2(password, account.passwordSalt, {
    keySize: PASSWORD_KEY_SIZE,
    iterations,
  }).toString()

  return candidateHash === account.passwordHash
}
