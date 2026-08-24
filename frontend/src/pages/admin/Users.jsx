// admin/Users.jsx — Manage all users
// Separated into SK Officials and Kabataan tabs
// Three-dots dropdown for actions
import { useState, useEffect, useRef } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'

const C = {
  navy:'#0C2340', navyL:'#E8EEF8', gold:'#B8860B', goldL:'#FDF8EC',
  green:'#14532D', greenL:'#F0FDF4', red:'#7F1D1D', redL:'#FFF1F2',
  border:'#CBD5E1', white:'#FFFFFF', text:'#0F172A', muted:'#64748B', faint:'#94A3B8',
  bg:'#F1F5F9',
}

const ROLES = {
  admin:          { label:'Admin/IT',       color:C.red,    bg:C.redL   },
  sk_chairperson: { label:'SK Chairperson', color:C.navy,   bg:C.navyL  },
  sk_secretary:   { label:'SK Secretary',   color:C.green,  bg:C.greenL },
  sk_treasurer:   { label:'SK Treasurer',   color:C.gold,   bg:C.goldL  },
  sk_kagawad:     { label:'SK Kagawad',     color:'#1D4ED8', bg:'#EFF6FF' },
  kabataan:       { label:'Kabataan',       color:'#6D28D9', bg:'#F5F3FF' },
}

const SK_ROLES = ['sk_chairperson','sk_secretary','sk_treasurer','sk_kagawad']

function RoleBadge({ role }) {
  const cfg = ROLES[role] || { label: role, color: C.muted, bg: C.bg }
  return (
    <span style={{ fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:999, background:cfg.bg, color:cfg.color, letterSpacing:'0.3px' }}>
      {cfg.label}
    </span>
  )
}

function StatusBadge({ active }) {
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:999,
      background: active ? C.greenL : C.redL, color: active ? C.green : C.red }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background: active ? C.green : C.red }} />
      {active ? 'Active' : 'Inactive'}
    </span>
  )
}

// Three-dots dropdown menu
function ActionMenu({ user, onToggle, onReset, onDelete }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} style={{ position:'relative', display:'inline-block' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width:30, height:30, border:`1px solid ${C.border}`, borderRadius:6,
        background:C.white, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:16, color:C.muted, lineHeight:1, fontWeight:700,
      }}>
        ⋯
      </button>
      {open && (
        <div style={{
          position:'absolute', right:0, top:36, zIndex:20,
          background:C.white, border:`1px solid ${C.border}`, borderRadius:8,
          boxShadow:'0 8px 24px rgba(0,0,0,0.12)', minWidth:170, overflow:'hidden',
        }}>
          <button onClick={() => { onToggle(); setOpen(false) }} style={menuItem(C.text)}>
            {user.isActive ? '🚫  Deactivate' : '✓  Activate'}
          </button>
          <button onClick={() => { onReset(); setOpen(false) }} style={menuItem(C.text)}>
            🔑  Reset Password
          </button>
          <div style={{ borderTop:`1px solid ${C.border}` }} />
          <button onClick={() => { onDelete(); setOpen(false) }} style={menuItem(C.red)}>
            🗑  Delete Account
          </button>
        </div>
      )}
    </div>
  )
}

const menuItem = (color) => ({
  display:'block', width:'100%', textAlign:'left', padding:'10px 14px',
  border:'none', background:C.white, cursor:'pointer', fontSize:12,
  fontWeight:600, color, transition:'background 0.1s',
})

