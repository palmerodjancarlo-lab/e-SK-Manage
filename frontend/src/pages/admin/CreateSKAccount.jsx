// admin/CreateSKAccount.jsx
import { useState } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'

const DEFAULT_PASSWORD = 'SKManage2026'

const C = {
  navy:'#0C2340', gold:'#B8860B', goldL:'#FDF8EC',
  green:'#14532D', greenL:'#F0FDF4', red:'#7F1D1D', redL:'#FFF1F2',
  border:'#CBD5E1', white:'#FFFFFF', text:'#0F172A', muted:'#64748B',
  bg:'#F1F5F9',
}

const SK_ROLES = [
  { value:'sk_chairperson', label:'SK Chairperson', note:'1 only — full system access' },
  { value:'sk_secretary',   label:'SK Secretary',   note:'1 only — announcements & documents' },
  { value:'sk_treasurer',   label:'SK Treasurer',   note:'1 only — financial records' },
  { value:'sk_kagawad',     label:'SK Kagawad',     note:'Up to 7 — basic SK access' },
]

export default function CreateSKAccount() {
  const [form, setForm] = useState({
    firstName:'', lastName:'', email:'', role:'sk_kagawad',
  })
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setSuccess(''); setLoading(true)
    try {
      // Password defaults to SKManage2026 — official changes it after first login
      const payload = { ...form, password: DEFAULT_PASSWORD }
      const r = await axios.post(`${API}/admin/create-sk`, payload)
      setSuccess(`✓ ${r.data.message} Default password: ${DEFAULT_PASSWORD}`)
      setForm({ firstName:'', lastName:'', email:'', role:'sk_kagawad' })
    } catch(e) {
      setError(e.response?.data?.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const inp = (label, key, type='text', placeholder='') => (
    <div>
      <label style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'0.4px', display:'block', marginBottom:4 }}>
        {label}
      </label>
      <input
        type={type}
        value={form[key]}
        onChange={e => setForm(f => ({...f, [key]:e.target.value}))}
        placeholder={placeholder}
        style={{ width:'100%', padding:'9px 12px', border:`1px solid ${C.border}`, borderRadius:6, fontSize:13, outline:'none', boxSizing:'border-box' }}
      />
    </div>
  )

  return (
    <div style={{ fontFamily:"'Inter','Segoe UI',sans-serif", color:C.text, maxWidth:560 }}>

      <div style={{ marginBottom:24 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
          <div style={{ width:16, height:3, background:C.gold, borderRadius:2 }} />
          <span style={{ fontSize:10, fontWeight:700, color:C.gold, letterSpacing:'2px', textTransform:'uppercase' }}>Account Management</span>
        </div>
        <h1 style={{ fontSize:22, fontWeight:800, color:C.navy, margin:0 }}>Create SK Account</h1>
        <p style={{ fontSize:12, color:C.muted, marginTop:4 }}>
          SK Officials cannot self-register. Create their account here and give them the login credentials.
        </p>
      </div>

      {error && (
        <div style={{ background:C.redL, border:`1px solid #FECACA`, color:C.red, padding:'10px 14px', borderRadius:6, marginBottom:16, fontSize:13 }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ background:C.greenL, border:`1px solid #BBF7D0`, color:C.green, padding:'10px 14px', borderRadius:6, marginBottom:16, fontSize:13, fontWeight:600 }}>
          {success}
        </div>
      )}

      <form onSubmit={submit}>
        <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:8, overflow:'hidden' }}>

          {/* Role selector */}
          <div style={{ padding:'16px 20px', borderBottom:`1px solid ${C.border}`, background:'#FAFBFC' }}>
            <label style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'0.4px', display:'block', marginBottom:10 }}>
              SK Role
            </label>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {SK_ROLES.map(r => (
                <button key={r.value} type="button" onClick={() => setForm(f=>({...f, role:r.value}))}
                  style={{
                    padding:'10px 12px', borderRadius:6, cursor:'pointer', textAlign:'left',
                    border: form.role === r.value ? `2px solid ${C.navy}` : `1px solid ${C.border}`,
                    background: form.role === r.value ? C.goldL : C.white,
                    transition:'all 0.12s',
                  }}>
                  <div style={{ fontSize:12, fontWeight:700, color: form.role === r.value ? C.navy : C.text }}>{r.label}</div>
                  <div style={{ fontSize:10, color:C.muted, marginTop:2 }}>{r.note}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Form fields */}
          <div style={{ padding:20, display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              {inp('First Name', 'firstName', 'text', 'Juan')}
              {inp('Last Name',  'lastName',  'text', 'Dela Cruz')}
            </div>
            {inp('Email Address', 'email', 'email', 'official@eskmanage.com')}

            {/* Default password note */}
            <div style={{ background:C.goldL, border:`1px solid #FDE68A`, borderRadius:6, padding:'12px 14px' }}>
              <p style={{ fontSize:12, color:C.text, margin:'0 0 4px', fontWeight:700 }}>
                🔑 Default Password: <span style={{ color:C.navy, fontFamily:'monospace' }}>{DEFAULT_PASSWORD}</span>
              </p>
              <p style={{ fontSize:11, color:C.muted, margin:0 }}>
                The official will use this to log in, then change it in their settings. Barangay is automatically set to <strong>Tawiran, Sta. Cruz</strong>.
              </p>
            </div>

            <button type="submit" disabled={loading} style={{
              padding:'11px 20px', background:loading ? C.muted : C.navy,
              color:C.white, border:'none', borderRadius:6,
              fontSize:13, fontWeight:700, cursor:loading ? 'not-allowed' : 'pointer',
              marginTop:4,
            }}>
              {loading ? 'Creating...' : 'Create SK Account'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}