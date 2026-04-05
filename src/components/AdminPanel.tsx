import { useState } from 'react'
import type { Food } from '../types'

type AdminPanelProps = {
  customFoods: Food[]
  onAddFood: (food: Food) => void
  onDeleteFood: (index: number) => void
}

export default function AdminPanel({ customFoods, onAddFood, onDeleteFood }: AdminPanelProps) {
  const [name, setName] = useState('')
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')

  function submit() {
    if (!name.trim() || !calories.trim()) {
      return
    }

    onAddFood({
      id: `custom-${Date.now()}`,
      name: name.trim(),
      calories: Number(calories),
      protein: Number(protein) || 0,
      carbs: Number(carbs) || 0,
      fat: Number(fat) || 0,
    })

    setName('')
    setCalories('')
    setProtein('')
    setCarbs('')
    setFat('')
  }

  const inputStyle = {
    width: '100%',
    boxSizing: 'border-box' as const,
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: 10,
    color: '#e2e8f0',
    padding: '10px 12px',
    fontSize: 13,
    outline: 'none',
  }

  return (
    <div style={{ background: '#131e30', borderRadius: 16, padding: 16 }}>
      <h3 style={{ marginTop: 0, marginBottom: 12 }}>Admin: Manage Food Catalog</h3>
      <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Food name" style={{ ...inputStyle, marginBottom: 8 }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        <input value={calories} onChange={(event) => setCalories(event.target.value)} placeholder="Calories" type="number" style={inputStyle} />
        <input value={protein} onChange={(event) => setProtein(event.target.value)} placeholder="Protein" type="number" style={inputStyle} />
        <input value={carbs} onChange={(event) => setCarbs(event.target.value)} placeholder="Carbs" type="number" style={inputStyle} />
        <input value={fat} onChange={(event) => setFat(event.target.value)} placeholder="Fat" type="number" style={inputStyle} />
      </div>
      <button onClick={submit} style={{ width: '100%', border: 'none', background: '#22d3ee', color: '#0b1120', borderRadius: 10, padding: '10px 12px', fontWeight: 700, cursor: 'pointer', marginBottom: 14 }}>
        Add Food
      </button>

      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Admin-added foods</div>
      {customFoods.length === 0 && <div style={{ color: '#64748b', fontSize: 12 }}>No custom foods yet.</div>}
      {customFoods.map((food, index) => (
        <div key={food.id || `${food.name}-${index}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #1e293b', padding: '10px 0' }}>
          <div>
            <div style={{ fontSize: 13 }}>{food.name}</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>{food.calories} kcal</div>
          </div>
          <button onClick={() => onDeleteFood(index)} style={{ border: 'none', background: 'none', color: '#f87171', cursor: 'pointer' }}>
            Remove
          </button>
        </div>
      ))}
    </div>
  )
}
