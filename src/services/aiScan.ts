import type { ScanResult } from '../types'

const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions'

function cleanJson(text: string): string {
  return text.replace(/```json|```/g, '').trim()
}

function toDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Could not read image file'))
    reader.readAsDataURL(file)
  })
}

export async function scanFoodImage(file: File): Promise<ScanResult> {
  const env = (import.meta as ImportMeta & { env: Record<string, string | undefined> }).env
  const apiKey = env.VITE_OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error('Missing VITE_OPENROUTER_API_KEY in environment')
  }

  const dataUrl = await toDataUrl(file)
  const model = env.VITE_VISION_MODEL || 'openai/gpt-4o-mini'

  const response = await fetch(OPENROUTER_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Caloriecounter',
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analyze this food image and return only JSON with keys: name, calories, protein, carbs, fat, confidence, notes. Use numeric values for macros and calories.',
            },
            {
              type: 'image_url',
              image_url: {
                url: dataUrl,
              },
            },
          ],
        },
      ],
    }),
  })

  if (!response.ok) {
    throw new Error(`AI scan failed (${response.status})`)
  }

  const data = await response.json()
  const text = data?.choices?.[0]?.message?.content
  if (!text) {
    throw new Error('AI scan returned no content')
  }

  const parsed = JSON.parse(cleanJson(String(text))) as ScanResult
  if (!parsed.name || typeof parsed.calories !== 'number') {
    throw new Error('AI scan returned invalid nutrition data')
  }

  return {
    name: parsed.name,
    calories: Math.round(parsed.calories),
    protein: Math.round(parsed.protein || 0),
    carbs: Math.round(parsed.carbs || 0),
    fat: Math.round(parsed.fat || 0),
    confidence: parsed.confidence,
    notes: parsed.notes,
  }
}
