// admin/CreateSKAccount.jsx — admin creates SK official accounts
import { useState } from 'react'
import { useTheme } from '../../context/theme-utils'
import { Icon } from '../../components/Icon'
import axios from 'axios'
import toast from 'react-hot-toast'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'
const DEFAULT_PASSWORD = 'SKManage2026'

const ROLES = [
  { value:'sk_chairperson', label:'SK Chairperson', desc:'Full access, approves finances', icon:'shield' },
  { value:'sk_secretary',   label:'SK Secretary',   desc:'Announcements, meetings, minutes', icon:'clipboardList' },
  { value:'sk_treasurer',   label:'SK Treasurer',   desc:'Budget and financial records', icon:'banknotes' },
  { value:'sk_kagawad',     label:'SK Kagawad',     desc:'Council member (up to 7)', icon:'users' },
]

export default function CreateSKAccount() {
  const { T } = useTheme()
  const [form,setForm]=useState({ firstName:'', lastName:'', email:'', role:'sk_kagawad' })
  const [saving,setSaving]=useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if(!form.firstName || !form.lastName || !form.email) return toast.error('Please fill all fields.')
    setSaving(true)
    try {
      const r = await axios.post(`${API}/admin/create-sk`, { ...form, password:DEFAULT_PASSWORD })
      toast.success(r.data.message || 'Account created.')
      setForm({ firstName:'', lastName:'', email:'', role:'sk_kagawad' })
    } catch(err) {
      toast.error(err.response?.data?.message || 'Could not create account.')
    } finally { setSaving(false) }
  }

  const field = { width:'100%', padding:'11px 13px', border:`1px solid ${T.border}`, borderRadius:10, fontSize:14, outline:'none', boxSizing:'border-box', background:T.surface, color:T.text, fontFamily:'inherit' }
  const lbl = { fontSize:12, fontWeight:700, color:T.text2, display:'block', marginBottom:7 }

  return (
    <div style={{ maxWidth:640 }}>
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:11, fontWeight:700, color:T.accentText, textTransform:'uppercase', letterSpacing:'1px', marginBottom:6 }}>User Management</div>
        <h1 style={{ fontSize:23, fontWeight:800, margin:0, color:T.text, letterSpacing:'-0.5px' }}>Create SK Account</h1>
        <p style={{ fontSize:13, color:T.text2, margin:'5px 0 0' }}>Issue an account for a Sangguniang Kabataan official.</p>
      </div>

      <form onSubmit={submit} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:14, padding:24, boxShadow:T.shadow }}>
        <div className="cs-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:16 }}>
          <div><label style={lbl}>First Name</label><input style={field} value={form.firstName} onChange={e=>setForm({...form,firstName:e.target.value})} placeholder="Juan"/></div>
          <div><label style={lbl}>Last Name</label><input style={field} value={form.lastName} onChange={e=>setForm({...form,lastName:e.target.value})} placeholder="Dela Cruz"/></div>
        </div>

        <div style={{ marginBottom:20 }}>
          <label style={lbl}>Email Address</label>
          <input type="email" style={field} value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="official@email.com"/>
        </div>

        <label style={lbl}>Role</label>
        <div className="cs-roles" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:20 }}>
          {ROLES.map(r=>{
            const sel = form.role===r.value
            return (
              <button key={r.value} type="button" onClick={()=>setForm(f=>({...f,role:r.value}))} style={{
                display:'flex', alignItems:'flex-start', gap:11, padding:'13px 14px', textAlign:'left', cursor:'pointer',
                borderRadius:11, border: sel?`2px solid ${T.accent}`:`1px solid ${T.border}`,
                background: sel?T.accentSoft:T.surface, transition:'all 0.12s',
              }}>
                <div style={{ width:34, height:34, borderRadius:9, background: sel?T.accent:T.surface2, color: sel?'#fff':T.text2, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Icon name={r.icon} size={16}/>
                </div>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:T.text }}>{r.label}</div>
                  <div style={{ fontSize:11, color:T.text3, marginTop:2, lineHeight:1.4 }}>{r.desc}</div>
                </div>
              </button>
            )
          })}
        </div>

        <div style={{ background:T.amberSoft, border:`1px solid ${T.amber}33`, borderRadius:10, padding:'12px 14px', marginBottom:20, fontSize:12.5, color:T.amber, lineHeight:1.5 }}>
          <strong>Default password:</strong> {DEFAULT_PASSWORD} — the official should change this after first login.
        </div>

        <button type="submit" disabled={saving} style={{
          width:'100%', padding:'13px', border:'none', borderRadius:11, fontSize:14.5, fontWeight:700, cursor: saving?'default':'pointer',
          background: saving?T.text3:T.accent, color:'#fff',
        }}>{saving?'Creating…':'Create Account'}</button>
      </form>

      <style>{`
        @media (max-width: 560px) {
          .cs-grid { grid-template-columns: 1fr !important; }
          .cs-roles { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}