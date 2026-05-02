import CryptoJS from 'crypto-js'

const PASSWORD_ITERATIONS = 120000
const PASSWORD_KEY_SIZE = 256 / 32

function randomSalt() {
  return CryptoJS.lib.WordArray.random(16).toString()
}

export function createPasswordHash(password) {
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

export function normalizeAccountPassword(account) {
  if (account.passwordHash && account.passwordSalt) {
    return { account, changed: false }
  }

  if (!account.password) {
    return { account, changed: false }
  }

  const hashed = createPasswordHash(account.password)
  return {
    changed: true,
    account: {
      ...account,
      ...hashed,
      password: undefined,
    },
  }
}

export function verifyPassword(password, account) {
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
