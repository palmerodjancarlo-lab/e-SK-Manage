// Kabataan Points — balance, history, leaderboard
import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Icon } from '../../components/Icon'
import axios from 'axios'
import toast from 'react-hot-toast'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export default function KabataanPoints() {
  const { user }                      = useAuth()
  const [balance,     setBalance]     = useState(0)
  const [history,     setHistory]     = useState([])
  const [leaderboard, setLeaderboard] = useState([])
  const [tab,         setTab]         = useState('history')
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [myRes, histRes, lbRes] = await Promise.all([
          axios.get(`${API}/points/my`),
          axios.get(`${API}/points/history`),
          axios.get(`${API}/points/leaderboard`),
        ])
        setBalance(myRes.data.balance ?? 0)
        setHistory(histRes.data.history || [])
        setLeaderboard(lbRes.data.leaderboard || [])
      } catch (e) {
        console.error('Points fetch error:', e.message)
        toast.error('Failed to load points.')
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, []) 

  const myRank = leaderboard.findIndex(u => u._id === user?._id) + 1

  return (
    <div style={{ paddingBottom: 80 }}>

      {/* Header with points balance */}
      <div style={{ background: '#0F1F5C', padding: '20px 20px 28px', position: 'relative', overflow: 'hidden' }}>
        <div aria-hidden style={{ position:'absolute', bottom:-50, right:-50, width:200, height:200, borderRadius:'50%', background:'rgba(245,196,0,0.1)', pointerEvents:'none' }} />
        <div style={{ position:'relative', zIndex:1 }}>
          <p style={{ color:'rgba(255,255,255,0.5)', fontSize:12, marginBottom:6, fontWeight:600 }}>My Points Balance</p>
          <div style={{ display:'flex', alignItems:'flex-end', gap:16 }}>
            <div>
              <p style={{ color:'#F5C400', fontSize:48, fontWeight:800, lineHeight:1 }}>
                {loading ? '—' : balance.toLocaleString()}
              </p>
              <p style={{ color:'rgba(255,255,255,0.4)', fontSize:12, marginTop:4 }}>Total points earned</p>
            </div>
            {myRank > 0 && !loading && (
              <div style={{ background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:12, padding:'10px 16px', textAlign:'center', marginBottom:4 }}>
                <p style={{ color:'rgba(255,255,255,0.5)', fontSize:10, fontWeight:600, marginBottom:2 }}>RANK</p>
                <p style={{ color:'white', fontSize:22, fontWeight:800, lineHeight:1 }}>#{myRank}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ padding:'16px' }}>
        <div className="tabs" style={{ marginBottom:16 }}>
          <button className={`tab-btn ${tab==='history'?'active':''}`} onClick={()=>setTab('history')}>
            History
          </button>
          <button className={`tab-btn ${tab==='leaderboard'?'active':''}`} onClick={()=>setTab('leaderboard')}>
            Leaderboard
          </button>
        </div>

        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:48 }}>
            <div className="spinner"/>
          </div>
        ) : tab === 'history' ? (
          history.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-icon"><Icon name="star" size={40}/></div>
                <div className="empty-title">No points yet</div>
                <div className="empty-desc">Attend SK events and scan the QR code to earn points!</div>
              </div>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {history.map((h, i) => (
                <div key={h._id || i} className="card" style={{ padding:'12px 14px', display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ width:36, height:36, borderRadius:9, background:'var(--green-100)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <Icon name="star" size={16} color="var(--green-600)"/>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontWeight:600, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {h.meeting?.title || h.reason || 'Points earned'}
                    </p>
                    <p style={{ fontSize:11, color:'var(--text-faint)', marginTop:2 }}>
                      {h.meeting?.type && <span style={{ marginRight:6 }}>{h.meeting.type}</span>}
                      {new Date(h.checkedInAt || h.createdAt).toLocaleDateString('en-PH', { month:'short', day:'numeric', year:'numeric' })}
                    </p>
                  </div>
                  <span style={{ fontSize:16, fontWeight:800, color:'var(--green-600)', flexShrink:0 }}>
                    +{h.pointsEarned}
                  </span>
                </div>
              ))}
            </div>
          )
        ) : (
          leaderboard.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-icon"><Icon name="trophy" size={40}/></div>
                <div className="empty-title">No data yet</div>
              </div>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {leaderboard.map((u, i) => {
                const isMe   = u._id === user?._id
                const medals = ['🥇','🥈','🥉']
                return (
                  <div key={u._id} style={{
                    background: isMe ? 'var(--blue-50,#EBF0FF)' : 'var(--bg-card)',
                    border: `1.5px solid ${isMe ? 'var(--blue-800)' : 'var(--border)'}`,
                    borderRadius:12, padding:'12px 14px',
                    display:'flex', alignItems:'center', gap:12,
                  }}>
                    <div style={{ width:28, textAlign:'center', fontWeight:800, fontSize:i<3?16:13, color:i<3?'var(--amber-600)':'var(--text-faint)', flexShrink:0 }}>
                      {i < 3 ? medals[i] : `#${i+1}`}
                    </div>
                    <div className="avatar avatar-sm" style={{ background: i===0?'var(--amber-600)':i===1?'#9CA3AF':i===2?'#CD7F32':'var(--blue-800)' }}>
                      {u.firstName?.[0]}{u.lastName?.[0]}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontWeight: isMe?700:600, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {u.firstName} {u.lastName}
                        {isMe && <span style={{ fontSize:10, color:'var(--blue-800)', fontWeight:700, marginLeft:6 }}>(You)</span>}
                      </p>
                      <p style={{ fontSize:11, color:'var(--text-faint)', marginTop:1 }}>{u.barangay}, {u.municipality}</p>
                    </div>
                    <span style={{ fontSize:16, fontWeight:800, color:'var(--amber-600)', flexShrink:0 }}>
                      {u.points} <span style={{ fontSize:11 }}>pts</span>
                    </span>
                  </div>
                )
              })}
            </div>
          )
        )}
      </div>
    </div>
  )
}