import { useRef, useState } from 'react'
import {
  getRuntimeAiConfig,
  isAiScanConfigured,
  saveRuntimeGeminiApiKey,
  scanFoodImage,
} from '../services/aiScan'
import type { Food, MealName } from '../types'

type ScanFoodModalProps = {
  selectedMeal: MealName
  onAdd: (food: Food) => void
  onClose: () => void
}

export default function ScanFoodModal({ selectedMeal, onAdd, onClose }: ScanFoodModalProps) {
  const [phase, setPhase] = useState<'idle' | 'scanning' | 'result' | 'error'>('idle')
  const [preview, setPreview] = useState<string | null>(null)
  const [result, setResult] = useState<Food | null>(null)
  const [scanProvider, setScanProvider] = useState<'gemini' | 'offline' | null>(null)
  const [scanMeta, setScanMeta] = useState('')
  const [error, setError] = useState('')
  const [showApiSettings, setShowApiSettings] = useState(false)
  const [geminiKeyInput, setGeminiKeyInput] = useState(() => getRuntimeAiConfig().geminiApiKey)
  const [configStatus, setConfigStatus] = useState('')
  const [aiReady, setAiReady] = useState(() => isAiScanConfigured())
  const fileRef = useRef<HTMLInputElement | null>(null)

  function refreshAiState() {
    setAiReady(isAiScanConfigured())
  }

  function handleSaveKeys() {
    saveRuntimeGeminiApiKey(geminiKeyInput)
    refreshAiState()
    setConfigStatus('Saved locally on this device.')
  }

  function handleClearKeys() {
    saveRuntimeGeminiApiKey('')
    setGeminiKeyInput('')
    refreshAiState()
    setConfigStatus('Local API keys removed.')
  }

  async function handleFile(file: File | null) {
    if (!file) {
      return
    }

    setPreview(URL.createObjectURL(file))
    setPhase('scanning')
    setError('')
    setScanProvider(null)

    try {
      const scan = await scanFoodImage(file)
      setResult({
        name: scan.name,
        calories: scan.calories,
        protein: scan.protein,
        carbs: scan.carbs,
        fat: scan.fat,
      })
      const confidence = scan.confidence ? `Confidence: ${scan.confidence}` : ''
      const notes = scan.notes || ''
      setScanProvider(scan.provider ?? null)
      setScanMeta([confidence, notes].filter(Boolean).join(' • '))
      setPhase('result')
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : 'Could not scan image')
      setPhase('error')
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', zIndex: 100, display: 'grid', alignItems: 'end' }}>
      <div style={{ background: '#131e30', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 430, margin: '0 auto', padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>AI Food Scan</div>
            <div style={{ color: '#64748b', fontSize: 12 }}>Add to {selectedMeal}</div>
          </div>
          <button onClick={onClose} style={{ background: '#1e293b', border: 'none', color: '#94a3b8', borderRadius: 10, padding: '6px 10px', cursor: 'pointer' }}>Close</button>
        </div>

        {preview && <img src={preview} alt="Selected food" style={{ width: '100%', borderRadius: 12, marginTop: 12, maxHeight: 180, objectFit: 'cover' }} />}

        {phase === 'idle' && (
          <div style={{ marginTop: 12 }}>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(event) => {
                void handleFile(event.target.files?.[0] ?? null)
              }}
            />
            <button onClick={() => fileRef.current?.click()} style={{ width: '100%', border: 'none', background: '#22d3ee', color: '#0b1120', borderRadius: 12, padding: 12, fontWeight: 700, cursor: 'pointer' }}>
              Upload food image
            </button>
            <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: 12 }}>
              {aiReady
                ? 'Gemini key detected. Photo will be analysed by Gemini Vision.'
                : 'Offline mode: No Gemini API key. Add your key below or upload for a local estimate.'}
            </p>
            <button
              onClick={() => setShowApiSettings((current) => !current)}
              style={{ marginTop: 8, border: '1px solid #334155', background: 'transparent', color: '#cbd5e1', borderRadius: 10, padding: '8px 10px', cursor: 'pointer', width: '100%' }}
            >
              {showApiSettings ? 'Hide API Settings' : 'Configure API Keys'}
            </button>

            {showApiSettings && (
              <div style={{ marginTop: 8, background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 10 }}>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>Google Gemini API key</div>
                <input
                  value={geminiKeyInput}
                  onChange={(event) => setGeminiKeyInput(event.target.value)}
                  placeholder="AIza..."
                  style={{ width: '100%', boxSizing: 'border-box', background: '#111827', border: '1px solid #334155', borderRadius: 10, color: '#e2e8f0', padding: '9px 10px', marginBottom: 8, fontSize: 12 }}
                />
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>
                  Get a free key at aistudio.google.com. Uses gemini-2.0-flash vision model.
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={handleSaveKeys}
                    style={{ flex: 1, border: 'none', background: '#22d3ee', color: '#0b1120', borderRadius: 10, padding: '8px 10px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Save Keys
                  </button>
                  <button
                    onClick={handleClearKeys}
                    style={{ flex: 1, border: '1px solid #334155', background: 'transparent', color: '#cbd5e1', borderRadius: 10, padding: '8px 10px', cursor: 'pointer' }}
                  >
                    Clear Keys
                  </button>
                </div>
                {!!configStatus && <div style={{ marginTop: 8, fontSize: 11, color: '#64748b' }}>{configStatus}</div>}
              </div>
            )}
          </div>
        )}

        {phase === 'scanning' && <div style={{ marginTop: 12, color: '#94a3b8', fontSize: 13 }}>Analyzing image...</div>}

        {phase === 'error' && (
          <div style={{ marginTop: 12 }}>
            <div style={{ color: '#f87171', fontSize: 12 }}>{error}</div>
            <button onClick={() => setPhase('idle')} style={{ marginTop: 8, border: 'none', background: '#1e293b', color: '#e2e8f0', borderRadius: 10, padding: '8px 10px', cursor: 'pointer' }}>
              Try again
            </button>
          </div>
        )}

        {phase === 'result' && result && (
          <div style={{ marginTop: 12, background: '#0f172a', borderRadius: 12, padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ fontWeight: 600 }}>{result.name}</div>
              {scanProvider && (
                <span
                  style={{
                    fontSize: 10,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    borderRadius: 999,
                    padding: '4px 8px',
                    background:
                      scanProvider === 'gemini'
                        ? '#134e4a'
                        : '#334155',
                    color:
                      scanProvider === 'gemini'
                        ? '#5eead4'
                        : '#cbd5e1',
                  }}
                >
                  {scanProvider === 'gemini' ? 'Gemini Vision' : 'Offline'}
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10 }}>
              {result.calories} kcal • P {result.protein}g • C {result.carbs}g • F {result.fat}g
            </div>
            {!!scanMeta && (
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 10 }}>
                {scanMeta}
              </div>
            )}
            <button
              onClick={() => {
                onAdd(result)
                onClose()
              }}
              style={{ width: '100%', border: 'none', background: '#22d3ee', color: '#0b1120', borderRadius: 12, padding: 10, cursor: 'pointer', fontWeight: 700 }}
            >
              Add to {selectedMeal}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
