import { useState, useEffect } from 'react'
import { Icon } from '../../components/Icon'
import axios from 'axios'
import toast from 'react-hot-toast'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const MUNIS = ['All','Boac','Buenavista','Gasan','Mogpog','Santa Cruz','Torrijos']

export default function KabataanOfficials() {
  const [officials, setOfficials] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [muni,      setMuni]      = useState('All')

  useEffect(() => {
    axios.get(`${API}/admin/users`)
      .then(r => setOfficials(r.data.users.filter(u => u.role === 'sk_officer')))
      .catch(() => toast.error('Failed.'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = officials.filter(o => {
    const s = `${o.firstName} ${o.lastName} ${o.position||''} ${o.barangay||''}`.toLowerCase()
    return s.includes(search.toLowerCase()) && (muni==='All'||o.municipality===muni)
  })

  return (
    <div style={{ paddingBottom:80 }}>
      <div style={{ background:'#0F1F5C', padding:'18px 20px 20px' }}>
        <h1 style={{ color:'white', fontSize:20, fontWeight:800, marginBottom:3 }}>SK Officials</h1>
        <p style={{ color:'rgba(255,255,255,0.45)', fontSize:13 }}>Sangguniang Kabataan — Marinduque</p>
      </div>
      <div style={{ padding:'16px' }}>
        <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
          <div style={{ position:'relative', flex:1, minWidth:160 }}>
            <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-faint)', display:'flex' }}><Icon name="search" size={14}/></span>
            <input className="form-input" placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)} style={{ paddingLeft:36 }} />
          </div>
          <select className="form-select" style={{ width:'auto', minWidth:140 }} value={muni} onChange={e=>setMuni(e.target.value)}>
            {MUNIS.map(m=><option key={m}>{m==='All'?'All Municipalities':m}</option>)}
          </select>
        </div>

        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:48 }}><div className="spinner"/></div>
        ) : filtered.length === 0 ? (
          <div className="card"><div className="empty-state"><div className="empty-icon"><Icon name="building" size={40}/></div><div className="empty-title">No officials yet</div></div></div>
        ) : (
          <div className="grid-2">
            {filtered.map(o => (
              <div key={o._id} className="card" style={{ textAlign:'center', padding:'18px 14px' }}>
                <div className="avatar avatar-lg" style={{ margin:'0 auto 12px', background:o.role==='sk_officer'?'#0F1F5C':'var(--blue-600)' }}>
                  {o.firstName?.[0]}{o.lastName?.[0]}
                </div>
                <p style={{ fontWeight:700, fontSize:13, marginBottom:3 }}>{o.firstName} {o.lastName}</p>
                {o.position && <p style={{ fontSize:11, color:'var(--blue-800)', fontWeight:600, marginBottom:6 }}>{o.position}</p>}
                <span className={`badge ${o.role==='sk_officer'?'badge-blue':'badge-gray'}`}>
                  {'SK Officer'}
                </span>
                <p style={{ fontSize:11, color:'var(--text-faint)', marginTop:8 }}>
                  {o.barangay&&`Brgy. ${o.barangay}, `}{o.municipality}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}