// admin/Users.jsx — user management: SK Officials + Kabataan tabs
import { useState, useEffect, useRef } from 'react'
import { useTheme } from '../../context/theme-utils'
import { Icon } from '../../components/Icon'
import axios from 'axios'
import toast from 'react-hot-toast'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'

const ROLE_LABEL = {
  sk_chairperson:'Chairperson', sk_secretary:'Secretary',
  sk_treasurer:'Treasurer', sk_kagawad:'Kagawad', kabataan:'Kabataan',
}
const SK_ROLES = ['sk_chairperson','sk_secretary','sk_treasurer','sk_kagawad']

export default function AdminUsers() {
  const { T } = useTheme()
  const [users,setUsers]=useState([])
  const [tab,setTab]=useState('sk')
  const [search,setSearch]=useState('')
  const [loading,setLoading]=useState(true)
  const [menuFor,setMenuFor]=useState(null)

  const load = async () => {
    try { const r = await axios.get(`${API}/admin/users`); setUsers(r.data.users) }
    catch { toast.error('Failed to load users.') }
  }
  useEffect(()=>{
    let active = true
    axios.get(`${API}/admin/users`)
      .then(r=>{ if(active) setUsers(r.data.users) })
      .catch(()=>{ if(active) toast.error('Failed to load users.') })
      .finally(()=>{ if(active) setLoading(false) })
    return ()=>{ active=false }
  },[])

  const skOfficials = users.filter(u=>SK_ROLES.includes(u.role))
  const kabataan = users.filter(u=>u.role==='kabataan')
  const shown = (tab==='sk'?skOfficials:kabataan).filter(u=>
    search==='' || `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(search.toLowerCase())
  )

  const toggle = async (id) => { await axios.put(`${API}/admin/users/${id}/toggle`,{}); toast.success('Status updated.'); setMenuFor(null); load() }
  const del = async (id) => {
    if(!window.confirm('Delete this account permanently? This removes their content too.')) return
    await axios.delete(`${API}/admin/users/${id}`); toast.success('User deleted.'); setMenuFor(null); load()
  }
  const resetPw = async (id, name) => {
    const pw = window.prompt(`Enter a new password for ${name}:`, 'SKManage2026')
    if(!pw) return
    await axios.put(`${API}/admin/users/${id}/reset-password`,{ newPassword:pw })
    toast.success(`Password reset for ${name}.`); setMenuFor(null)
  }

  if(loading) return <Loader T={T}/>

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:11, fontWeight:700, color:T.accentText, textTransform:'uppercase', letterSpacing:'1px', marginBottom:6 }}>User Management</div>
        <h1 style={{ fontSize:23, fontWeight:800, margin:0, color:T.text, letterSpacing:'-0.5px' }}>All Users</h1>
        <p style={{ fontSize:13, color:T.text2, margin:'5px 0 0' }}>Manage SK officials and registered kabataan.</p>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:16, borderBottom:`1px solid ${T.border}`, flexWrap:'wrap' }}>
        {[['sk','SK Officials',skOfficials.length],['kabataan','Kabataan',kabataan.length]].map(([k,label,count])=>(
          <button key={k} onClick={()=>setTab(k)} style={{
            padding:'10px 16px', border:'none', background:'none', cursor:'pointer', fontSize:13.5, fontWeight:700,
            color: tab===k?T.accentText:T.text2, borderBottom: tab===k?`2px solid ${T.accent}`:'2px solid transparent', marginBottom:-1,
            display:'flex', alignItems:'center', gap:8,
          }}>
            {label}
            <span style={{ fontSize:11, fontWeight:700, padding:'1px 8px', borderRadius:999, background: tab===k?T.accent:T.surface2, color: tab===k?'#fff':T.text3 }}>{count}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ position:'relative', maxWidth:340, marginBottom:16 }}>
        <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:T.text3 }}><Icon name="search" size={15}/></span>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search users..." style={{
          width:'100%', padding:'10px 12px 10px 36px', border:`1px solid ${T.border}`, borderRadius:9, fontSize:13.5,
          outline:'none', background:T.surface, color:T.text, boxSizing:'border-box',
        }}/>
      </div>

      {/* Cards (responsive — no table overflow on mobile) */}
      {shown.length===0
        ? <div style={{ textAlign:'center', padding:'50px 0', color:T.text3, fontSize:13.5 }}>No {tab==='sk'?'SK officials':'kabataan'} found</div>
        : <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:12 }}>
            {shown.map(u=>{
              const label = ROLE_LABEL[u.role]||u.role
              return (
                <div key={u._id} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:16, boxShadow:T.shadow, position:'relative' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ width:44, height:44, borderRadius:12, background:T.accent+'18', color:T.accentText, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:800, flexShrink:0 }}>
                      {u.firstName?.[0]}{u.lastName?.[0]}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:14, fontWeight:700, color:T.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{u.firstName} {u.lastName}</div>
                      <div style={{ fontSize:12, color:T.text3, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{u.email}</div>
                    </div>
                    <Menu T={T} open={menuFor===u._id} onOpen={()=>setMenuFor(menuFor===u._id?null:u._id)}
                      onToggle={()=>toggle(u._id)} onReset={()=>resetPw(u._id, `${u.firstName} ${u.lastName}`)} onDelete={()=>del(u._id)}
                      isActive={u.isActive}/>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:12, flexWrap:'wrap' }}>
                    <span style={{ fontSize:10.5, fontWeight:700, padding:'3px 10px', borderRadius:999, background:T.accent+'15', color:T.accentText }}>{label}</span>
                    <span style={{ fontSize:10.5, fontWeight:700, padding:'3px 10px', borderRadius:999, background: u.isActive?T.greenSoft:T.redSoft, color: u.isActive?T.green:T.red }}>
                      {u.isActive?'Active':'Inactive'}
                    </span>
                    {u.role==='kabataan' && <span style={{ fontSize:11, color:T.text3, marginLeft:'auto' }}>{u.points||0} pts</span>}
                  </div>
                </div>
              )
            })}
          </div>}
    </div>
  )
}

function Menu({ T, open, onOpen, onToggle, onReset, onDelete, isActive }) {
  const ref = useRef()
  useEffect(()=>{
    if(!open) return
    const h = (e)=>{ if(ref.current && !ref.current.contains(e.target)) onOpen() }
    document.addEventListener('mousedown', h)
    return ()=>document.removeEventListener('mousedown', h)
  },[open, onOpen])

  return (
    <div ref={ref} style={{ position:'relative', flexShrink:0 }}>
      <button onClick={onOpen} style={{ width:32, height:32, borderRadius:8, border:`1px solid ${T.border}`, background:T.surface2, color:T.text2, cursor:'pointer', fontSize:16, fontWeight:800, lineHeight:1, display:'flex', alignItems:'center', justifyContent:'center' }}>⋯</button>
      {open && (
        <div style={{ position:'absolute', right:0, top:38, background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, boxShadow:T.shadowMd, zIndex:20, minWidth:160, overflow:'hidden' }}>
          {[
            { label:isActive?'Deactivate':'Activate', fn:onToggle, c:T.text },
            { label:'Reset Password', fn:onReset, c:T.text },
            { label:'Delete', fn:onDelete, c:T.red },
          ].map((it,i,arr)=>(
            <button key={it.label} onClick={it.fn} style={{
              width:'100%', textAlign:'left', padding:'10px 14px', background:'none', border:'none',
              borderBottom: i<arr.length-1?`1px solid ${T.border}`:'none',
              fontSize:13, fontWeight:600, color:it.c, cursor:'pointer',
            }}>{it.label}</button>
          ))}
        </div>
      )}
    </div>
  )
}
function Loader({ T }) {
  return <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:400 }}>
    <div style={{ width:30, height:30, border:`2.5px solid ${T.border}`, borderTopColor:T.accent, borderRadius:'50%', animation:'sp .7s linear infinite' }}/>
    <style>{`@keyframes sp{to{transform:rotate(360deg)}}`}</style>
  </div>
}