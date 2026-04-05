import type { FoodSearchResult } from '../types'

const OPEN_FOOD_FACTS_URL = 'https://world.openfoodfacts.org/cgi/search.pl'
const USDA_FOOD_SEARCH_URL = 'https://api.nal.usda.gov/fdc/v1/foods/search'
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const CACHE_TTL_MS = 10 * 60 * 1000
const PUBLIC_CACHE_STORAGE_KEY = 'caloriecounter-foodsearch-public'
const AI_CACHE_STORAGE_KEY = 'caloriecounter-foodsearch-ai'

const publicSearchCache = new Map<string, { expiresAt: number; data: FoodSearchResult[] }>()
const aiSearchCache = new Map<string, { expiresAt: number; data: FoodSearchResult[] }>()

type PersistentCacheShape = Record<string, { expiresAt: number; data: FoodSearchResult[] }>
type CacheOrigin = 'memory' | 'storage'

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase()
}

function readCache(
  cache: Map<string, { expiresAt: number; data: FoodSearchResult[] }>,
  storageKey: string,
  key: string,
): { data: FoodSearchResult[]; origin: CacheOrigin } | null {
  const found = cache.get(key)
  if (found) {
    if (Date.now() > found.expiresAt) {
      cache.delete(key)
      removePersistentCacheEntry(storageKey, key)
      return null
    }

    return { data: found.data, origin: 'memory' }
  }

  const persisted = readPersistentCacheEntry(storageKey, key)
  if (!persisted) {
    return null
  }

  cache.set(key, persisted)
  return { data: persisted.data, origin: 'storage' }
}

function writeCache(
  cache: Map<string, { expiresAt: number; data: FoodSearchResult[] }>,
  storageKey: string,
  key: string,
  data: FoodSearchResult[],
): void {
  const entry = {
    expiresAt: Date.now() + CACHE_TTL_MS,
    data,
  }

  cache.set(key, entry)
  writePersistentCacheEntry(storageKey, key, entry)
}

function readPersistentCacheEntry(
  storageKey: string,
  key: string,
): { expiresAt: number; data: FoodSearchResult[] } | null {
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as PersistentCacheShape
    const entry = parsed[key]
    if (!entry) {
      return null
    }

    if (Date.now() > entry.expiresAt) {
      delete parsed[key]
      window.localStorage.setItem(storageKey, JSON.stringify(parsed))
      return null
    }

    return entry
  } catch {
    return null
  }
}

function writePersistentCacheEntry(
  storageKey: string,
  key: string,
  entry: { expiresAt: number; data: FoodSearchResult[] },
): void {
  try {
    const raw = window.localStorage.getItem(storageKey)
    const parsed = raw ? (JSON.parse(raw) as PersistentCacheShape) : {}
    parsed[key] = entry
    window.localStorage.setItem(storageKey, JSON.stringify(parsed))
  } catch {
    // Ignore persistence errors.
  }
}

function removePersistentCacheEntry(storageKey: string, key: string): void {
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) {
      return
    }

    const parsed = JSON.parse(raw) as PersistentCacheShape
    if (!(key in parsed)) {
      return
    }

    delete parsed[key]
    window.localStorage.setItem(storageKey, JSON.stringify(parsed))
  } catch {
    // Ignore persistence errors.
  }
}

function toNumber(value: unknown): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0
  }
  return Math.round(parsed * 10) / 10
}

function cleanJson(text: string): string {
  return text.replace(/```json|```/g, '').trim()
}

function isFoodSearchResult(value: FoodSearchResult | null): value is FoodSearchResult {
  return Boolean(value)
}

function extractUsdaNutrient(
  nutrients: Array<{ nutrientName?: string; value?: number }> | undefined,
  names: string[],
): number {
  if (!nutrients) {
    return 0
  }

  const target = names.map((name) => name.toLowerCase())
  const found = nutrients.find((nutrient) => {
    const nutrientName = String(nutrient.nutrientName || '').toLowerCase()
    return target.includes(nutrientName)
  })

  return toNumber(found?.value)
}

async function searchFoodsFromUsda(query: string): Promise<FoodSearchResult[]> {
  const env = (import.meta as ImportMeta & { env: Record<string, string | undefined> }).env
  const apiKey = env.VITE_USDA_API_KEY || 'DEMO_KEY'

  const params = new URLSearchParams({
    query,
    pageSize: '12',
    api_key: apiKey,
    dataType: 'Foundation,SR Legacy,Survey (FNDDS),Branded',
  })

  const response = await fetch(`${USDA_FOOD_SEARCH_URL}?${params.toString()}`, {
    headers: {
      accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`USDA lookup failed (${response.status})`)
  }

  const contentType = response.headers.get('content-type') || ''
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new Error('USDA returned non-JSON response')
  }

  const data = await response.json()
  const foods = Array.isArray(data?.foods) ? data.foods : []

  return foods
    .map((food: Record<string, unknown>, index: number): FoodSearchResult | null => {
      const name = String(food.description || '').trim()
      if (!name) {
        return null
      }

      const nutrients = food.foodNutrients as Array<{ nutrientName?: string; value?: number }> | undefined
      const calories = extractUsdaNutrient(nutrients, ['Energy', 'Energy (Atwater General Factors)'])

      return {
        id: `usda-${String(food.fdcId || index)}`,
        name,
        calories,
        protein: extractUsdaNutrient(nutrients, ['Protein']),
        carbs: extractUsdaNutrient(nutrients, ['Carbohydrate, by difference']),
        fat: extractUsdaNutrient(nutrients, ['Total lipid (fat)']),
        source: 'public',
      }
    })
    .filter(isFoodSearchResult)
}

