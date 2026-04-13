// Kabataan Meetings — view events, QR token for check-in, open forum comments
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Icon } from '../../components/Icon'
import axios from 'axios'
import toast from 'react-hot-toast'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const TYPE_PTS = { Meeting:10, Workshop:15, Event:20, Seminar:15, Livelihood:20, Sports:15 }

export default function KabataanMeetings() {
  const { user }                = useAuth()
  const [meetings, setMeetings] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [tab,      setTab]      = useState('upcoming')
  const [selected, setSelected] = useState(null)
  const [comment,  setComment]  = useState('')
  const [posting,  setPosting]  = useState(false)

  useEffect(() => {
    setLoading(true)
    axios.get(`${API}/meetings`)
      .then(r => setMeetings(r.data.meetings || []))
      .catch(() => toast.error('Failed to load events.'))
      .finally(() => setLoading(false))
  }, [])

  const now       = new Date()
  const upcoming  = meetings.filter(m => new Date(m.date) >= now)
  const past      = meetings.filter(m => new Date(m.date) < now)
  const displayed = tab === 'upcoming' ? upcoming : past

  const openDetail = async (m) => {
    try {
      const { data } = await axios.get(`${API}/meetings/${m._id}`)
      setSelected(data.meeting)
    } catch { setSelected(m) }
    setComment('')
  }

  const closeDetail = () => { setSelected(null); setComment('') }

  const handleComment = async () => {
    if (!comment.trim()) return
    setPosting(true)
    try {
      const { data } = await axios.post(`${API}/meetings/${selected._id}/comments`, { text: comment.trim() })
      setSelected(prev => ({ ...prev, comments: [...(prev.comments||[]), data.comment] }))
      setComment('')
      toast.success('Comment posted!')
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to post.') }
    finally { setPosting(false) }
  }

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Delete this comment?')) return
    try {
      await axios.delete(`${API}/meetings/${selected._id}/comments/${commentId}`)
      setSelected(prev => ({ ...prev, comments: prev.comments.filter(c => c._id !== commentId) }))
      toast.success('Deleted.')
    } catch { toast.error('Failed.') }
  }

  const pts    = (m) => TYPE_PTS[m.type] || 10
  const isOld  = (m) => new Date(m.date) < now
  const didCheckIn = (m) => m.checkedIn?.some(c => (c.user?._id||c.user)?.toString() === user?._id?.toString())

  return (
    <div style={{ paddingBottom:80 }}>

      <div style={{ background:'#0F1F5C', padding:'18px 20px 22px', position:'relative', overflow:'hidden' }}>
        <div aria-hidden style={{ position:'absolute', bottom:-40, right:-40, width:160, height:160, borderRadius:'50%', background:'rgba(245,196,0,0.08)', pointerEvents:'none' }} />
        <div style={{ position:'relative', zIndex:1 }}>
          <h1 style={{ color:'white', fontSize:20, fontWeight:800, marginBottom:3 }}>Events & Meetings</h1>
          <p style={{ color:'rgba(255,255,255,0.4)', fontSize:13 }}>Join events · Earn points · Share feedback</p>
        </div>
      </div>

      <div style={{ padding:'16px' }}>
        <div className="tabs" style={{ marginBottom:16 }}>
          <button className={`tab-btn ${tab==='upcoming'?'active':''}`} onClick={()=>setTab('upcoming')}>Upcoming ({upcoming.length})</button>
          <button className={`tab-btn ${tab==='past'?'active':''}`} onClick={()=>setTab('past')}>Past ({past.length})</button>
        </div>

        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:48 }}><div className="spinner"/></div>
        ) : displayed.length === 0 ? (
          <div className="card"><div className="empty-state">
            <div className="empty-icon"><Icon name="calendar" size={40}/></div>
            <div className="empty-title">No {tab} events</div>
          </div></div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {displayed.map(m => {
              const d       = new Date(m.date)
              const old     = isOld(m)
              const checked = didCheckIn(m)
              return (
                <div key={m._id} className="card card-hover" style={{ padding:'14px 16px' }} onClick={()=>openDetail(m)}>
                  <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                    <div style={{ background:old?'var(--text-faint)':'#0F1F5C', color:'white', borderRadius:10, padding:'8px 10px', textAlign:'center', minWidth:46, flexShrink:0 }}>
                      <p style={{ fontSize:9, fontWeight:700, opacity:0.7 }}>{d.toLocaleString('default',{month:'short'}).toUpperCase()}</p>
                      <p style={{ fontSize:18, fontWeight:800, lineHeight:1 }}>{d.getDate()}</p>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', gap:6, marginBottom:4, flexWrap:'wrap', alignItems:'center' }}>
                        <span className="badge badge-blue" style={{ fontSize:10 }}>{m.type}</span>
                        {checked && <span className="badge badge-green" style={{ fontSize:10 }}>✓ Checked in</span>}
                        {m.qrActive && <span className="badge badge-amber" style={{ fontSize:10 }}>QR Active</span>}
                        {m.comments?.length > 0 && <span style={{ fontSize:10, color:'var(--text-faint)', display:'flex', alignItems:'center', gap:3 }}><Icon name="chatBubble" size={11}/> {m.comments.length}</span>}
                      </div>
                      <p style={{ fontWeight:700, fontSize:14, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.title}</p>
                      <p style={{ fontSize:12, color:'var(--text-faint)', marginTop:2 }}>{m.time&&`${m.time} · `}{m.venue}</p>
                    </div>
                    <div style={{ flexShrink:0, textAlign:'right' }}>
                      <span style={{ fontSize:14, fontWeight:800, color:old?'var(--text-faint)':'var(--amber-600)' }}>+{pts(m)} pts</span>
                      <p style={{ fontSize:10, color:'var(--text-faint)', marginTop:2 }}>on check-in</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── DETAIL MODAL ── */}
      {selected && (
        <div className="modal-overlay" onClick={closeDetail}>
          <div className="modal-box" style={{ maxWidth:520, maxHeight:'90vh', overflowY:'auto' }} onClick={e=>e.stopPropagation()}>

            <div className="modal-header">
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                <span className="badge badge-blue">{selected.type}</span>
                <span className="badge badge-green">+{pts(selected)} pts</span>
                {selected.qrActive && <span className="badge badge-amber">QR Active</span>}
              </div>
              <button className="modal-close" onClick={closeDetail}><Icon name="x" size={14}/></button>
            </div>

            <div className="modal-body">
              <h2 style={{ fontSize:17, fontWeight:700, marginBottom:14 }}>{selected.title}</h2>

              <div className="grid-2" style={{ gap:10, marginBottom:16 }}>
                {[
                  { l:'Date',      v:new Date(selected.date).toLocaleDateString('en-PH',{year:'numeric',month:'long',day:'numeric'}) },
                  { l:'Time',      v:selected.time||'TBA' },
                  { l:'Venue',     v:selected.venue||'TBA' },
                  { l:'Attendees', v:`${selected.checkedIn?.length||0} checked in` },
                ].map(i=>(
                  <div key={i.l} style={{ padding:'9px 11px', background:'var(--bg-subtle)', borderRadius:8, border:'1px solid var(--border)' }}>
                    <p style={{ fontSize:10, color:'var(--text-faint)', fontWeight:700, marginBottom:2, textTransform:'uppercase', letterSpacing:'0.4px' }}>{i.l}</p>
                    <p style={{ fontSize:13, fontWeight:600 }}>{i.v}</p>
                  </div>
                ))}
              </div>

              {selected.agenda && (
                <div style={{ marginBottom:16 }}>
                  <p style={{ fontSize:11, color:'var(--text-faint)', fontWeight:700, marginBottom:5, textTransform:'uppercase', letterSpacing:'0.4px' }}>Agenda</p>
                  <p style={{ fontSize:13, color:'var(--text-muted)', lineHeight:1.7, whiteSpace:'pre-wrap' }}>{selected.agenda}</p>
                </div>
              )}

              {/* QR Active section — token is NEVER shown to kabataan users */}
              {selected.qrActive && (
                <div style={{ background:'rgba(21,128,61,0.07)', border:'1.5px solid rgba(21,128,61,0.2)', borderRadius:12, padding:'14px 16px', marginBottom:16 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                    <Icon name="qrCode" size={16} color="var(--green-600)"/>
                    <p style={{ fontWeight:700, fontSize:14, color:'var(--green-600)' }}>QR Check-in is Active!</p>
                  </div>
                  <p style={{ fontSize:12, color:'var(--text-muted)', marginBottom:14, lineHeight:1.6 }}>
                    Your SK Officer is displaying a QR code at the event. Scan it with your camera to earn <strong>+{pts(selected)} points</strong>.
                    You must be physically present at the event.
                  </p>
                  <div style={{ background:'rgba(21,128,61,0.1)', border:'1px solid rgba(21,128,61,0.2)', borderRadius:9, padding:'10px 13px', marginBottom:14, display:'flex', gap:9, alignItems:'flex-start' }}>
                    <Icon name="shield" size={14} color="var(--green-600)"/>
                    <p style={{ fontSize:12, color:'var(--green-600)', lineHeight:1.6, fontWeight:600 }}>
                      Check-in is only possible by scanning the QR code shown by your SK Officer at the venue. No token sharing.
                    </p>
                  </div>
                  <Link to="/kabataan/checkin"
                    style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'12px', background:'var(--green-600)', color:'white', borderRadius:10, fontWeight:700, fontSize:14, textDecoration:'none' }}>
                    <Icon name="qrCode" size={15} color="white"/> Open Camera to Scan
                  </Link>
                </div>
              )}

              {/* Not active yet */}
              {!selected.qrActive && !isOld(selected) && (
                <div style={{ background:'var(--blue-100)', border:'1px solid rgba(26,58,143,0.15)', borderRadius:11, padding:'12px 14px', marginBottom:16 }}>
                  <p style={{ fontSize:13, color:'var(--blue-800)', fontWeight:600 }}>
                    Attend this event and earn <strong>+{pts(selected)} points!</strong><br/>
                    The SK Officer will activate the QR code when the event starts.
                  </p>
                </div>
              )}

              {/* Already checked in */}
              {didCheckIn(selected) && (
                <div style={{ background:'var(--green-100)', border:'1px solid rgba(21,128,61,0.2)', borderRadius:11, padding:'12px 14px', marginBottom:16, display:'flex', alignItems:'center', gap:10 }}>
                  <Icon name="check" size={16} color="var(--green-600)"/>
                  <p style={{ fontSize:13, color:'var(--green-600)', fontWeight:700 }}>You attended this event and earned {pts(selected)} points!</p>
                </div>
              )}

              {/* ── OPEN FORUM / COMMENTS ── */}
              <div style={{ borderTop:'1px solid var(--border)', paddingTop:16 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
                  <Icon name="chatBubble" size={16} color="var(--blue-800)"/>
                  <h3 style={{ fontWeight:700, fontSize:15 }}>
                    Open Forum
                    {selected.comments?.length > 0 && (
                      <span style={{ fontSize:12, color:'var(--text-faint)', fontWeight:400, marginLeft:6 }}>
                        ({selected.comments.length})
                      </span>
                    )}
                  </h3>
                </div>

                {/* Comments list */}
                {!selected.comments?.length ? (
                  <div style={{ textAlign:'center', padding:'20px 0', color:'var(--text-faint)' }}>
                    <Icon name="chatBubble" size={28}/>
                    <p style={{ marginTop:8, fontSize:13 }}>No comments yet. Be the first!</p>
                  </div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:16 }}>
                    {selected.comments.map(c => {
                      const isMe  = (c.user?._id||c.user)?.toString() === user?._id?.toString()
                      const canDel= isMe || ['admin','sk_officer'].includes(user?.role)
                      const name  = c.user ? `${c.user.firstName} ${c.user.lastName}` : 'User'
                      return (
                        <div key={c._id} style={{ background:isMe?'var(--blue-100)':'var(--bg-subtle)', border:`1px solid ${isMe?'rgba(26,58,143,0.15)':'var(--border)'}`, borderRadius:10, padding:'10px 12px' }}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:5 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                              <div className="avatar avatar-sm" style={{ background:isMe?'var(--blue-800)':'var(--text-faint)', width:26, height:26, fontSize:11 }}>
                                {c.user?.firstName?.[0]}{c.user?.lastName?.[0]}
                              </div>
                              <div>
                                <span style={{ fontSize:12, fontWeight:700, color:isMe?'var(--blue-800)':'var(--text-base)' }}>
                                  {name} {isMe&&<span style={{ fontSize:10, opacity:0.6 }}>(You)</span>}
                                </span>
                                {c.user?.role==='sk_officer'&&<span className="badge badge-blue" style={{ fontSize:9, marginLeft:4 }}>SK</span>}
                              </div>
                            </div>
                            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                              <span style={{ fontSize:10, color:'var(--text-faint)' }}>{new Date(c.createdAt).toLocaleDateString('en-PH')}</span>
                              {canDel&&(
                                <button onClick={()=>handleDeleteComment(c._id)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-faint)', padding:0, display:'flex' }}>
                                  <Icon name="trash" size={12}/>
                                </button>
                              )}
                            </div>
                          </div>
                          <p style={{ fontSize:13, color:'var(--text-muted)', lineHeight:1.6, whiteSpace:'pre-wrap' }}>{c.text}</p>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Post comment */}
                <textarea className="form-textarea" rows={3}
                  placeholder="Share your thoughts, feedback, or suggestions about this event..."
                  value={comment} onChange={e=>setComment(e.target.value)}
                  style={{ marginBottom:8, resize:'vertical' }} maxLength={500} />
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:11, color:'var(--text-faint)' }}>{comment.length}/500</span>
                  <button className="btn btn-primary btn-sm"
                    disabled={!comment.trim()||posting} onClick={handleComment}>
                    {posting ? 'Posting...' : <><Icon name="arrowRight" size={13}/> Post Comment</>}
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  )
}