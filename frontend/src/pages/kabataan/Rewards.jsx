import { useState, useEffect } from 'react'
import { Icon } from '../../components/Icon'
import axios from 'axios'
import toast from 'react-hot-toast'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const REWARDS = [
  { id:1, title:'SK Tote Bag',        points:50,  icon:'gift',    stock:20, desc:'Official e-SK Manage tote bag' },
  { id:2, title:'Certificate',         points:30,  icon:'check',   stock:50, desc:'Certificate of participation' },
  { id:3, title:'SK T-Shirt',          points:100, icon:'star',    stock:10, desc:'Official SK t-shirt (limited)' },
  { id:4, title:'School Supplies Pack',points:80,  icon:'building',stock:15, desc:'Ballpen, notebook, folder set' },
  { id:5, title:'SK Cap',              points:70,  icon:'shield',  stock:12, desc:'Official SK branded cap' },
  { id:6, title:'Priority Enrollment', points:150, icon:'trophy',  stock:5,  desc:'Priority registration for SK programs' },
]

export default function KabataanRewards() {
  const [balance, setBalance] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get(`${API}/points/my`)
      .then(r => setBalance(r.data.balance))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleClaim = (reward) => {
    if (balance < reward.points) {
      toast.error(`You need ${reward.points - balance} more points to claim this.`)
      return
    }
    toast.success(`Claim request submitted! Visit the SK Office for "${reward.title}".`, { duration:5000 })
  }

  return (
    <div style={{ paddingBottom:80 }}>
      <div style={{ background:'#0F1F5C', padding:'18px 20px 20px' }}>
        <h1 style={{ color:'white', fontSize:20, fontWeight:800, marginBottom:3 }}>Rewards Store</h1>
        <p style={{ color:'rgba(255,255,255,0.45)', fontSize:13 }}>Redeem your points for rewards</p>
        <div style={{ display:'inline-flex', gap:6, alignItems:'center', background:'rgba(245,196,0,0.15)', border:'1px solid rgba(245,196,0,0.25)', borderRadius:8, padding:'6px 12px', marginTop:12 }}>
          <Icon name="star" size={14} color="#F5C400"/>
          <span style={{ color:'#F5C400', fontWeight:700, fontSize:14 }}>{loading ? '—' : balance} points available</span>
        </div>
      </div>

      <div style={{ padding:'16px' }}>
        <div className="grid-2">
          {REWARDS.map(reward => {
            const canClaim = balance >= reward.points
            return (
              <div key={reward.id} className="card" style={{ opacity:reward.stock===0?0.5:1 }}>
                <div style={{ width:44, height:44, borderRadius:12, background: canClaim?'var(--green-100)':'var(--bg-subtle)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:12 }}>
                  <Icon name={reward.icon} size={20} color={canClaim?'var(--green-600)':'var(--text-faint)'} />
                </div>
                <h3 style={{ fontWeight:700, fontSize:14, marginBottom:4 }}>{reward.title}</h3>
                <p style={{ fontSize:12, color:'var(--text-muted)', marginBottom:10, lineHeight:1.4 }}>{reward.desc}</p>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                  <span style={{ fontSize:15, fontWeight:800, color:'var(--amber-600)' }}>{reward.points} pts</span>
                  <span style={{ fontSize:11, color:'var(--text-faint)' }}>{reward.stock} left</span>
                </div>
                <button
                  onClick={() => handleClaim(reward)}
                  disabled={!canClaim || reward.stock === 0}
                  className={`btn btn-sm btn-full ${canClaim && reward.stock > 0 ? 'btn-primary' : 'btn-ghost'}`}>
                  {reward.stock === 0 ? 'Out of stock' : canClaim ? 'Claim Reward' : `Need ${reward.points - balance} more pts`}
                </button>
              </div>
            )
          })}
        </div>

        <div style={{ marginTop:16, padding:'14px 16px', background:'var(--bg-subtle)', borderRadius:12, border:'1px solid var(--border)' }}>
          <p style={{ fontWeight:700, fontSize:13, marginBottom:6 }}>How to earn more points</p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {[['Meeting','10'],['Workshop','15'],['Event','20'],['Volunteer','30']].map(([t,p])=>(
              <div key={t} style={{ fontSize:12, color:'var(--text-muted)', display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid var(--border)' }}>
                <span>{t}</span><span style={{ fontWeight:700 }}>+{p} pts</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}