async function searchFoodsFromOpenFoodFacts(query: string): Promise<FoodSearchResult[]> {
  const params = new URLSearchParams({
    search_terms: query,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: '8',
  })

  const response = await fetch(`${OPEN_FOOD_FACTS_URL}?${params.toString()}`, {
    headers: {
      accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Open Food Facts lookup failed (${response.status})`)
  }

  const contentType = response.headers.get('content-type') || ''
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new Error('Open Food Facts returned non-JSON response')
  }

  const data = await response.json()
  const products = Array.isArray(data?.products) ? data.products : []

  return products
    .map((product: Record<string, unknown>, index: number): FoodSearchResult | null => {
      const nutriments = (product.nutriments as Record<string, unknown>) || {}
      const name =
        (product.product_name_en as string | undefined) ||
        (product.product_name as string | undefined) ||
        (product.generic_name as string | undefined) ||
        ''

      if (!name.trim()) {
        return null
      }

      const calories =
        toNumber(nutriments['energy-kcal_100g']) ||
        toNumber(nutriments['energy-kcal']) ||
        toNumber(nutriments['energy-kcal_value'])

      return {
        id: `off-${String(product.code || index)}`,
        name: name.trim(),
        calories,
        protein: toNumber(nutriments.proteins_100g),
        carbs: toNumber(nutriments.carbohydrates_100g),
        fat: toNumber(nutriments.fat_100g),
        source: 'public',
      }
    })
    .filter(isFoodSearchResult)
}

function withCacheStatus(
  items: FoodSearchResult[],
  status: FoodSearchResult['cacheStatus'],
): FoodSearchResult[] {
  return items.map((item) => ({ ...item, cacheStatus: status }))
}

export async function searchFoodsFromPublicRepo(query: string): Promise<FoodSearchResult[]> {
  const normalizedQuery = normalizeQuery(query)
  if (!normalizedQuery) {
    return []
  }

  const cached = readCache(publicSearchCache, PUBLIC_CACHE_STORAGE_KEY, normalizedQuery)
  if (cached) {
    return withCacheStatus(
      cached.data,
      cached.origin === 'memory' ? 'cache-memory' : 'cache-storage',
    )
  }

  let mapped: FoodSearchResult[] = []
  try {
    mapped = await searchFoodsFromUsda(normalizedQuery)
  } catch {
    mapped = []
  }

  if (mapped.length === 0) {
    try {
      mapped = await searchFoodsFromOpenFoodFacts(normalizedQuery)
    } catch {
      mapped = []
    }
  }

  writeCache(publicSearchCache, PUBLIC_CACHE_STORAGE_KEY, normalizedQuery, mapped)
  return withCacheStatus(mapped, 'live')
}

export async function predictFoodsWithAI(query: string): Promise<FoodSearchResult[]> {
  const normalizedQuery = normalizeQuery(query)
  if (normalizedQuery.length < 2) {
    return []
  }

  const cached = readCache(aiSearchCache, AI_CACHE_STORAGE_KEY, normalizedQuery)
  if (cached) {
    return withCacheStatus(
      cached.data,
      cached.origin === 'memory' ? 'cache-memory' : 'cache-storage',
    )
  }

  const env = (import.meta as ImportMeta & { env: Record<string, string | undefined> }).env
  const apiKey = env.VITE_OPENROUTER_API_KEY
  if (!apiKey) {
    return []
  }

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Caloriecounter',
      },
      body: JSON.stringify({
        model: env.VITE_VISION_MODEL || 'openai/gpt-4o-mini',
        temperature: 0.3,
        max_tokens: 350,
        messages: [
          {
            role: 'user',
            content: `Suggest 5 likely food matches for the search term "${normalizedQuery}". Return only a JSON array of objects with keys: name, calories, protein, carbs, fat. Use numeric values and realistic estimates.`,
          },
        ],
      }),
    })

    if (!response.ok) {
      return []
    }

    const data = await response.json()
    const text = String(data?.choices?.[0]?.message?.content || '')
    const parsed = JSON.parse(cleanJson(text)) as Array<Record<string, unknown>>

    if (!Array.isArray(parsed)) {
      return []
    }

    const mapped = parsed
      .map((item, index): FoodSearchResult | null => {
        const name = String(item.name || '').trim()
        if (!name) {
          return null
        }

        return {
          id: `ai-${index}-${name.toLowerCase().replace(/\s+/g, '-')}`,
          name,
          calories: toNumber(item.calories),
          protein: toNumber(item.protein),
          carbs: toNumber(item.carbs),
          fat: toNumber(item.fat),
          source: 'ai',
        }
      })
      .filter(isFoodSearchResult)
      .slice(0, 5)

    writeCache(aiSearchCache, AI_CACHE_STORAGE_KEY, normalizedQuery, mapped)
    return withCacheStatus(mapped, 'live')
  } catch {
    return []
  }
}

export function rankFoodResults(query: string, results: FoodSearchResult[]): FoodSearchResult[] {
  const normalizedQuery = normalizeQuery(query)
  if (!normalizedQuery) {
    return results
  }

  const tokens = normalizedQuery.split(/\s+/).filter(Boolean)

  const score = (item: FoodSearchResult): number => {
    const name = item.name.toLowerCase()
    let total = 0

    if (name === normalizedQuery) {
      total += 120
    }
    if (name.startsWith(normalizedQuery)) {
      total += 80
    }
    if (name.includes(normalizedQuery)) {
      total += 45
    }

    const tokenMatches = tokens.filter((token) => name.includes(token)).length
    total += tokenMatches * 12

    if (item.source === 'public') {
      total += 8
    }
    if (item.source === 'local') {
      total += 5
    }

    return total
  }

  return [...results].sort((a, b) => score(b) - score(a))
}