export default function AdminUsers() {
  const [users,   setUsers]   = useState([])
  const [tab,     setTab]     = useState('sk')   // 'sk' or 'kabataan'
  const [search,  setSearch]  = useState('')
  const [loading, setLoading] = useState(true)
  const [msg,     setMsg]     = useState('')

  const load = async () => {
    setLoading(true)
    const r = await axios.get(`${API}/admin/users`)
    setUsers(r.data.users)
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const skOfficials = users.filter(u => SK_ROLES.includes(u.role))
  const kabataan    = users.filter(u => u.role === 'kabataan')

  const shown = (tab === 'sk' ? skOfficials : kabataan).filter(u =>
    search === '' || `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(search.toLowerCase())
  )

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  const toggle = async (id) => {
    await axios.put(`${API}/admin/users/${id}/toggle`, {})
    flash('Account status updated.'); load()
  }
  const remove = async (id, name) => {
    if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return
    await axios.delete(`${API}/admin/users/${id}`)
    flash('User deleted.'); load()
  }
  const resetPw = async (id, name) => {
    const pw = window.prompt(`Enter new password for ${name}:`, 'SKManage2026')
    if (!pw) return
    await axios.put(`${API}/admin/users/${id}/reset-password`, { newPassword: pw })
    flash(`Password reset for ${name}.`)
  }

  return (
    <div style={{ fontFamily:"'Inter','Segoe UI',sans-serif", color:C.text }}>

      {/* Header */}
      <div style={{ marginBottom:24 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
          <div style={{ width:16, height:3, background:C.gold, borderRadius:2 }} />
          <span style={{ fontSize:10, fontWeight:700, color:C.gold, letterSpacing:'2px', textTransform:'uppercase' }}>User Management</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
          <h1 style={{ fontSize:22, fontWeight:800, color:C.navy, margin:0 }}>Users</h1>
          <a href="/admin/create-sk" style={{
            padding:'8px 16px', background:C.navy, color:C.white,
            borderRadius:6, textDecoration:'none', fontSize:12, fontWeight:600,
          }}>+ Create SK Account</a>
        </div>
      </div>

      {msg && (
        <div style={{ background:C.greenL, border:`1px solid #BBF7D0`, color:C.green, padding:'10px 16px', borderRadius:6, marginBottom:16, fontSize:13, fontWeight:600 }}>
          ✓ {msg}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:16, borderBottom:`1px solid ${C.border}` }}>
        <button onClick={() => setTab('sk')} style={tabBtn(tab === 'sk')}>
          SK Officials
          <span style={countPill(tab === 'sk')}>{skOfficials.length}</span>
        </button>
        <button onClick={() => setTab('kabataan')} style={tabBtn(tab === 'kabataan')}>
          Kabataan Members
          <span style={countPill(tab === 'kabataan')}>{kabataan.length}</span>
        </button>
      </div>

      {/* Search */}
      <div style={{ marginBottom:16 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or email..."
          style={{ width:'100%', maxWidth:360, padding:'8px 12px', border:`1px solid ${C.border}`, borderRadius:6, fontSize:12, outline:'none' }} />
      </div>

      {/* Table */}
      <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:8, overflow:'visible' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
          <thead>
            <tr style={{ background:'#FAFBFC', borderBottom:`2px solid ${C.border}` }}>
              {(tab === 'sk'
                ? ['Name','Email','Role','Status','Actions']
                : ['Name','Email','Status','Points','Actions']
              ).map(h => (
                <th key={h} style={{ padding:'11px 16px', textAlign: h==='Actions'?'right':'left', fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'0.4px', whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding:40, textAlign:'center', color:C.faint }}>Loading...</td></tr>
            ) : shown.length === 0 ? (
              <tr><td colSpan={5} style={{ padding:40, textAlign:'center', color:C.faint }}>
                No {tab === 'sk' ? 'SK officials' : 'kabataan members'} found
              </td></tr>
            ) : shown.map((u, i) => (
              <tr key={u._id} style={{ borderBottom:`1px solid ${C.border}`, background: i%2 === 0 ? C.white : '#FAFBFC' }}>
                <td style={{ padding:'12px 16px', fontWeight:600 }}>{u.firstName} {u.lastName}</td>
                <td style={{ padding:'12px 16px', color:C.muted }}>{u.email}</td>
                {tab === 'sk' && <td style={{ padding:'12px 16px' }}><RoleBadge role={u.role} /></td>}
                <td style={{ padding:'12px 16px' }}><StatusBadge active={u.isActive} /></td>
                {tab === 'kabataan' && <td style={{ padding:'12px 16px', fontWeight:700, color:C.navy }}>{u.points || 0} pts</td>}
                <td style={{ padding:'12px 16px', textAlign:'right' }}>
                  <ActionMenu
                    user={u}
                    onToggle={() => toggle(u._id)}
                    onReset={() => resetPw(u._id, `${u.firstName} ${u.lastName}`)}
                    onDelete={() => remove(u._id, `${u.firstName} ${u.lastName}`)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const tabBtn = (active) => ({
  padding:'10px 18px', border:'none', background:'none', cursor:'pointer',
  fontSize:13, fontWeight:700, color: active ? '#0C2340' : '#64748B',
  borderBottom: active ? '2px solid #0C2340' : '2px solid transparent',
  marginBottom:-1, display:'flex', alignItems:'center', gap:8,
})

const countPill = (active) => ({
  fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:999,
  background: active ? '#0C2340' : '#E2E8F0', color: active ? '#fff' : '#64748B',
})