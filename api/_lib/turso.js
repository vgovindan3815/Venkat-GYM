import { createClient } from '@libsql/client'

let schemaReady = false

function getClient() {
  const url = process.env.TURSO_DATABASE_URL
  const authToken = process.env.TURSO_AUTH_TOKEN

  if (!url || !authToken) {
    throw new Error('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN')
  }

  return createClient({ url, authToken })
}

export async function ensureSchema() {
  if (schemaReady) return

  const client = getClient()
  await client.execute(`
    CREATE TABLE IF NOT EXISTS app_kv (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)

  schemaReady = true
}

export async function getValue(key) {
  await ensureSchema()
  const client = getClient()
  const result = await client.execute({
    sql: 'SELECT value FROM app_kv WHERE key = ?1',
    args: [key],
  })

  if (result.rows.length === 0) return null
  return result.rows[0].value
}

export async function setValue(key, value) {
  await ensureSchema()
  const client = getClient()
  const now = new Date().toISOString()

  await client.execute({
    sql: `
      INSERT INTO app_kv (key, value, updated_at)
      VALUES (?1, ?2, ?3)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `,
    args: [key, value, now],
  })
}
