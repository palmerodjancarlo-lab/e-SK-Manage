// SK Meetings — full QR display with token for manual entry
import { useState, useEffect, useRef } from 'react'
import { Icon } from '../../components/Icon'
import { QRCodeSVG } from 'qrcode.react'
import axios from 'axios'
import toast from 'react-hot-toast'

const API     = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const TYPES   = ['Meeting','Workshop','Event','Seminar','Livelihood','Sports']
const TYPE_PTS= { Meeting:10, Workshop:15, Event:20, Seminar:15, Livelihood:20, Sports:15 }
const MUNIS   = ['Boac','Buenavista','Gasan','Mogpog','Santa Cruz','Torrijos']

export default function SKMeetings() {
  const [meetings,  setMeetings]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [showForm,  setShowForm]  = useState(false)
  const [qrMeeting, setQrMeeting] = useState(null)
  const [tab,       setTab]       = useState('upcoming')
  const [copied,      setCopied]      = useState(false)
  const [feedback,    setFeedback]    = useState(null)  // meeting whose comments we're viewing
  const qrRef = useRef(null)

  const openFeedback = async (m) => {
    try {
      const { data } = await axios.get(`${API}/meetings/${m._id}`)
      setFeedback(data.meeting)
    } catch { setFeedback(m) }
  }

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Delete this comment?')) return
    try {
      await axios.delete(`${API}/meetings/${feedback._id}/comments/${commentId}`)
      setFeedback(prev => ({ ...prev, comments: prev.comments.filter(c => c._id !== commentId) }))
      toast.success('Comment deleted.')
    } catch { toast.error('Failed.') }
  }

  const emptyForm = { title:'', type:'Meeting', date:'', time:'', venue:'', municipality:'Boac', agenda:'' }
  const [form, setForm] = useState(emptyForm)

  const fetchMeetings = () => {
    setLoading(true)
    axios.get(`${API}/meetings`)
      .then(r => setMeetings(r.data.meetings || []))
      .catch(() => toast.error('Failed to load meetings.'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { fetchMeetings() }, []) // eslint-disable-line

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const { data } = await axios.post(`${API}/meetings`, form)
      toast.success('Meeting created! QR code is ready.')
      setShowForm(false)
      setForm(emptyForm)
      fetchMeetings()
      // Auto-open QR modal for the new meeting
      if (data.meeting) setQrMeeting(data.meeting)
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to create.') }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this meeting?')) return
    try {
      await axios.delete(`${API}/meetings/${id}`)
      toast.success('Deleted.')
      if (qrMeeting?._id === id) setQrMeeting(null)
      fetchMeetings()
    } catch { toast.error('Failed.') }
  }

  const activateQR = async (meeting) => {
    try {
      const { data } = await axios.post(`${API}/meetings/${meeting._id}/generate-qr`, {
        durationMinutes: 120
      })
      toast.success('QR activated! Kabataan can now check in.')
      fetchMeetings()
      // Update the qrMeeting state with fresh data
      setQrMeeting({ ...meeting, ...data.meeting, qrToken: data.qrToken, qrActive: true })
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to activate QR.') }
  }

  const deactivateQR = async (meeting) => {
    try {
      await axios.put(`${API}/meetings/${meeting._id}/deactivate-qr`)
      toast.success('QR deactivated.')
      fetchMeetings()
      setQrMeeting(prev => ({ ...prev, qrActive: false }))
    } catch { toast.error('Failed.') }
  }

  const downloadQR = () => {
    const svg = qrRef.current?.querySelector('svg')
    if (!svg) return
    const serialized = new XMLSerializer().serializeToString(svg)
    const blob = new Blob([serialized], { type: 'image/svg+xml' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `qr-${qrMeeting.title.replace(/\s+/g,'-')}.svg`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('QR downloaded!')
  }

  const copyToken = () => {
    if (!qrMeeting?.qrToken) return
    navigator.clipboard.writeText(qrMeeting.qrToken)
    setCopied(true)
    toast.success('Token copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }


  const now      = new Date()
  const upcoming = meetings.filter(m => new Date(m.date) >= now)
  const past     = meetings.filter(m => new Date(m.date) < now)
  const displayed= tab === 'upcoming' ? upcoming : past

  const pts = (m) => TYPE_PTS[m.type] || 10

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Meetings & Events</h1>
          <p className="page-subtitle">Manage SK events and QR check-in</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>
          <Icon name="plus" size={14}/> New Meeting
        </button>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom:18 }}>
        <button className={`tab-btn ${tab==='upcoming'?'active':''}`} onClick={()=>setTab('upcoming')}>
          Upcoming ({upcoming.length})
        </button>
        <button className={`tab-btn ${tab==='past'?'active':''}`} onClick={()=>setTab('past')}>
          Past ({past.length})
        </button>
      </div>

      {/* Meeting list */}
      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:60 }}>
          <div className="spinner" style={{ width:36, height:36 }}/>
        </div>
      ) : displayed.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon"><Icon name="calendar" size={40}/></div>
            <div className="empty-title">No {tab} meetings</div>
            {tab==='upcoming' && <div className="empty-desc">Click "New Meeting" to schedule one.</div>}
          </div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {displayed.map(m => {
            const d = new Date(m.date)
            return (
              <div key={m._id} className="card" style={{ padding:'16px 18px' }}>
                <div style={{ display:'flex', gap:14, alignItems:'flex-start', flexWrap:'wrap' }}>

                  {/* Date block */}
                  <div style={{ background:'var(--blue-800)', color:'white', borderRadius:10, padding:'10px 12px', textAlign:'center', minWidth:50, flexShrink:0 }}>
                    <p style={{ fontSize:9, fontWeight:700, opacity:0.7 }}>{d.toLocaleString('default',{month:'short'}).toUpperCase()}</p>
                    <p style={{ fontSize:20, fontWeight:800, lineHeight:1 }}>{d.getDate()}</p>
                    <p style={{ fontSize:9, opacity:0.6 }}>{d.getFullYear()}</p>
                  </div>

                  {/* Info */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', gap:8, marginBottom:5, flexWrap:'wrap', alignItems:'center' }}>
                      <h3 style={{ fontWeight:700, fontSize:15 }}>{m.title}</h3>
                      <span className="badge badge-blue" style={{ fontSize:10 }}>{m.type}</span>
                      <span className="badge badge-green" style={{ fontSize:10 }}>+{pts(m)} pts</span>
                      {m.qrToken && m.qrActive && (
                        <span className="badge badge-amber" style={{ fontSize:10 }}>QR Active</span>
                      )}
                      {m.comments?.length > 0 && (
                        <span className="badge badge-blue" style={{ fontSize:10, display:'flex', alignItems:'center', gap:3, cursor:'pointer' }}
                          onClick={(e)=>{ e.stopPropagation(); openFeedback(m) }}>
                          <Icon name="chatBubble" size={10}/> {m.comments.length} feedback
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize:12, color:'var(--text-faint)', marginBottom:4 }}>
                      {m.time && `${m.time} · `}{m.venue}{m.municipality && `, ${m.municipality}`}
                    </p>
                    {m.agenda && (
                      <p style={{ fontSize:12, color:'var(--text-muted)', lineHeight:1.5 }}>{m.agenda}</p>
                    )}
                    {/* Show short token preview */}
                    {m.qrToken && (
                      <div style={{ marginTop:8, display:'flex', alignItems:'center', gap:6 }}>
                        <Icon name="qrCode" size={12} color="var(--text-faint)"/>
                        <code style={{ fontSize:11, color:'var(--text-faint)', background:'var(--bg-subtle)', padding:'2px 6px', borderRadius:4, letterSpacing:'0.3px' }}>
                          {m.qrToken.slice(0,16)}...
                        </code>
                        <span style={{ fontSize:11, color:'var(--text-faint)' }}>· Check-in token ready</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display:'flex', gap:6, flexShrink:0, flexWrap:'wrap' }}>
                    {/* Always show QR button — every meeting has a token */}
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => setQrMeeting(m)}
                      title="Show QR Code for check-in">
                      <Icon name="qrCode" size={13}/> QR Code
                    </button>
                    {/* Feedback button — shows kabataan comments */}
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => openFeedback(m)}
                      title="View Kabataan Feedback"
                      style={{ position:'relative' }}>
                      <Icon name="chatBubble" size={13}/> Feedback
                      {m.comments?.length > 0 && (
                        <span style={{ position:'absolute', top:-5, right:-5, background:'var(--red-600)', color:'white', borderRadius:999, fontSize:9, fontWeight:800, padding:'1px 5px', lineHeight:1.5 }}>
                          {m.comments.length}
                        </span>
                      )}
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(m._id)}
                      title="Delete meeting">
                      <Icon name="trash" size={13}/>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── CREATE FORM MODAL ── */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-box" style={{ maxWidth:560 }} onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">New Meeting / Event</span>
              <button className="modal-close" onClick={()=>setShowForm(false)}><Icon name="x" size={14}/></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Title</label>
                  <input className="form-input" required placeholder="e.g. Monthly SK Meeting"
                    value={form.title} onChange={e=>setForm({...form,title:e.target.value})} />
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Type</label>
                    <select className="form-select" value={form.type} onChange={e=>setForm({...form,type:e.target.value})}>
                      {TYPES.map(t=><option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Municipality</label>
                    <select className="form-select" value={form.municipality} onChange={e=>setForm({...form,municipality:e.target.value})}>
                      {MUNIS.map(m=><option key={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Date</label>
                    <input type="date" className="form-input" required
                      value={form.date} onChange={e=>setForm({...form,date:e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Time</label>
                    <input type="time" className="form-input"
                      value={form.time} onChange={e=>setForm({...form,time:e.target.value})} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Venue</label>
                  <input className="form-input" required placeholder="e.g. Boac Municipal Gym"
                    value={form.venue} onChange={e=>setForm({...form,venue:e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Agenda / Description</label>
                  <textarea className="form-textarea" rows={3}
                    placeholder="Describe the event agenda..."
                    value={form.agenda} onChange={e=>setForm({...form,agenda:e.target.value})} />
                </div>
                <div style={{ padding:'12px 14px', background:'var(--blue-100)', borderRadius:10, border:'1px solid rgba(26,58,143,0.15)', display:'flex', gap:10, alignItems:'center' }}>
                  <Icon name="qrCode" size={16} color="var(--blue-800)"/>
                  <p style={{ fontSize:12, color:'var(--blue-800)', fontWeight:500 }}>
                    A QR code + token will be auto-generated. Kabataan users earn <strong>+{TYPE_PTS[form.type]||10} points</strong> when they check in.
                  </p>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost btn-sm" onClick={()=>setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">
                  <Icon name="plus" size={13}/> Create & Generate QR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── QR CODE MODAL ── */}
      {qrMeeting && (
        <div className="modal-overlay" onClick={()=>setQrMeeting(null)}>
          <div className="modal-box" style={{ maxWidth:440 }} onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="modal-title">QR Check-in Code</span>
                <p style={{ fontSize:11, color:'var(--text-faint)', marginTop:2 }}>{qrMeeting.title}</p>
              </div>
              <button className="modal-close" onClick={()=>setQrMeeting(null)}><Icon name="x" size={14}/></button>
            </div>

            <div className="modal-body">

              {qrMeeting.qrToken ? (
                <>
                  {/* Active / Inactive status + toggle button */}
                  {qrMeeting.qrActive ? (
                    <div style={{ padding:'12px 14px', background:'var(--green-100)', borderRadius:10, border:'1px solid rgba(21,128,61,0.2)', marginBottom:16 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--green-600)', boxShadow:'0 0 0 3px rgba(21,128,61,0.2)' }}/>
                          <p style={{ fontSize:13, color:'var(--green-600)', fontWeight:700 }}>
                            QR is ACTIVE — Kabataan can check in!
                          </p>
                        </div>
                        <button className="btn btn-sm btn-danger" onClick={()=>deactivateQR(qrMeeting)}>
                          Stop QR
                        </button>
                      </div>
                      <p style={{ fontSize:12, color:'var(--green-600)', opacity:0.8, marginTop:4 }}>
                        Attendees earn +{pts(qrMeeting)} points per check-in.
                      </p>
                    </div>
                  ) : (
                    <div style={{ padding:'12px 14px', background:'var(--amber-100)', borderRadius:10, border:'1px solid rgba(217,119,6,0.2)', marginBottom:16 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <div>
                          <p style={{ fontSize:13, color:'var(--amber-600)', fontWeight:700 }}>QR is NOT yet active</p>
                          <p style={{ fontSize:12, color:'var(--amber-600)', opacity:0.8, marginTop:2 }}>Activate it when the event starts so kabataan can check in.</p>
                        </div>
                        <button className="btn btn-sm btn-primary" onClick={()=>activateQR(qrMeeting)}>
                          <Icon name="qrCode" size={13}/> Activate QR
                        </button>
                      </div>
                    </div>
                  )}

                  {/* QR Code */}
                  <div style={{ textAlign:'center', marginBottom:20 }}>
                    <div ref={qrRef} style={{
                      display:'inline-block', padding:20,
                      background:'white', borderRadius:16,
                      border:'2px solid var(--border)',
                      boxShadow:'0 4px 20px rgba(0,0,0,0.08)',
                    }}>
                      <QRCodeSVG
                        value={qrMeeting.qrToken}
                        size={220}
                        level="H"
                        includeMargin={false}
                      />
                    </div>
                    <p style={{ fontSize:11, color:'var(--text-faint)', marginTop:10 }}>
                      Scan with the Kabataan Check-in scanner
                    </p>
                  </div>

                  {/* Divider */}
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
                    <div style={{ flex:1, height:1, background:'var(--border)' }}/>
                    <span style={{ fontSize:11, fontWeight:700, color:'var(--text-faint)', whiteSpace:'nowrap' }}>
                      CAN'T SCAN? USE THIS TOKEN
                    </span>
                    <div style={{ flex:1, height:1, background:'var(--border)' }}/>
                  </div>

                  {/* Token box — full token for manual paste */}
                  <div style={{ marginBottom:16 }}>
                    <p style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.4px' }}>
                      Manual Check-in Token
                    </p>
                    <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                      <div style={{
                        flex:1, padding:'10px 12px',
                        background:'var(--bg-subtle)',
                        border:'1.5px solid var(--border)',
                        borderRadius:9, fontFamily:'monospace',
                        fontSize:12, color:'var(--text-base)',
                        wordBreak:'break-all', lineHeight:1.6,
                        letterSpacing:'0.5px',
                      }}>
                        {qrMeeting.qrToken}
                      </div>
                      <button
                        onClick={copyToken}
                        className={`btn btn-sm ${copied ? 'btn-success' : 'btn-outline'}`}
                        style={{ flexShrink:0, minWidth:70 }}
                        title="Copy token">
                        {copied ? <><Icon name="check" size={13}/> Copied!</> : <><Icon name="clipboardList" size={13}/> Copy</>}
                      </button>
                    </div>
                    <p style={{ fontSize:11, color:'var(--text-faint)', marginTop:5 }}>
                      Read this token out loud to attendees who cannot scan the QR code. Do not share this digitally.
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display:'flex', gap:8 }}>
                    <button className="btn btn-outline btn-sm" style={{ flex:1 }} onClick={downloadQR}>
                      <Icon name="arrowDown" size={13}/> Download QR
                    </button>
                  </div>
                </>
              ) : (
                /* No token yet — shouldn't happen with new backend but just in case */
                <div style={{ textAlign:'center', padding:'24px 0' }}>
                  <div style={{ width:48, height:48, borderRadius:'50%', background:'var(--amber-100)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }}>
                    <Icon name="qrCode" size={22} color="var(--amber-600)"/>
                  </div>
                  <p style={{ fontWeight:700, fontSize:15, marginBottom:8 }}>No QR token yet</p>
                  <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:20 }}>
                    This meeting was created before auto-QR. Delete and recreate it to get a QR code.
                  </p>
                  <button className="btn btn-ghost btn-sm" onClick={()=>setQrMeeting(null)}>Close</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── FEEDBACK MODAL — Kabataan Comments ── */}
      {feedback && (
        <div className="modal-overlay" onClick={()=>setFeedback(null)}>
          <div className="modal-box" style={{ maxWidth:520, maxHeight:'88vh', overflowY:'auto' }} onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="modal-title">Kabataan Feedback</span>
                <p style={{ fontSize:11, color:'var(--text-faint)', marginTop:2 }}>{feedback.title}</p>
              </div>
              <button className="modal-close" onClick={()=>setFeedback(null)}><Icon name="x" size={14}/></button>
            </div>
            <div className="modal-body">

              {/* Summary bar */}
              <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap' }}>
                {[
                  { l:'Check-ins',  v:feedback.checkedIn?.length||0,  c:'var(--green-600)',  bg:'var(--green-100)'  },
                  { l:'Comments',   v:feedback.comments?.length||0,    c:'var(--blue-800)',   bg:'var(--blue-100)'   },
                  { l:'RSVPs',      v:feedback.rsvp?.length||0,        c:'var(--amber-600)',  bg:'var(--amber-100)'  },
                ].map(s=>(
                  <div key={s.l} style={{ flex:1, minWidth:90, background:s.bg, border:`1px solid ${s.c}20`, borderRadius:10, padding:'10px 14px', textAlign:'center' }}>
                    <p style={{ fontSize:22, fontWeight:800, color:s.c, lineHeight:1 }}>{s.v}</p>
                    <p style={{ fontSize:11, color:s.c, marginTop:4, fontWeight:600 }}>{s.l}</p>
                  </div>
                ))}
              </div>

              {/* No comments yet */}
              {(!feedback.comments || feedback.comments.length === 0) ? (
                <div style={{ textAlign:'center', padding:'32px 0', color:'var(--text-faint)' }}>
                  <div style={{ fontSize:40, marginBottom:12 }}>💬</div>
                  <p style={{ fontWeight:700, fontSize:15, marginBottom:6 }}>No feedback yet</p>
                  <p style={{ fontSize:13, color:'var(--text-muted)', lineHeight:1.6 }}>
                    Kabataan users can leave comments on events from their Meetings page.<br/>
                    Check back after the event!
                  </p>
                </div>
              ) : (
                <>
                  <p style={{ fontSize:12, color:'var(--text-faint)', fontWeight:600, marginBottom:14, textTransform:'uppercase', letterSpacing:'0.5px' }}>
                    {feedback.comments.length} Comment{feedback.comments.length!==1?'s':''} from Kabataan
                  </p>
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    {feedback.comments.map(c => {
                      const name = c.user ? `${c.user.firstName} ${c.user.lastName}` : 'User'
                      const role = c.user?.role
                      return (
                        <div key={c._id} style={{ background:'var(--bg-subtle)', border:'1px solid var(--border)', borderRadius:11, padding:'12px 14px' }}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                              <div className="avatar avatar-sm" style={{ width:28, height:28, fontSize:11 }}>
                                {c.user?.firstName?.[0]}{c.user?.lastName?.[0]}
                              </div>
                              <div>
                                <p style={{ fontWeight:700, fontSize:13 }}>{name}</p>
                                <p style={{ fontSize:11, color:'var(--text-faint)' }}>
                                  {role==='kabataan_user'?'Kabataan User':role==='sk_officer'?'SK Officer':role}
                                  {' · '}{new Date(c.createdAt).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'})}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={()=>handleDeleteComment(c._id)}
                              title="Delete comment"
                              style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-faint)', padding:'2px 4px', borderRadius:5, display:'flex', transition:'color 0.15s' }}
                              onMouseEnter={e=>e.currentTarget.style.color='var(--red-600)'}
                              onMouseLeave={e=>e.currentTarget.style.color='var(--text-faint)'}>
                              <Icon name="trash" size={13}/>
                            </button>
                          </div>
                          <p style={{ fontSize:13, color:'var(--text-base)', lineHeight:1.7, whiteSpace:'pre-wrap' }}>{c.text}</p>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}