import type { ScanResult } from '../types'

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

const GEMINI_KEY_STORAGE = 'caloriecounter-gemini-key'

const NUTRITION_PROMPT = `You are a nutrition expert. Look at this food photo and identify everything visible.
Return ONLY a JSON object (no markdown, no explanation) in this exact format:
{"name":"<short food name>","calories":<number>,"protein":<number>,"carbs":<number>,"fat":<number>}
All macro values are in grams per serving visible. If multiple items are present, sum them up and describe the full meal in "name".`

type EnvMap = Record<string, string | undefined>

function getEnv(): EnvMap {
  return (import.meta as ImportMeta & { env: EnvMap }).env
}

function getStoredKey(storageKey: string): string {
  try {
    return window.localStorage.getItem(storageKey)?.trim() || ''
  } catch {
    return ''
  }
}

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      // Strip the "data:image/...;base64," prefix
      resolve(dataUrl.split(',')[1] ?? '')
    }
    reader.onerror = () => reject(new Error('Failed to read image file'))
    reader.readAsDataURL(file)
  })
}

function buildOfflineEstimate(fileName: string): ScanResult {
  const cleanName = fileName
    .replace(/\.[^/.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase()

  const presets: Array<{ match: RegExp; result: Omit<ScanResult, 'confidence' | 'notes' | 'provider'> }> = [
    { match: /rice|biryani|pulao/, result: { name: 'Rice dish', calories: 320, protein: 8, carbs: 58, fat: 6 } },
    { match: /chicken|grill|tandoori/, result: { name: 'Chicken serving', calories: 260, protein: 35, carbs: 3, fat: 12 } },
    { match: /salad|veggie|vegetable/, result: { name: 'Salad bowl', calories: 180, protein: 6, carbs: 18, fat: 9 } },
    { match: /burger|sandwich/, result: { name: 'Burger or sandwich', calories: 430, protein: 20, carbs: 39, fat: 22 } },
    { match: /pizza/, result: { name: 'Pizza slice serving', calories: 290, protein: 12, carbs: 33, fat: 12 } },
    { match: /pasta|noodle/, result: { name: 'Pasta serving', calories: 360, protein: 11, carbs: 58, fat: 10 } },
    { match: /egg|omelet/, result: { name: 'Egg-based meal', calories: 240, protein: 17, carbs: 4, fat: 16 } },
    { match: /fruit|banana|apple/, result: { name: 'Fruit snack', calories: 120, protein: 1, carbs: 31, fat: 0 } },
  ]

  const matched = presets.find((preset) => preset.match.test(cleanName))
  if (matched) {
    return {
      ...matched.result,
      confidence: 'low',
      notes: 'Offline estimate based on image filename. Adjust values if needed.',
      provider: 'offline',
    }
  }

  return {
    name: cleanName ? `${cleanName[0].toUpperCase()}${cleanName.slice(1)}` : 'Food item',
    calories: 280,
    protein: 12,
    carbs: 32,
    fat: 11,
    confidence: 'low',
    notes: 'Offline estimate used because Gemini scan was unavailable.',
    provider: 'offline',
  }
}

async function scanWithGemini(file: File, apiKey: string): Promise<ScanResult> {
  const base64 = await toBase64(file)
  const mimeType = file.type.startsWith('image/png') ? 'image/png' : 'image/jpeg'

  const body = {
    contents: [
      {
        parts: [
          { text: NUTRITION_PROMPT },
          { inline_data: { mime_type: mimeType, data: base64 } },
        ],
      },
    ],
    generationConfig: { temperature: 0.1, maxOutputTokens: 256 },
  }

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    let details = ''
    try {
      const errBody = await response.json() as { error?: { message?: string } }
      details = errBody?.error?.message ? `: ${errBody.error.message}` : ''
    } catch {
      // Ignore
    }
    throw new Error(`Gemini API error (${response.status})${details}`)
  }

  const data = await response.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ''
  if (!text) throw new Error('Gemini returned an empty response')

  // Extract JSON from the response (may have ```json ... ``` wrapping)
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Gemini response did not contain valid JSON')

  const parsed = JSON.parse(jsonMatch[0]) as {
    name?: string
    calories?: number
    protein?: number
    carbs?: number
    fat?: number
  }

  return {
    name: parsed.name ?? 'Detected meal',
    calories: Math.round(Number(parsed.calories) || 0),
    protein: Math.round(Number(parsed.protein) || 0),
    carbs: Math.round(Number(parsed.carbs) || 0),
    fat: Math.round(Number(parsed.fat) || 0),
    confidence: 'high',
    notes: 'Identified by Gemini Vision (gemini-2.0-flash).',
    provider: 'gemini',
  }
}

export function getRuntimeAiConfig(): { geminiApiKey: string } {
  return {
    geminiApiKey: getStoredKey(GEMINI_KEY_STORAGE),
  }
}

export function saveRuntimeGeminiApiKey(apiKey: string): void {
  try {
    const value = apiKey.trim()
    if (!value) {
      window.localStorage.removeItem(GEMINI_KEY_STORAGE)
      return
    }
    window.localStorage.setItem(GEMINI_KEY_STORAGE, value)
  } catch {
    // Ignore storage write errors.
  }
}

export function isAiScanConfigured(): boolean {
  const env = getEnv()
  const runtime = getRuntimeAiConfig()
  return Boolean(runtime.geminiApiKey || env.VITE_GEMINI_API_KEY)
}

export async function scanFoodImage(file: File): Promise<ScanResult> {
  const env = getEnv()
  const runtime = getRuntimeAiConfig()
  const geminiApiKey = runtime.geminiApiKey || env.VITE_GEMINI_API_KEY

  if (!geminiApiKey) {
    return {
      ...buildOfflineEstimate(file.name),
      notes: 'No Gemini API key configured. Add your key in API Settings below.',
    }
  }

  try {
    return await scanWithGemini(file, geminiApiKey)
  } catch (error) {
    return {
      ...buildOfflineEstimate(file.name),
      notes: `Gemini scan failed. Offline estimate used. ${error instanceof Error ? error.message : ''}`,
    }
  }
}
