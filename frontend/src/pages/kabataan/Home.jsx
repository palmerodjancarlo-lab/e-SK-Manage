// Kabataan Home — welcome screen, clean and minimal
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Icon } from '../../components/Icon'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export default function KabataanHome() {
  const { user }                  = useAuth()
  const [data, setData]           = useState({ announcements:[], meetings:[], balance:0, rank:0 })
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [ann, meet, pts, lb] = await Promise.all([
          axios.get(`${API}/announcements`),
          axios.get(`${API}/meetings`),
          axios.get(`${API}/points/my`),
          axios.get(`${API}/points/leaderboard`),
        ])
        const rank = lb.data.leaderboard.findIndex(u => u._id === user?._id) + 1
        setData({
          announcements: ann.data.announcements.slice(0, 3),
          meetings:      meet.data.meetings.filter(m => new Date(m.date) >= new Date()).slice(0, 3),
          balance:       pts.data.balance,
          rank,
        })
      } catch (err) { console.error(err) }
      finally { setLoading(false) }
    }
    fetchAll()
  }, [user])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  // Kapag pending ang SK application nila
  const hasPendingApp = user?.skApplication?.isApplying && user?.skApplication?.status === 'pending'

  const quickLinks = [
    { to:'/kabataan/announcements', icon:'megaphone',  label:'Announcements', color:'#0F1F5C', bg:'rgba(15,31,92,0.07)' },
    { to:'/kabataan/meetings',      icon:'calendar',   label:'Events',        color:'#059669', bg:'rgba(5,150,105,0.07)' },
    { to:'/kabataan/programs',      icon:'trophy',     label:'Programs',      color:'#D97706', bg:'rgba(217,119,6,0.07)' },
    { to:'/kabataan/transparency',  icon:'banknotes',  label:'Budget',        color:'#7C3AED', bg:'rgba(124,58,237,0.07)' },
    { to:'/kabataan/officials',     icon:'building',   label:'Officials',     color:'#0891B2', bg:'rgba(8,145,178,0.07)' },
    { to:'/kabataan/rewards',       icon:'gift',       label:'Rewards',       color:'#E11D48', bg:'rgba(225,29,72,0.07)' },
  ]

  return (
    <div style={{ paddingBottom: 80 }}>

      {/* Top banner */}
      <div style={{ background:'#0F1F5C', padding:'24px 20px 20px', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-40, right:-40, width:180, height:180, borderRadius:'50%', border:'1px solid rgba(255,255,255,0.06)' }} />
        <div style={{ position:'absolute', bottom:-20, left:60, width:120, height:120, borderRadius:'50%', background:'rgba(245,196,0,0.06)' }} />
        <div style={{ position:'relative', zIndex:1 }}>
          <p style={{ color:'rgba(255,255,255,0.5)', fontSize:12, marginBottom:3 }}>{greeting},</p>
          <h1 style={{ color:'white', fontSize:22, fontWeight:800, marginBottom:3, letterSpacing:'-0.3px' }}>
            {user?.firstName} {user?.lastName}
          </h1>
          <p style={{ color:'rgba(255,255,255,0.45)', fontSize:12 }}>
            Brgy. {user?.barangay || '—'} · {user?.municipality}
          </p>

          {/* Points balance */}
          <div style={{ display:'flex', gap:12, marginTop:18 }}>
            <div style={{ background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:10, padding:'10px 16px' }}>
              <p style={{ color:'rgba(255,255,255,0.5)', fontSize:10, fontWeight:600, marginBottom:2 }}>My Points</p>
              <p style={{ color:'#F5C400', fontSize:20, fontWeight:800, lineHeight:1 }}>
                {loading ? '—' : data.balance.toLocaleString()}
              </p>
            </div>
            {data.rank > 0 && (
              <div style={{ background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:10, padding:'10px 16px' }}>
                <p style={{ color:'rgba(255,255,255,0.5)', fontSize:10, fontWeight:600, marginBottom:2 }}>My Rank</p>
                <p style={{ color:'white', fontSize:20, fontWeight:800, lineHeight:1 }}>#{data.rank}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ padding:'18px 16px' }}>

        {/* Pending SK application notice */}
        {hasPendingApp && (
          <div style={{ background:'rgba(217,119,6,0.08)', border:'1px solid rgba(217,119,6,0.2)', borderRadius:12, padding:'14px 16px', marginBottom:18, display:'flex', gap:12, alignItems:'flex-start' }}>
            <Icon name="identification" size={18} color="var(--amber-600)" />
            <div>
              <p style={{ fontWeight:700, fontSize:13, color:'var(--amber-600)', marginBottom:3 }}>SK Application Under Review</p>
              <p style={{ fontSize:12, color:'var(--text-muted)', lineHeight:1.5 }}>
                Your application for <strong>{user.skApplication.appliedPosition}</strong> is being reviewed by the Admin. You'll be notified once it's approved.
              </p>
            </div>
          </div>
        )}

        {/* Quick access */}
        <h3 style={{ fontSize:13, fontWeight:700, color:'var(--text-muted)', marginBottom:12, letterSpacing:'0.3px' }}>QUICK ACCESS</h3>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:24 }}>
          {quickLinks.map(item => (
            <Link key={item.to} to={item.to} style={{
              display:'flex', flexDirection:'column', alignItems:'center', gap:8,
              padding:'16px 8px',
              background:item.bg, borderRadius:14,
              border:`1px solid ${item.color}18`,
              textDecoration:'none', transition:'all var(--transition)',
            }}
            onMouseEnter={e => e.currentTarget.style.transform='translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform='none'}>
              <Icon name={item.icon} size={22} color={item.color} />
              <span style={{ fontSize:11, fontWeight:700, color:item.color, textAlign:'center' }}>{item.label}</span>
            </Link>
          ))}
        </div>

        {/* QR Check-in banner */}
        <Link to="/kabataan/checkin" style={{
          display:'block', textDecoration:'none',
          background:'#0F1F5C', borderRadius:14,
          padding:'16px 18px', marginBottom:20,
          position:'relative', overflow:'hidden',
        }}>
          <div style={{ position:'absolute', top:-20, right:-20, width:100, height:100, borderRadius:'50%', background:'rgba(245,196,0,0.08)' }} />
          <div style={{ display:'flex', alignItems:'center', gap:14, position:'relative', zIndex:1 }}>
            <div style={{ width:44, height:44, borderRadius:12, background:'rgba(255,255,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Icon name="qrCode" size={22} color="white" />
            </div>
            <div style={{ flex:1 }}>
              <p style={{ color:'white', fontWeight:700, fontSize:14, marginBottom:2 }}>Scan QR to Earn Points</p>
              <p style={{ color:'rgba(255,255,255,0.5)', fontSize:12 }}>Attend SK events and check in with the QR code</p>
            </div>
            <Icon name="arrowRight" size={16} color="rgba(255,255,255,0.4)" />
          </div>
        </Link>

        {/* Latest announcements */}
        {data.announcements.length > 0 && (
          <>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <h3 style={{ fontSize:13, fontWeight:700, color:'var(--text-muted)', letterSpacing:'0.3px' }}>LATEST NEWS</h3>
              <Link to="/kabataan/announcements" style={{ fontSize:12, fontWeight:600, color:'#0F1F5C', textDecoration:'none' }}>View all</Link>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:20 }}>
              {data.announcements.map(ann => (
                <Link key={ann._id} to="/kabataan/announcements" style={{ textDecoration:'none' }}>
                  <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, padding:'12px 14px', display:'flex', gap:12, alignItems:'center', transition:'all var(--transition)' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor='#0F1F5C'}
                    onMouseLeave={e => e.currentTarget.style.borderColor='var(--border)'}>
                    <div style={{ width:36, height:36, borderRadius:9, background:'rgba(15,31,92,0.07)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <Icon name="megaphone" size={16} color="#0F1F5C" />
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontWeight:600, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'var(--text-base)' }}>{ann.title}</p>
                      <p style={{ fontSize:11, color:'var(--text-faint)', marginTop:2 }}>{new Date(ann.createdAt).toLocaleDateString('en-PH')}</p>
                    </div>
                    <Icon name="arrowRight" size={14} color="var(--text-faint)" />
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        {/* Upcoming events */}
        {data.meetings.length > 0 && (
          <>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <h3 style={{ fontSize:13, fontWeight:700, color:'var(--text-muted)', letterSpacing:'0.3px' }}>UPCOMING EVENTS</h3>
              <Link to="/kabataan/meetings" style={{ fontSize:12, fontWeight:600, color:'#0F1F5C', textDecoration:'none' }}>View all</Link>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {data.meetings.map(m => {
                const d = new Date(m.date)
                return (
                  <Link key={m._id} to="/kabataan/meetings" style={{ textDecoration:'none' }}>
                    <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, padding:'12px 14px', display:'flex', gap:12, alignItems:'center' }}>
                      <div style={{ background:'#0F1F5C', color:'white', borderRadius:10, padding:'8px 10px', textAlign:'center', minWidth:46, flexShrink:0 }}>
                        <p style={{ fontSize:10, fontWeight:700, opacity:0.7 }}>{d.toLocaleString('default',{month:'short'})}</p>
                        <p style={{ fontSize:18, fontWeight:800, lineHeight:1 }}>{d.getDate()}</p>
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontWeight:600, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.title}</p>
                        <p style={{ fontSize:11, color:'var(--text-faint)', marginTop:2 }}>{m.time} · {m.venue}</p>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}