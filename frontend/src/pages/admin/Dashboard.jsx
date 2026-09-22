// admin/Dashboard.jsx — Admin overview, institutional design, theme-aware
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTheme } from '../../context/theme-utils'
import { Icon } from '../../components/Icon'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, CartesianGrid,
} from 'recharts'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'
const peso = n => `\u20B1${Number(n||0).toLocaleString('en-PH')}`

const ROLES = {
  sk_chairperson:'Chairperson', sk_secretary:'Secretary',
  sk_treasurer:'Treasurer', sk_kagawad:'Kagawad',
}

export default function AdminDashboard() {
  const { T } = useTheme()
  const [stats,setStats]=useState({ totalUsers:0,activeUsers:0,kabataanCount:0,skOfficialCount:0 })
  const [users,setUsers]=useState([]); const [logs,setLogs]=useState([])
  const [programs,setPrograms]=useState([])
  const [finance,setFinance]=useState({ totalFunds:0,totalExpenses:0,balance:0,expensesByCategory:[] })
  const [ledger,setLedger]=useState([]); const [loading,setLoading]=useState(true)

  useEffect(()=>{
    let active=true
    Promise.all([
      axios.get(`${API}/admin/stats`), axios.get(`${API}/admin/users`),
      axios.get(`${API}/admin/logs`), axios.get(`${API}/programs`),
      axios.get(`${API}/finance/summary`).catch(()=>({data:{totalFunds:0,totalExpenses:0,balance:0,expensesByCategory:[]}})),
      axios.get(`${API}/finance/ledger`).catch(()=>({data:{ledger:[]}})),
    ]).then(([s,u,l,p,f,g])=>{
      if(!active) return
      setStats(s.data.stats); setUsers(u.data.users); setLogs(l.data.logs.slice(0,6))
      setPrograms(p.data.programs); setFinance(f.data); setLedger(g.data.ledger||[])
    }).catch(console.error).finally(()=>{ if(active) setLoading(false) })
    return ()=>{ active=false }
  },[])

  const bal = ledger.map((e,i)=>({ n:i+1, balance:e.runningBalance, date:new Date(e.date).toLocaleDateString('en-PH',{month:'short',day:'numeric'}) }))
  const expCats=(finance.expensesByCategory||[]).map(e=>({ name:(e._id||'other').replace(/\b\w/g,c=>c.toUpperCase()), value:e.total }))
  const programMix=[
    {name:'Planned',value:programs.filter(p=>p.status==='planned').length,color:T.amber},
    {name:'Ongoing',value:programs.filter(p=>p.status==='ongoing').length,color:T.sky},
    {name:'Completed',value:programs.filter(p=>p.status==='completed').length,color:T.green},
    {name:'Cancelled',value:programs.filter(p=>p.status==='cancelled').length,color:T.red},
  ].filter(d=>d.value>0)
  const today=new Date().toLocaleDateString('en-PH',{weekday:'long',month:'long',day:'numeric',year:'numeric'})

  if(loading) return <Loader T={T} />

  const stat = [
    { label:'Total Accounts', value:stats.totalUsers, foot:`${stats.activeUsers} active`, icon:'users', tint:T.accent, to:'/admin/users' },
    { label:'SK Officials', value:stats.skOfficialCount, foot:'Council members', icon:'shield', tint:T.gold, to:'/admin/users' },
    { label:'Kabataan', value:stats.kabataanCount, foot:'Registered youth', icon:'star', tint:T.violet, to:'/admin/users' },
    { label:'Programs', value:programs.length, foot:`${programs.filter(p=>p.status==='ongoing').length} ongoing`, icon:'clipboardList', tint:T.sky, to:'/admin/programs' },
  ]

  const card = { background:T.surface, border:`1px solid ${T.border}`, borderRadius:14, boxShadow:T.shadow }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom:22 }}>
        <div style={{ fontSize:11, fontWeight:700, color:T.accentText, textTransform:'uppercase', letterSpacing:'1px', marginBottom:6 }}>Administrator Console</div>
        <h1 style={{ fontSize:24, fontWeight:800, margin:0, color:T.text, letterSpacing:'-0.5px' }}>System Overview</h1>
        <p style={{ fontSize:13, color:T.text2, margin:'5px 0 0' }}>{today} &middot; Barangay Tawiran, Santa Cruz</p>
      </div>

      {/* Stat cards */}
      <div className="adm-grid-4" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:16 }}>
        {stat.map((s,i)=>(
          <Link key={i} to={s.to} style={{ textDecoration:'none' }}>
            <div style={{ ...card, padding:18 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
                <div style={{ width:40, height:40, borderRadius:10, background:s.tint+'1A', display:'flex', alignItems:'center', justifyContent:'center', color:s.tint }}>
                  <Icon name={s.icon} size={19} />
                </div>
              </div>
              <div style={{ fontSize:28, fontWeight:800, color:T.text, lineHeight:1, letterSpacing:'-1px' }}>{s.value}</div>
              <div style={{ fontSize:13, fontWeight:600, color:T.text, marginTop:8 }}>{s.label}</div>
              <div style={{ fontSize:11.5, color:T.text3, marginTop:2 }}>{s.foot}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Treasury summary strip */}
      <div style={{ ...card, padding:0, marginBottom:16, overflow:'hidden' }}>
        <div className="adm-treasury" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', borderBottom:`1px solid ${T.border}` }}>
          {[
            { label:'Funds Received', value:peso(finance.totalFunds), c:T.green },
            { label:'Total Disbursed', value:peso(finance.totalExpenses), c:T.red },
            { label:'Balance on Hand', value:peso(finance.balance), c:T.accent },
          ].map((s,i)=>(
            <div key={i} style={{ padding:'18px 20px', borderRight: i<2?`1px solid ${T.border}`:'none' }}>
              <div style={{ fontSize:11, fontWeight:600, color:T.text3, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:7 }}>{s.label}</div>
              <div style={{ fontSize:21, fontWeight:800, color:s.c, letterSpacing:'-0.5px' }}>{s.value}</div>
            </div>
          ))}
        </div>
        {bal.length>1 && (
          <div style={{ padding:'16px 20px' }}>
            <div style={{ fontSize:12, fontWeight:700, color:T.text2, marginBottom:10 }}>Balance Over Time</div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={bal} margin={{top:4,right:8,left:-8,bottom:0}}>
                <defs><linearGradient id="abal" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.accent} stopOpacity={0.18}/><stop offset="100%" stopColor={T.accent} stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false}/>
                <XAxis dataKey="date" tick={{fontSize:11,fill:T.text3}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fontSize:11,fill:T.text3}} axisLine={false} tickLine={false} tickFormatter={v=>`\u20B1${(v/1000).toFixed(0)}k`}/>
                <Tooltip contentStyle={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:8, fontSize:12, color:T.text }} formatter={v=>peso(v)}/>
                <Area type="monotone" dataKey="balance" stroke={T.accent} strokeWidth={2.5} fill="url(#abal)"/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Charts row */}
      <div className="adm-grid-2" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
        <Panel T={T} title="Programs by Status">
          {programMix.length===0 ? <Empty T={T} text="No programs yet"/> :
            <div style={{ display:'flex', alignItems:'center', gap:16 }}>
              <ResponsiveContainer width="50%" height={160}>
                <PieChart><Pie data={programMix} cx="50%" cy="50%" innerRadius={42} outerRadius={64} paddingAngle={3} dataKey="value">{programMix.map((e,i)=><Cell key={i} fill={e.color}/>)}</Pie>
                <Tooltip contentStyle={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:8, fontSize:12, color:T.text }}/></PieChart>
              </ResponsiveContainer>
              <div style={{ flex:1, display:'flex', flexDirection:'column', gap:9 }}>
                {programMix.map((e,i)=>(
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:9, fontSize:12.5 }}>
                    <span style={{ width:9, height:9, borderRadius:2, background:e.color }}/>
                    <span style={{ color:T.text2, flex:1 }}>{e.name}</span>
                    <span style={{ fontWeight:700, color:T.text }}>{e.value}</span>
                  </div>
                ))}
              </div>
            </div>}
        </Panel>

        <Panel T={T} title="Spending by Category">
          {expCats.length===0 ? <Empty T={T} text="No expenses recorded yet"/> :
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={expCats} layout="vertical" margin={{left:6,right:10}} barSize={15}>
                <XAxis type="number" tick={{fontSize:10,fill:T.text3}} axisLine={false} tickLine={false} tickFormatter={v=>`\u20B1${(v/1000).toFixed(0)}k`}/>
                <YAxis type="category" dataKey="name" tick={{fontSize:11,fill:T.text2}} axisLine={false} tickLine={false} width={82}/>
                <Tooltip contentStyle={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:8, fontSize:12, color:T.text }} cursor={{fill:T.surface2}} formatter={v=>peso(v)}/>
                <Bar dataKey="value" fill={T.red} radius={[0,5,5,0]}/>
              </BarChart>
            </ResponsiveContainer>}
        </Panel>
      </div>

      {/* Roster + activity */}
      <div className="adm-grid-roster" style={{ display:'grid', gridTemplateColumns:'1fr 1.5fr', gap:16 }}>
        <Panel T={T} title="The Council" action={<Link to="/admin/users" style={{ fontSize:12, fontWeight:600, color:T.accentText, textDecoration:'none' }}>Manage</Link>}>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {Object.entries(ROLES).map(([role,label])=>{
              const m=users.filter(u=>u.role===role)
              return (
                <div key={role} style={{ display:'flex', alignItems:'center', gap:11, padding:'9px 11px', borderRadius:9, background:T.surface2 }}>
                  <div style={{ width:34, height:34, borderRadius:9, background:T.accent+'1A', color:T.accentText, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800 }}>
                    {m[0]?`${m[0].firstName[0]}${m[0].lastName[0]}`:'\u2014'}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12.5, fontWeight:700, color:T.text }}>{label}</div>
                    {m[0] ? <div style={{ fontSize:11.5, color:T.text2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{m[0].firstName} {m[0].lastName}{m.length>1&&<span style={{color:T.text3}}> +{m.length-1}</span>}</div>
                          : <div style={{ fontSize:11.5, color:T.text3, fontStyle:'italic' }}>Vacant</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </Panel>

        <Panel T={T} title="Recent Activity" sub="Attributed and time-stamped" action={<Link to="/admin/logs" style={{ fontSize:12, fontWeight:600, color:T.accentText, textDecoration:'none' }}>View all</Link>} flush>
          <div style={{ maxHeight:280, overflowY:'auto' }}>
            {logs.length===0 ? <Empty T={T} text="No activity yet"/> :
              logs.map((log,i)=>(
                <div key={log._id} style={{ display:'flex', gap:12, padding:'12px 18px', borderBottom:i<logs.length-1?`1px solid ${T.border}`:'none' }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:T.accent, marginTop:5, flexShrink:0 }}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12.5, color:T.text, lineHeight:1.4 }}>{log.details}</div>
                    <div style={{ fontSize:10.5, color:T.text3, marginTop:2 }}>
                      {log.user&&`${log.user.firstName} ${log.user.lastName} \u00B7 `}
                      {new Date(log.createdAt).toLocaleString('en-PH',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </Panel>
      </div>

      <style>{`
        /* Tablet landscape */
        @media (max-width: 1024px) {
          .adm-grid-roster { grid-template-columns: 1fr !important; }
        }
        /* Tablet portrait / large phone landscape */
        @media (max-width: 860px) {
          .adm-grid-4 { grid-template-columns: repeat(2,1fr) !important; }
          .adm-grid-2 { grid-template-columns: 1fr !important; }
        }
        /* Phone landscape / small tablet */
        @media (max-width: 640px) {
          .adm-treasury { grid-template-columns: 1fr !important; }
          .adm-treasury > div { border-right: none !important; border-bottom: 1px solid ${T.border} !important; }
          .adm-treasury > div:last-child { border-bottom: none !important; }
        }
        /* Phone portrait */
        @media (max-width: 440px) {
          .adm-grid-4 { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

function Panel({ T, title, sub, action, flush, children }) {
  return (
    <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:14, boxShadow:T.shadow, overflow:'hidden' }}>
      <div style={{ padding:'15px 18px', borderBottom:`1px solid ${T.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div style={{ fontSize:13.5, fontWeight:700, color:T.text }}>{title}</div>
          {sub && <div style={{ fontSize:11, color:T.text3, marginTop:2 }}>{sub}</div>}
        </div>
        {action}
      </div>
      <div style={{ padding: flush?0:18 }}>{children}</div>
    </div>
  )
}
function Empty({ T, text }) {
  return <div style={{ height:150, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12.5, color:T.text3 }}>{text}</div>
}
function Loader({ T }) {
  return <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:440, gap:14 }}>
    <div style={{ width:32, height:32, border:`2.5px solid ${T.border}`, borderTopColor:T.accent, borderRadius:'50%', animation:'sp .7s linear infinite' }}/>
    <span style={{ fontSize:12, color:T.text2 }}>Loading dashboard\u2026</span>
    <style>{`@keyframes sp{to{transform:rotate(360deg)}}`}</style>
  </div>
}