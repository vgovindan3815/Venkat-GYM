import { useState } from 'react'
import type { Food, RegisterAccountInput, UserAccount, UserRole } from '../types'

type AdminPanelProps = {
  customFoods: Food[]
  onAddFood: (food: Food) => void
  onDeleteFood: (index: number) => void
  accounts: UserAccount[]
  currentAdminEmail: string
  onCreateAccount: (input: RegisterAccountInput, role: UserRole) => { ok: boolean; error?: string }
  onDeleteAccount: (email: string) => void
  onUpdateAccount: (email: string, updates: Partial<Omit<UserAccount, 'email' | 'createdAt'>>) => { ok: boolean; error?: string }
}

export default function AdminPanel({ customFoods, onAddFood, onDeleteFood, accounts, currentAdminEmail, onCreateAccount, onDeleteAccount, onUpdateAccount }: AdminPanelProps) {
  const [name, setName] = useState('')
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newDisplayName, setNewDisplayName] = useState('')
  const [newFullName, setNewFullName] = useState('')
  const [newAge, setNewAge] = useState('')
  const [newSex, setNewSex] = useState<'male' | 'female' | 'other' | ''>('')
  const [newPhone, setNewPhone] = useState('')
  const [newRole, setNewRole] = useState<UserRole>('user')
  const [accountError, setAccountError] = useState('')
  const [accountSearch, setAccountSearch] = useState('')
  const [accountRoleFilter, setAccountRoleFilter] = useState<'all' | UserRole>('all')
  const [editingEmail, setEditingEmail] = useState('')
  const [editDisplayName, setEditDisplayName] = useState('')
  const [editFullName, setEditFullName] = useState('')
  const [editAge, setEditAge] = useState('')
  const [editSex, setEditSex] = useState<'male' | 'female' | 'other' | ''>('')
  const [editPhone, setEditPhone] = useState('')
  const [editRole, setEditRole] = useState<UserRole>('user')
  const [editPassword, setEditPassword] = useState('')

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

  function submitAccount() {
    const result = onCreateAccount({
      email: newEmail,
      password: newPassword,
      displayName: newDisplayName,
      fullName: newFullName,
      age: newAge ? Number(newAge) : null,
      sex: newSex || null,
      phone: newPhone,
    }, newRole)

    if (!result.ok) {
      setAccountError(result.error || 'Unable to create account.')
      return
    }

    setAccountError('')
    setNewEmail('')
    setNewPassword('')
    setNewDisplayName('')
    setNewFullName('')
    setNewAge('')
    setNewSex('')
    setNewPhone('')
    setNewRole('user')
  }

  function startEdit(account: UserAccount) {
    setEditingEmail(account.email)
    setEditDisplayName(account.displayName)
    setEditFullName(account.fullName)
    setEditAge(account.age ? String(account.age) : '')
    setEditSex(account.sex || '')
    setEditPhone(account.phone || '')
    setEditRole(account.role)
    setEditPassword('')
    setAccountError('')
  }

  function cancelEdit() {
    setEditingEmail('')
    setEditDisplayName('')
    setEditFullName('')
    setEditAge('')
    setEditSex('')
    setEditPhone('')
    setEditRole('user')
    setEditPassword('')
  }

  function submitEdit() {
    if (!editingEmail) return
    const result = onUpdateAccount(editingEmail, {
      displayName: editDisplayName.trim(),
      fullName: editFullName.trim() || editDisplayName.trim(),
      age: editAge ? Number(editAge) : null,
      sex: editSex || null,
      phone: editPhone.trim(),
      role: editRole,
      ...(editPassword ? { password: editPassword } : {}),
    })

    if (!result.ok) {
      setAccountError(result.error || 'Unable to update account.')
      return
    }

    cancelEdit()
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

  const visibleAccounts = accounts.filter((account) => {
    if (accountRoleFilter !== 'all' && account.role !== accountRoleFilter) {
      return false
    }

    const query = accountSearch.trim().toLowerCase()
    if (!query) return true

    const haystack = `${account.displayName} ${account.fullName} ${account.email}`.toLowerCase()
    return haystack.includes(query)
  })

  return (
    <div style={{ background: '#131e30', borderRadius: 16, padding: 16 }}>
      <h3 style={{ marginTop: 0, marginBottom: 12 }}>Admin: Manage Profiles</h3>
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 12, marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Create user/admin profile</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
          <input value={newDisplayName} onChange={(event) => setNewDisplayName(event.target.value)} placeholder="Display name" style={inputStyle} />
          <input value={newFullName} onChange={(event) => setNewFullName(event.target.value)} placeholder="Full name" style={inputStyle} />
          <input value={newEmail} onChange={(event) => setNewEmail(event.target.value)} placeholder="Email" style={inputStyle} />
          <input value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="Password" type="password" style={inputStyle} />
          <input value={newAge} onChange={(event) => setNewAge(event.target.value)} placeholder="Age" type="number" style={inputStyle} />
          <select value={newSex} onChange={(event) => setNewSex(event.target.value as 'male' | 'female' | 'other' | '')} style={inputStyle}>
            <option value="">Sex</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
          <input value={newPhone} onChange={(event) => setNewPhone(event.target.value)} placeholder="Phone" style={inputStyle} />
          <select value={newRole} onChange={(event) => setNewRole(event.target.value as UserRole)} style={inputStyle}>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        {accountError && <div style={{ fontSize: 12, color: '#f87171', marginBottom: 8 }}>{accountError}</div>}
        <button onClick={submitAccount} style={{ width: '100%', border: 'none', background: '#4ade80', color: '#052e16', borderRadius: 10, padding: '10px 12px', fontWeight: 700, cursor: 'pointer' }}>
          Create Profile
        </button>
      </div>

      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Local profiles ({visibleAccounts.length} / {accounts.length})</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 8, marginBottom: 10 }}>
        <input
          value={accountSearch}
          onChange={(event) => setAccountSearch(event.target.value)}
          placeholder="Search by name or email"
          style={inputStyle}
        />
        <select
          value={accountRoleFilter}
          onChange={(event) => setAccountRoleFilter(event.target.value as 'all' | UserRole)}
          style={inputStyle}
        >
          <option value="all">All roles</option>
          <option value="user">Users</option>
          <option value="admin">Admins</option>
        </select>
      </div>
      <div style={{ marginBottom: 16 }}>
        {visibleAccounts.map((account) => (
          <div key={account.email} style={{ borderTop: '1px solid #1e293b', padding: '10px 0' }}>
            {editingEmail === account.email ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <input value={editDisplayName} onChange={(event) => setEditDisplayName(event.target.value)} placeholder="Display name" style={inputStyle} />
                <input value={editFullName} onChange={(event) => setEditFullName(event.target.value)} placeholder="Full name" style={inputStyle} />
                <input value={editAge} onChange={(event) => setEditAge(event.target.value)} placeholder="Age" type="number" style={inputStyle} />
                <select value={editSex} onChange={(event) => setEditSex(event.target.value as 'male' | 'female' | 'other' | '')} style={inputStyle}>
                  <option value="">Sex</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
                <input value={editPhone} onChange={(event) => setEditPhone(event.target.value)} placeholder="Phone" style={inputStyle} />
                <select value={editRole} onChange={(event) => setEditRole(event.target.value as UserRole)} style={inputStyle}>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
                <input value={editPassword} onChange={(event) => setEditPassword(event.target.value)} placeholder="New password (optional)" type="password" style={{ ...inputStyle, gridColumn: '1 / -1' }} />
                <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8 }}>
                  <button onClick={submitEdit} style={{ flex: 1, border: 'none', background: '#22d3ee', color: '#0b1120', borderRadius: 10, padding: '9px 10px', fontWeight: 700, cursor: 'pointer' }}>Save</button>
                  <button onClick={cancelEdit} style={{ border: '1px solid #334155', background: 'transparent', color: '#94a3b8', borderRadius: 10, padding: '9px 12px', cursor: 'pointer' }}>Cancel</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, color: '#e2e8f0' }}>{account.displayName} <span style={{ fontSize: 10, color: '#22d3ee' }}>({account.role})</span></div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{account.email}</div>
                  <div style={{ fontSize: 11, color: '#475569' }}>{account.fullName}{account.age ? ` • ${account.age}` : ''}{account.sex ? ` • ${account.sex}` : ''}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => startEdit(account)}
                    style={{ border: 'none', background: 'none', color: '#22d3ee', cursor: 'pointer' }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDeleteAccount(account.email)}
                    disabled={account.email === currentAdminEmail}
                    style={{ border: 'none', background: 'none', color: account.email === currentAdminEmail ? '#475569' : '#f87171', cursor: account.email === currentAdminEmail ? 'not-allowed' : 'pointer' }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {visibleAccounts.length === 0 && (
          <div style={{ color: '#64748b', fontSize: 12, padding: '10px 0' }}>No profiles match your filters.</div>
        )}
      </div>

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
