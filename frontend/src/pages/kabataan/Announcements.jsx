import { useState, useEffect } from 'react'
import { Icon } from '../../components/Icon'
import axios from 'axios'
import toast from 'react-hot-toast'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const CATS = ['All','General','Events','Programs','Meetings','Opportunities','History']
const CAT_BADGE = { General:'badge-gray', Events:'badge-blue', Programs:'badge-green', Meetings:'badge-gold', Opportunities:'badge-amber', History:'badge-gray' }

export default function KabataanAnnouncements() {
  const [items,    setItems]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [cat,      setCat]      = useState('All')
  const [search,   setSearch]   = useState('')
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    let cancelled = false
    const params = {}
    if (cat !== 'All') params.category = cat
    if (search) params.search = search
    axios.get(`${API}/announcements`, { params })
      .then(r => { if (!cancelled) { setItems(r.data.announcements); setLoading(false) } })
      .catch(() => { if (!cancelled) { toast.error('Failed to load.'); setLoading(false) } })
    return () => { cancelled = true }
  }, [cat, search])

  return (
    <div style={{ paddingBottom:80 }}>
      <div style={{ background:'#0F1F5C', padding:'18px 20px 20px' }}>
        <h1 style={{ color:'white', fontSize:20, fontWeight:800, marginBottom:3 }}>Announcements</h1>
        <p style={{ color:'rgba(255,255,255,0.45)', fontSize:13 }}>SK news and updates</p>
      </div>

      <div style={{ padding:'16px 16px 0' }}>
        <div style={{ position:'relative', marginBottom:12 }}>
          <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-faint)', display:'flex' }}><Icon name="search" size={14}/></span>
          <input className="form-input" placeholder="Search announcements..." value={search} onChange={e=>setSearch(e.target.value)} style={{ paddingLeft:36 }} />
        </div>
        <div className="tabs" style={{ marginBottom:16 }}>
          {CATS.map(c=><button key={c} className={`tab-btn ${cat===c?'active':''}`} onClick={()=>setCat(c)}>{c}</button>)}
        </div>
      </div>

      <div style={{ padding:'0 16px' }}>
        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:48 }}><div className="spinner"/></div>
        ) : items.length === 0 ? (
          <div className="card"><div className="empty-state"><div className="empty-icon"><Icon name="megaphone" size={40}/></div><div className="empty-title">No Announcements</div></div></div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {items.map(ann => (
              <div key={ann._id} className="card card-hover" style={{ padding:'14px 16px' }} onClick={()=>setSelected(ann)}>
                <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                  <div style={{ width:36, height:36, borderRadius:9, background:ann.isPinned?'var(--gold-100)':'var(--blue-100)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <Icon name="megaphone" size={16} color={ann.isPinned?'var(--gold-600)':'var(--blue-800)'} />
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', gap:6, marginBottom:4, flexWrap:'wrap' }}>
                      <span className={`badge ${CAT_BADGE[ann.category]||'badge-gray'}`}>{ann.category}</span>
                      {ann.isPinned && <span className="badge badge-gold">Pinned</span>}
                    </div>
                    <p style={{ fontWeight:700, fontSize:14, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ann.title}</p>
                    <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:4, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden', lineHeight:1.5 }}>{ann.content}</p>
                    <p style={{ fontSize:11, color:'var(--text-faint)', marginTop:6 }}>{new Date(ann.createdAt).toLocaleDateString('en-PH')}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div className="modal-overlay" onClick={()=>setSelected(null)}>
          <div className="modal-box" style={{ maxWidth:540 }} onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display:'flex', gap:6 }}>
                <span className={`badge ${CAT_BADGE[selected.category]||'badge-gray'}`}>{selected.category}</span>
                {selected.isPinned && <span className="badge badge-gold">Pinned</span>}
              </div>
              <button className="modal-close" onClick={()=>setSelected(null)}><Icon name="x" size={14}/></button>
            </div>
            <div className="modal-body">
              <h2 style={{ fontSize:17, fontWeight:700, marginBottom:8 }}>{selected.title}</h2>
              <p style={{ fontSize:12, color:'var(--text-faint)', marginBottom:16 }}>
                {selected.author?.firstName} {selected.author?.lastName} · {new Date(selected.createdAt).toLocaleDateString('en-PH',{year:'numeric',month:'long',day:'numeric'})}
              </p>
              <p style={{ fontSize:14, lineHeight:1.75, color:'var(--text-muted)', whiteSpace:'pre-wrap' }}>{selected.content}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}