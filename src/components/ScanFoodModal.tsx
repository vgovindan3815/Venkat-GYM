import { useRef, useState } from 'react'
import { scanFoodImage } from '../services/aiScan'
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
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement | null>(null)

  async function handleFile(file: File | null) {
    if (!file) {
      return
    }

    setPreview(URL.createObjectURL(file))
    setPhase('scanning')
    setError('')

    try {
      const scan = await scanFoodImage(file)
      setResult({
        name: scan.name,
        calories: scan.calories,
        protein: scan.protein,
        carbs: scan.carbs,
        fat: scan.fat,
      })
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
              Requires VITE_OPENROUTER_API_KEY in your environment.
            </p>
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
            <div style={{ fontWeight: 600, marginBottom: 6 }}>{result.name}</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10 }}>
              {result.calories} kcal • P {result.protein}g • C {result.carbs}g • F {result.fat}g
            </div>
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
