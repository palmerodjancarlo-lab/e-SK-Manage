// sk/Members.jsx — Member directory (SK officials + kabataan)
import { useState, useEffect } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'

const T = {
  bg:'#F7F8FA', card:'#FFFFFF', ink:'#111827', slate:'#6B7280', faint:'#9CA3AF',
  line:'#EEF0F3', indigo:'#4F46E5', indigoSoft:'#EEF0FF',
  emerald:'#059669', amber:'#D97706', sky:'#0284C7', violet:'#7C3AED', rose:'#E11D48',
}

const ROLES = {
  sk_chairperson:{ label:'Chairperson', color:T.indigo },
  sk_secretary:  { label:'Secretary',   color:T.emerald },
  sk_treasurer:  { label:'Treasurer',   color:T.amber },
  sk_kagawad:    { label:'Kagawad',     color:T.sky },
  kabataan:      { label:'Kabataan',    color:T.violet },
}

export default function SKMembers() {
  const [users,setUsers]=useState([])
  const [tab,setTab]=useState('officials')
  const [search,setSearch]=useState('')
  const [loading,setLoading]=useState(true)

  useEffect(()=>{
    axios.get(`${API}/auth/members`).then(r=>{
      setUsers((r.data.users||[]).filter(u=>u.role!=='admin'))
    }).catch(()=>{}).finally(()=>setLoading(false))
  },[])

  const SK=['sk_chairperson','sk_secretary','sk_treasurer','sk_kagawad']
  const officials=users.filter(u=>SK.includes(u.role))
  const kabataan=users.filter(u=>u.role==='kabataan')
  const shown=(tab==='officials'?officials:kabataan).filter(u=>
    search===''||`${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ fontFamily:"'Inter','Segoe UI',sans-serif", color:T.ink }}>
      <div style={{ marginBottom:22 }}>
        <h1 style={{ fontSize:22, fontWeight:800, margin:0, letterSpacing:'-0.5px' }}>Member Directory</h1>
        <p style={{ fontSize:12.5, color:T.slate, marginTop:4 }}>SK officials and registered kabataan of Barangay Tawiran.</p>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:16, borderBottom:`1px solid ${T.line}` }}>
        <button onClick={()=>setTab('officials')} style={tabStyle(tab==='officials')}>
          SK Officials <span style={pill(tab==='officials')}>{officials.length}</span>
        </button>
        <button onClick={()=>setTab('kabataan')} style={tabStyle(tab==='kabataan')}>
          Kabataan <span style={pill(tab==='kabataan')}>{kabataan.length}</span>
        </button>
      </div>

      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search members..."
        style={{ width:'100%', maxWidth:360, padding:'9px 12px', border:`1px solid ${T.line}`, borderRadius:9, fontSize:13, outline:'none', marginBottom:18 }} />

      {loading ? <div style={{ textAlign:'center', padding:60, color:T.faint }}>Loading...</div>
        : shown.length===0 ? <div style={{ textAlign:'center', padding:60, color:T.faint }}>No members found</div>
        : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:14 }}>
          {shown.map(u=>{
            const cfg=ROLES[u.role]||{label:u.role,color:T.slate}
            return (
              <div key={u._id} style={{ background:T.card, border:`1px solid ${T.line}`, borderRadius:14, padding:18, display:'flex', alignItems:'center', gap:14 }}>
                <div style={{ width:48, height:48, borderRadius:14, background:cfg.color+'18', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:800, color:cfg.color, flexShrink:0 }}>
                  {u.firstName?.[0]}{u.lastName?.[0]}
                </div>
                <div style={{ minWidth:0, flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.firstName} {u.lastName}</div>
                  <span style={{ display:'inline-block', fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:999, background:cfg.color+'18', color:cfg.color, marginTop:4 }}>{cfg.label}</span>
                  {u.role==='kabataan' && <div style={{ fontSize:11, color:T.faint, marginTop:5 }}>{u.points||0} points</div>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const tabStyle=(active)=>({ padding:'10px 16px', border:'none', background:'none', cursor:'pointer', fontSize:13, fontWeight:700, color:active?'#4F46E5':'#6B7280', borderBottom:active?'2px solid #4F46E5':'2px solid transparent', marginBottom:-1, display:'flex', alignItems:'center', gap:8 })
const pill=(active)=>({ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:999, background:active?'#4F46E5':'#E2E8F0', color:active?'#fff':'#6B7280' })