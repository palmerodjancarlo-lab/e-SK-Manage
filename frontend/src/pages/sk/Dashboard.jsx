// sk/Dashboard.jsx — SK Portal Dashboard
// Adapts to the logged-in SK role: chairperson, secretary, treasurer, kagawad.
// Chairperson sees the full command view (finance approvals, programs, council).

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid,
} from 'recharts'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'

const T = {
  bg:'#F7F8FA', card:'#FFFFFF', ink:'#111827', slate:'#6B7280', faint:'#9CA3AF',
  line:'#EEF0F3', indigo:'#4F46E5', indigoSoft:'#EEF0FF',
  emerald:'#059669', emeraldSoft:'#ECFDF5', amber:'#D97706', amberSoft:'#FFFBEB',
  rose:'#E11D48', roseSoft:'#FFF1F3', sky:'#0284C7', skySoft:'#F0F9FF',
  violet:'#7C3AED', violetSoft:'#F5F3FF',
}

const peso = n => `₱${Number(n||0).toLocaleString('en-PH')}`

const ROLE_LABEL = {
  sk_chairperson:'SK Chairperson', sk_secretary:'SK Secretary',
  sk_treasurer:'SK Treasurer', sk_kagawad:'SK Kagawad',
}

function Tip({ active, payload, label, money }) {
  if(!active||!payload?.length) return null
  return (
    <div style={{ background:T.ink, borderRadius:8, padding:'8px 12px', fontSize:11.5, boxShadow:'0 8px 24px rgba(0,0,0,0.18)' }}>
      {label && <div style={{ color:'#fff', fontWeight:700, marginBottom:3 }}>{label}</div>}
      {payload.map((p,i)=><div key={i} style={{ color:'#A5B4FC', fontWeight:600 }}>{money?peso(p.value):p.value}</div>)}
    </div>
  )
}

