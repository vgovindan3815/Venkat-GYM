import { getCloudSessionToken } from './cloudSession'

type CloudSyncResponse<T> = {
  ok: boolean
  value?: T | null
  error?: string
}

function endpoint(): string {
  return import.meta.env.VITE_CLOUD_SYNC_ENDPOINT || '/api/cloud-sync'
}

export function isCloudSyncEnabled(): boolean {
  return import.meta.env.VITE_CLOUD_SYNC_ENABLED !== 'false'
}

export async function readCloudValue<T>(key: string): Promise<T | null> {
  if (!isCloudSyncEnabled()) return null
  const token = getCloudSessionToken()
  if (!token) return null

  try {
    const response = await fetch(`${endpoint()}?key=${encodeURIComponent(key)}`, {
      method: 'GET',
      credentials: 'same-origin',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) return null
    const payload = (await response.json()) as CloudSyncResponse<T>
    if (!payload.ok) return null
    return payload.value ?? null
  } catch {
    return null
  }
}

export async function writeCloudValue<T>(key: string, value: T): Promise<boolean> {
  if (!isCloudSyncEnabled()) return false
  const token = getCloudSessionToken()
  if (!token) return false

  try {
    const response = await fetch(endpoint(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      credentials: 'same-origin',
      body: JSON.stringify({ key, value }),
    })

    if (!response.ok) return false
    const payload = (await response.json()) as CloudSyncResponse<unknown>
    return Boolean(payload.ok)
  } catch {
    return false
  }
}
