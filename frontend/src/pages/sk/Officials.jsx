// SK Officials directory
import { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Icon } from '../../components/Icon'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const MUNIS = ['All','Boac','Buenavista','Gasan','Mogpog','Santa Cruz','Torrijos']

// SK position hierarchy — Chairperson first, then Secretary, Treasurer, then 7 Kagawad
const POSITION_ORDER = [
  'SK Chairperson',
  'SK Secretary',
  'SK Treasurer',
  'SK Kagawad',
]

const POSITION_COLOR = {
  'SK Chairperson': 'var(--blue-800)',
  'SK Secretary':   '#7C3AED',
  'SK Treasurer':   '#B45309',
  'SK Kagawad':     'var(--blue-600)',
}

const POSITION_BADGE = {
  'SK Chairperson': '#EFF6FF',
  'SK Secretary':   '#F5F3FF',
  'SK Treasurer':   '#FFFBEB',
  'SK Kagawad':     '#EFF6FF',
}

const sortByPosition = (a, b) => {
  const pa = POSITION_ORDER.indexOf(a.position) ?? 99
  const pb = POSITION_ORDER.indexOf(b.position) ?? 99
  if (pa !== pb) return pa - pb
  return `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`)
}

export default function SKOfficials() {
  const [officials, setOfficials] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [muni,      setMuni]      = useState('All')

  useEffect(() => {
    axios.get(`${API}/admin/users`)
      .then(r => setOfficials(r.data.users.filter(u => u.role === 'sk_officer')))
      .catch(() => toast.error('Failed to load officials.'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = officials
    .filter(o => {
      const s = `${o.firstName} ${o.lastName} ${o.position || ''} ${o.barangay || ''}`.toLowerCase()
      return s.includes(search.toLowerCase()) && (muni === 'All' || o.municipality === muni)
    })
    .sort(sortByPosition)

  // Group by municipality when viewing All
  const municipalities = MUNIS.filter(m => m !== 'All' && filtered.some(o => o.municipality === m))

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">SK Officials Directory</h1>
          <p className="page-subtitle">Sangguniang Kabataan — Province of Marinduque</p>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {[
            { pos:'SK Chairperson', count: officials.filter(o=>o.position==='SK Chairperson').length },
            { pos:'SK Secretary',   count: officials.filter(o=>o.position==='SK Secretary').length },
            { pos:'SK Treasurer',   count: officials.filter(o=>o.position==='SK Treasurer').length },
            { pos:'SK Kagawad',     count: officials.filter(o=>o.position==='SK Kagawad').length },
          ].map(({ pos, count }) => count > 0 && (
            <div key={pos} style={{ padding:'4px 12px', borderRadius:999, background:POSITION_BADGE[pos], border:`1px solid ${POSITION_COLOR[pos]}30`, fontSize:11, fontWeight:700, color:POSITION_COLOR[pos] }}>
              {pos}: {count}
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:10, marginBottom:18, flexWrap:'wrap' }}>
        <div style={{ position:'relative', flex:1, minWidth:180 }}>
          <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', opacity:0.4 }}><Icon name="search" size={14}/></span>
          <input className="form-input" placeholder="Search officials..." value={search}
            onChange={e => setSearch(e.target.value)} style={{ paddingLeft:36 }} />
        </div>
        <select className="form-select" style={{ width:'auto', minWidth:160 }} value={muni} onChange={e => setMuni(e.target.value)}>
          {MUNIS.map(m => <option key={m} value={m}>{m === 'All' ? 'All Municipalities' : m}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:48 }}>
          <div className="spinner"/>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon"><Icon name="building" size={40}/></div>
            <div className="empty-title">No officials yet</div>
            <div className="empty-desc">Add officials from the Admin Panel.</div>
          </div>
        </div>
      ) : muni === 'All' ? (
        // Group by municipality
        <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
          {municipalities.map(m => (
            <div key={m}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                <div style={{ width:3, height:20, background:'var(--blue-800)', borderRadius:4 }}/>
                <h3 style={{ fontWeight:700, fontSize:15 }}>{m}</h3>
                <span className="badge badge-blue">{filtered.filter(o=>o.municipality===m).length} officials</span>
              </div>
              <OfficialGroup officials={filtered.filter(o => o.municipality === m)} />
            </div>
          ))}
        </div>
      ) : (
        <OfficialGroup officials={filtered} />
      )}
    </div>
  )
}

// Renders officials grouped by position within a municipality
function OfficialGroup({ officials }) {
  const chairperson = officials.filter(o => o.position === 'SK Chairperson')
  const secretary   = officials.filter(o => o.position === 'SK Secretary')
  const treasurer   = officials.filter(o => o.position === 'SK Treasurer')
  const kagawad     = officials.filter(o => o.position === 'SK Kagawad')
  const others      = officials.filter(o => !POSITION_ORDER.includes(o.position))

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {/* Chairperson — featured */}
      {chairperson.map(o => (
        <div key={o._id} style={{ background:'linear-gradient(135deg, #1A3A8F 0%, #2B5CC8 100%)', borderRadius:16, padding:'20px 24px', display:'flex', alignItems:'center', gap:20, color:'white' }}>
          <div style={{ width:64, height:64, borderRadius:16, background:'rgba(255,255,255,0.15)', border:'2px solid rgba(255,255,255,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, fontWeight:800, flexShrink:0 }}>
            {o.firstName?.[0]}{o.lastName?.[0]}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11, fontWeight:700, opacity:0.7, marginBottom:4, textTransform:'uppercase', letterSpacing:'0.5px' }}>SK Chairperson</div>
            <div style={{ fontSize:18, fontWeight:800 }}>{o.firstName} {o.lastName}</div>
            {o.barangay && <div style={{ fontSize:12, opacity:0.65, marginTop:4 }}>Brgy. {o.barangay}, {o.municipality}</div>}
          </div>
          <div style={{ fontSize:28 }}>👑</div>
        </div>
      ))}

      {/* Secretary & Treasurer side by side */}
      {(secretary.length > 0 || treasurer.length > 0) && (
        <div className="grid-2" style={{ gap:12 }}>
          {[...secretary, ...treasurer].map(o => (
            <OfficialCard key={o._id} official={o} />
          ))}
        </div>
      )}

      {/* 7 Kagawad */}
      {kagawad.length > 0 && (
        <div>
          <p style={{ fontSize:11, fontWeight:700, color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:10 }}>
            SK Kagawad ({kagawad.length})
          </p>
          <div className="grid-4">
            {kagawad.map(o => <OfficialCard key={o._id} official={o} />)}
          </div>
        </div>
      )}

      {/* Others — positions not in the standard list */}
      {others.length > 0 && (
        <div className="grid-4">
          {others.map(o => <OfficialCard key={o._id} official={o} />)}
        </div>
      )}
    </div>
  )
}

function OfficialCard({ official: o }) {
  const color  = POSITION_COLOR[o.position]  || 'var(--blue-600)'
  const bgBadge = POSITION_BADGE[o.position] || '#EFF6FF'
  return (
    <div className="card" style={{ textAlign:'center', padding:'18px 14px' }}>
      <div style={{ width:52, height:52, borderRadius:14, background:color, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px', color:'white', fontWeight:800, fontSize:18, boxShadow:`0 4px 14px ${color}50` }}>
        {o.firstName?.[0]}{o.lastName?.[0]}
      </div>
      <p style={{ fontWeight:700, fontSize:13, marginBottom:4 }}>{o.firstName} {o.lastName}</p>
      {o.position && (
        <div style={{ display:'inline-block', padding:'3px 10px', borderRadius:999, background:bgBadge, border:`1px solid ${color}40`, fontSize:11, fontWeight:700, color, marginBottom:8 }}>
          {o.position}
        </div>
      )}
      {o.barangay && <p style={{ fontSize:11, color:'var(--text-faint)', marginTop:4 }}>Brgy. {o.barangay}</p>}
      <p style={{ fontSize:11, color:'var(--text-faint)' }}>{o.municipality}</p>
    </div>
  )
}