const ICON = {
  wallet:'M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Zm0 4h18M16 14h2',
  folder:'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z',
  users:'M17 20h5v-2a4 4 0 0 0-3-3.87M9 20H4v-2a4 4 0 0 1 3-3.87m6-1.13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  clock:'M12 8v4l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  check:'M20 6 9 17l-5-5', mega:'M3 11v2a1 1 0 0 0 1 1h2l4 4V6L6 10H4a1 1 0 0 0-1 1Zm14-4v10',
}
function Icon({ d, color, size=18 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>
}

export default function SKDashboard() {
  const { user } = useAuth()
  const role = user?.role || 'sk_kagawad'
  const isChair = role === 'sk_chairperson'
  const isTreasurer = role === 'sk_treasurer'
  const canSeeFinance = isChair || isTreasurer

  const [programs,setPrograms]=useState([])
  const [finance,setFinance]=useState({ totalFunds:0,totalExpenses:0,balance:0 })
  const [expenses,setExpenses]=useState([])
  const [ledger,setLedger]=useState([])
  const [members,setMembers]=useState([])
  const [meetings,setMeetings]=useState([])
  const [loading,setLoading]=useState(true)

  useEffect(()=>{
    const run = async () => {
      try { const r=await axios.get(`${API}/programs`); setPrograms(r.data.programs||[]) } catch { /* ignore */ }
      try { const r=await axios.get(`${API}/finance/summary`); setFinance(r.data) } catch { /* ignore */ }
      try { const r=await axios.get(`${API}/finance/expenses?status=pending`); setExpenses(r.data.expenses||[]) } catch { /* ignore */ }
      try { const r=await axios.get(`${API}/finance/ledger`); setLedger(r.data.ledger||[]) } catch { /* ignore */ }
      try { const r=await axios.get(`${API}/auth/members`); setMembers((r.data.users||[]).filter(u=>u.role!=='admin')) } catch { /* ignore */ }
      try { const r=await axios.get(`${API}/meetings`); setMeetings((r.data.meetings||[]).filter(m=>new Date(m.date)>=new Date()).sort((a,b)=>new Date(a.date)-new Date(b.date)).slice(0,4)) } catch { /* ignore */ }
      setLoading(false)
    }
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[])

  const bal = ledger.map((e,i)=>({ n:i+1, balance:e.runningBalance, date:new Date(e.date).toLocaleDateString('en-PH',{month:'short',day:'numeric'}) }))
  const programMix=[
    {name:'Planned',value:programs.filter(p=>p.status==='planned').length,color:T.amber},
    {name:'Ongoing',value:programs.filter(p=>p.status==='ongoing').length,color:T.sky},
    {name:'Completed',value:programs.filter(p=>p.status==='completed').length,color:T.emerald},
  ].filter(d=>d.value>0)

  const hour=new Date().getHours()
  const greeting=hour<12?'Good morning':hour<18?'Good afternoon':'Good evening'
  const today=new Date().toLocaleDateString('en-PH',{weekday:'long',month:'long',day:'numeric'})

  if(loading) return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:440,gap:16}}>
      <div style={{width:32,height:32,border:`2.5px solid ${T.line}`,borderTopColor:T.indigo,borderRadius:'50%',animation:'sp .7s linear infinite'}}/>
      <span style={{fontSize:12,color:T.slate}}>Loading…</span>
      <style>{`@keyframes sp{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{fontFamily:"'Inter','Segoe UI',system-ui,sans-serif",color:T.ink}}>

      {/* Gradient header */}
      <div style={{position:'relative',background:`linear-gradient(120deg,#4F46E5,#7C3AED)`,borderRadius:20,padding:'26px 28px',marginBottom:20,overflow:'hidden',boxShadow:'0 14px 36px rgba(79,70,229,0.26)'}}>
        <div style={{position:'absolute',right:-30,top:-50,width:190,height:190,borderRadius:'50%',background:'rgba(255,255,255,0.10)'}}/>
        <div style={{position:'absolute',right:110,bottom:-70,width:150,height:150,borderRadius:'50%',background:'rgba(255,255,255,0.07)'}}/>
        <div style={{position:'relative'}}>
          <div style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.75)',letterSpacing:'1.5px',textTransform:'uppercase',marginBottom:6}}>{ROLE_LABEL[role]} · Barangay Tawiran</div>
          <h1 style={{fontSize:26,fontWeight:800,margin:0,letterSpacing:'-0.6px',color:'#fff'}}>{greeting}, {user?.firstName || 'Officer'} 👋</h1>
          <p style={{fontSize:13,color:'rgba(255,255,255,0.82)',margin:'6px 0 0'}}>{today}</p>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16,marginBottom:16}}>
        {[
          canSeeFinance && { label:'Balance on Hand', value:peso(finance.balance), foot:'Available funds', color:T.indigo, soft:T.indigoSoft, icon:ICON.wallet, to:'/sk/finance' },
          { label:'Programs', value:programs.length, foot:`${programs.filter(p=>p.status==='ongoing').length} ongoing`, color:T.sky, soft:T.skySoft, icon:ICON.folder, to:'/sk/programs' },
          { label:'Members', value:members.length, foot:'SK & Kabataan', color:T.violet, soft:T.violetSoft, icon:ICON.users, to:'/sk/members' },
          isChair && expenses.length>0 && { label:'Pending Approvals', value:expenses.length, foot:'Awaiting your review', color:T.amber, soft:T.amberSoft, icon:ICON.clock, to:'/sk/finance' },
          { label:'Upcoming Meetings', value:meetings.length, foot:'Scheduled ahead', color:T.emerald, soft:T.emeraldSoft, icon:ICON.clock, to:'/sk/meetings' },
        ].filter(Boolean).slice(0,4).map((s,i)=>(
          <Link key={i} to={s.to} style={{textDecoration:'none'}}>
            <div style={{position:'relative',background:T.card,border:`1px solid ${T.line}`,borderRadius:16,padding:20,transition:'transform .15s,box-shadow .15s',cursor:'pointer',overflow:'hidden'}}
              onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow='0 14px 30px rgba(17,24,39,0.09)'}}
              onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='none'}}>
              <div style={{position:'absolute',right:-18,top:-18,width:70,height:70,borderRadius:'50%',background:s.soft,opacity:0.5}}/>
              <div style={{position:'relative'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16}}>
                  <div style={{width:44,height:44,borderRadius:13,background:s.soft,display:'flex',alignItems:'center',justifyContent:'center'}}><Icon d={s.icon} color={s.color}/></div>
                  <span style={{fontSize:16,color:T.faint,fontWeight:700}}>→</span>
                </div>
                <div style={{fontSize:s.value.toString().length>7?24:32,fontWeight:800,lineHeight:1,letterSpacing:'-1px'}}>{s.value}</div>
                <div style={{fontSize:13,fontWeight:700,marginTop:9}}>{s.label}</div>
                <div style={{fontSize:11.5,color:T.faint,marginTop:3}}>{s.foot}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Finance section — chairperson & treasurer only */}
      {canSeeFinance && (
        <div style={{display:'grid',gridTemplateColumns:'1.4fr 1fr',gap:16,marginBottom:16}}>
          <Card title="Budget Balance — Over Time" sub="Running balance after each transaction">
            {bal.length>1
              ? <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={bal} margin={{top:8,right:12,left:-6,bottom:0}}>
                    <defs><linearGradient id="skbal" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.indigo} stopOpacity={0.22}/><stop offset="100%" stopColor={T.indigo} stopOpacity={0}/></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.line} vertical={false}/>
                    <XAxis dataKey="date" tick={{fontSize:11,fill:T.faint}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize:11,fill:T.faint}} axisLine={false} tickLine={false} tickFormatter={v=>`₱${(v/1000).toFixed(0)}k`}/>
                    <Tooltip content={<Tip money/>}/>
                    <Area type="monotone" dataKey="balance" stroke={T.indigo} strokeWidth={2.5} fill="url(#skbal)"/>
                  </AreaChart>
                </ResponsiveContainer>
              : <Empty text="No transactions recorded yet"/>}
          </Card>

          <div style={{display:'flex',flexDirection:'column',gap:16}}>
            <div style={{background:`linear-gradient(135deg,#059669,#047857)`,borderRadius:16,padding:20,color:'#fff'}}>
              <div style={{fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.8)',textTransform:'uppercase',letterSpacing:'0.6px'}}>Funds Received</div>
              <div style={{fontSize:26,fontWeight:800,marginTop:6}}>{peso(finance.totalFunds)}</div>
            </div>
            <div style={{background:`linear-gradient(135deg,#E11D48,#BE123C)`,borderRadius:16,padding:20,color:'#fff'}}>
              <div style={{fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.8)',textTransform:'uppercase',letterSpacing:'0.6px'}}>Total Disbursed</div>
              <div style={{fontSize:26,fontWeight:800,marginTop:6}}>{peso(finance.totalExpenses)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Pending approvals — chairperson only */}
      {isChair && expenses.length>0 && (
        <div style={{marginBottom:16}}>
          <Card title="Expenses Awaiting Your Approval" sub="As Chairperson, review and approve or reject" link="/sk/finance" linkText="Review all" flush>
            {expenses.slice(0,4).map((e,i)=>(
              <div key={e._id} style={{display:'flex',alignItems:'center',gap:14,padding:'13px 20px',borderBottom:i<Math.min(expenses.length,4)-1?`1px solid ${T.line}`:'none'}}>
                <div style={{width:38,height:38,borderRadius:10,background:T.amberSoft,display:'flex',alignItems:'center',justifyContent:'center'}}><Icon d={ICON.wallet} color={T.amber} size={17}/></div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:700}}>{e.title}</div>
                  <div style={{fontSize:11,color:T.faint}}>Recorded by {e.recordedBy?.firstName} {e.recordedBy?.lastName} · Receipt #{e.receiptNumber||'N/A'}</div>
                </div>
                <div style={{fontSize:15,fontWeight:800,color:T.rose}}>{peso(e.amount)}</div>
                <Link to="/sk/finance" style={{fontSize:11,fontWeight:700,color:T.indigo,textDecoration:'none',padding:'6px 12px',background:T.indigoSoft,borderRadius:8}}>Review →</Link>
              </div>
            ))}
          </Card>
        </div>
      )}

      {/* Programs + activity */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1.4fr',gap:16}}>
        <Card title="Programs by Status" link="/sk/programs" linkText="View all">
          {programMix.length===0 ? <Empty text="No programs yet"/> :
            <div style={{display:'flex',alignItems:'center',gap:14}}>
              <ResponsiveContainer width="52%" height={160}>
                <PieChart>
                  <Pie data={programMix} cx="50%" cy="50%" innerRadius={40} outerRadius={62} paddingAngle={3} dataKey="value">
                    {programMix.map((e,i)=><Cell key={i} fill={e.color}/>)}
                  </Pie>
                  <Tooltip content={<Tip/>}/>
                </PieChart>
              </ResponsiveContainer>
              <div style={{flex:1,display:'flex',flexDirection:'column',gap:10}}>
                {programMix.map((e,i)=>(
                  <div key={i} style={{display:'flex',alignItems:'center',gap:9,fontSize:12}}>
                    <span style={{width:10,height:10,borderRadius:3,background:e.color}}/>
                    <span style={{color:T.slate,flex:1}}>{e.name}</span>
                    <span style={{fontWeight:700}}>{e.value}</span>
                  </div>
                ))}
              </div>
            </div>}
        </Card>

        <Card title="Upcoming Meetings" sub="Next scheduled activities" link="/sk/meetings" linkText="View calendar" flush>
          {meetings.length===0 ? <Empty text="No upcoming meetings"/> :
            meetings.map((m,i)=>(
              <div key={m._id} style={{display:'flex',alignItems:'center',gap:14,padding:'13px 20px',borderBottom:i<meetings.length-1?`1px solid ${T.line}`:'none'}}>
                <div style={{width:44,height:44,borderRadius:10,background:T.skySoft,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <span style={{fontSize:9,fontWeight:700,color:T.sky,textTransform:'uppercase'}}>{new Date(m.date).toLocaleDateString('en-PH',{month:'short'})}</span>
                  <span style={{fontSize:16,fontWeight:800,color:T.sky,lineHeight:1}}>{new Date(m.date).getDate()}</span>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:700}}>{m.title}</div>
                  <div style={{fontSize:11,color:T.faint}}>{m.location||'Venue TBA'} · {new Date(m.date).toLocaleTimeString('en-PH',{hour:'2-digit',minute:'2-digit'})}</div>
                </div>
              </div>
            ))}
        </Card>
      </div>

    </div>
  )
}

function Card({ title, sub, link, linkText, flush, children }) {
  return (
    <div style={{background:'#fff',border:`1px solid #EEF0F3`,borderRadius:16,overflow:'hidden',boxShadow:'0 1px 3px rgba(17,24,39,0.03)'}}>
      <div style={{padding:'15px 20px',borderBottom:`1px solid #F2F3F6`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div>
          <div style={{fontSize:14,fontWeight:700,letterSpacing:'-0.2px'}}>{title}</div>
          {sub && <div style={{fontSize:11.5,color:'#9CA3AF',marginTop:2}}>{sub}</div>}
        </div>
        {link && <Link to={link} style={{fontSize:12,fontWeight:600,color:'#4F46E5',textDecoration:'none',padding:'5px 10px',borderRadius:8,background:'#EEF0FF'}}>{linkText} →</Link>}
      </div>
      <div style={{padding: flush?0:20}}>{children}</div>
    </div>
  )
}
function Empty({ text }) {
  return <div style={{height:150,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12.5,color:'#9CA3AF'}}>{text}</div>
}