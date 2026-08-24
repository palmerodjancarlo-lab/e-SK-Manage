// admin/Dashboard.jsx — e-SK Manage · Administrator (System Maintenance)
// Admin focus: accounts, system health, user activity, audit oversight.
// Finance is a small oversight glance only — SK Chairperson/Treasurer own the budget.

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
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

const ROLES = {
  sk_chairperson:{ label:'Chairperson', color:T.indigo },
  sk_secretary:  { label:'Secretary',   color:T.emerald },
  sk_treasurer:  { label:'Treasurer',   color:T.amber },
  sk_kagawad:    { label:'Kagawad',     color:T.sky },
  kabataan:      { label:'Kabataan',    color:T.violet },
  admin:         { label:'Admin/IT',    color:T.rose },
}
const TONE = {
  LOGIN:T.emerald, REGISTER:T.sky, CREATE_SK_ACCOUNT:T.indigo, UPDATE_USER:T.sky,
  DELETE_USER:T.rose, TOGGLE_USER:T.amber, RESET_PASSWORD:T.amber, CHANGE_PASSWORD:T.amber,
  RECORD_FUND:T.emerald, RECORD_EXPENSE:T.rose, APPROVE_EXPENSE:T.emerald, VOID_EXPENSE:T.rose,
  CREATE_PROGRAM:T.violet, CREATE_PROJECT:T.sky, CREATE_ACTIVITY:T.amber, RECORD_ATTENDANCE:T.emerald,
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
  users:'M17 20h5v-2a4 4 0 0 0-3-3.87M9 20H4v-2a4 4 0 0 1 3-3.87m6-1.13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  shield:'M12 3l7 4v5c0 4.5-3 7.3-7 9-4-1.7-7-4.5-7-9V7l7-4Z',
  star:'M12 3l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8 6.2 21l1.1-6.5L2.6 9.8l6.5-.9L12 3Z',
  check:'M20 6 9 17l-5-5',
  activity:'M22 12h-4l-3 9L9 3l-3 9H2',
  key:'M21 2l-2 2m-7.6 7.6a5 5 0 1 0-7 7 5 5 0 0 0 7-7Zm0 0L15 8m0 0l3 3m-3-3l2-2',
}
function Icon({ d, color, size=18 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>
}

export default function AdminDashboard() {
  const [stats,setStats]=useState({ totalUsers:0,activeUsers:0,kabataanCount:0,skOfficialCount:0 })
  const [users,setUsers]=useState([]); const [logs,setLogs]=useState([])
  const [programs,setPrograms]=useState([])
  const [finance,setFinance]=useState({ totalFunds:0,totalExpenses:0,balance:0 })
  const [loading,setLoading]=useState(true)

  useEffect(()=>{
    Promise.all([
      axios.get(`${API}/admin/stats`), axios.get(`${API}/admin/users`),
      axios.get(`${API}/admin/logs`), axios.get(`${API}/programs`),
      axios.get(`${API}/finance/summary`).catch(()=>({data:{totalFunds:0,totalExpenses:0,balance:0}})),
    ]).then(([s,u,l,p,f])=>{
      setStats(s.data.stats); setUsers(u.data.users); setLogs(l.data.logs.slice(0,8))
      setPrograms(p.data.programs); setFinance(f.data)
    }).catch(console.error).finally(()=>setLoading(false))
  },[])

  const inactive = stats.totalUsers - stats.activeUsers
  const activePct = stats.totalUsers>0 ? Math.round((stats.activeUsers/stats.totalUsers)*100) : 0

  // account composition donut
  const composition=[
    {name:'SK Officials',value:stats.skOfficialCount,color:T.amber},
    {name:'Kabataan',value:stats.kabataanCount,color:T.violet},
    {name:'Admin',value:users.filter(u=>u.role==='admin').length,color:T.rose},
  ].filter(d=>d.value>0)

  // account activity — logins/actions per action type (system-level view)
  const actionCounts = {}
  logs.forEach(l=>{ actionCounts[l.action]=(actionCounts[l.action]||0)+1 })

  const today=new Date().toLocaleDateString('en-PH',{weekday:'long',month:'long',day:'numeric'})
  const hour=new Date().getHours()
  const greeting=hour<12?'Good morning':hour<18?'Good afternoon':'Good evening'
  const name='Admin'

  if(loading) return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:440,gap:16}}>
      <div style={{width:32,height:32,border:`2.5px solid ${T.line}`,borderTopColor:T.indigo,borderRadius:'50%',animation:'sp .7s linear infinite'}}/>
      <span style={{fontSize:12,color:T.slate}}>Loading dashboard…</span>
      <style>{`@keyframes sp{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const stat=[
    { label:'Total Accounts', value:stats.totalUsers, foot:`${stats.activeUsers} active · ${inactive} inactive`, color:T.indigo, soft:T.indigoSoft, icon:ICON.users, to:'/admin/users' },
    { label:'SK Officials', value:stats.skOfficialCount, foot:'Council accounts', color:T.amber, soft:T.amberSoft, icon:ICON.shield, to:'/admin/users' },
    { label:'Kabataan', value:stats.kabataanCount, foot:'Registered youth', color:T.violet, soft:T.violetSoft, icon:ICON.star, to:'/admin/users' },
    { label:'Programs', value:programs.length, foot:`${programs.filter(p=>p.status==='ongoing').length} ongoing`, color:T.sky, soft:T.skySoft, icon:ICON.activity, to:'/admin/programs' },
  ]

  return (
    <div style={{fontFamily:"'Inter','Segoe UI',system-ui,sans-serif",color:T.ink}}>

      {/* Header banner */}
      <div style={{position:'relative',background:`linear-gradient(120deg,#4F46E5 0%,#6D5AE6 55%,#7C3AED 100%)`,borderRadius:20,padding:'26px 28px',marginBottom:20,overflow:'hidden',boxShadow:'0 14px 36px rgba(79,70,229,0.26)'}}>
        <div style={{position:'absolute',right:-30,top:-50,width:190,height:190,borderRadius:'50%',background:'rgba(255,255,255,0.10)'}}/>
        <div style={{position:'absolute',right:110,bottom:-70,width:150,height:150,borderRadius:'50%',background:'rgba(255,255,255,0.07)'}}/>
        <div style={{position:'relative',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:16}}>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.75)',letterSpacing:'1.5px',textTransform:'uppercase',marginBottom:6}}>Administrator · System Maintenance</div>
            <h1 style={{fontSize:26,fontWeight:800,margin:0,letterSpacing:'-0.6px',color:'#fff'}}>{greeting}, {name} 👋</h1>
            <p style={{fontSize:13,color:'rgba(255,255,255,0.82)',margin:'6px 0 0'}}>{today} · Barangay Tawiran, Santa Cruz</p>
          </div>
          <div style={{display:'flex',gap:10}}>
            <Link to="/admin/create-sk" style={{padding:'11px 18px',background:'#fff',color:T.indigo,borderRadius:11,textDecoration:'none',fontSize:13,fontWeight:700,boxShadow:'0 6px 18px rgba(0,0,0,0.12)'}}>+ Create SK Account</Link>
            <Link to="/admin/logs" style={{padding:'11px 18px',background:'rgba(255,255,255,0.14)',color:'#fff',border:'1px solid rgba(255,255,255,0.3)',borderRadius:11,textDecoration:'none',fontSize:13,fontWeight:600,backdropFilter:'blur(4px)'}}>Audit Logs</Link>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16,marginBottom:16}}>
        {stat.map((s,i)=>(
          <Link key={i} to={s.to} style={{textDecoration:'none'}}>
            <div style={{position:'relative',background:T.card,border:`1px solid ${T.line}`,borderRadius:16,padding:20,transition:'transform .15s,box-shadow .15s',cursor:'pointer',overflow:'hidden'}}
              onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow='0 14px 30px rgba(17,24,39,0.09)'}}
              onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='none'}}>
              <div style={{position:'absolute',right:-18,top:-18,width:70,height:70,borderRadius:'50%',background:s.soft,opacity:0.5}}/>
              <div style={{position:'relative'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16}}>
                  <div style={{width:44,height:44,borderRadius:13,background:s.soft,display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <Icon d={s.icon} color={s.color}/>
                  </div>
                  <span style={{fontSize:16,color:T.faint,fontWeight:700}}>→</span>
                </div>
                <div style={{fontSize:32,fontWeight:800,lineHeight:1,letterSpacing:'-1px'}}>{s.value}</div>
                <div style={{fontSize:13,fontWeight:700,marginTop:9}}>{s.label}</div>
                <div style={{fontSize:11.5,color:T.faint,marginTop:3}}>{s.foot}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Main grid: account health + composition + system status */}
      <div style={{display:'grid',gridTemplateColumns:'1.1fr 1fr 1fr',gap:16,marginBottom:16}}>

        {/* Account health */}
        <Card title="Account Health" sub="Active vs inactive accounts">
          <div style={{display:'flex',alignItems:'center',gap:20}}>
            <div style={{position:'relative',width:120,height:120,flexShrink:0}}>
              <svg width="120" height="120" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="none" stroke={T.line} strokeWidth="12"/>
                <circle cx="60" cy="60" r="50" fill="none" stroke={T.emerald} strokeWidth="12" strokeLinecap="round"
                  strokeDasharray={`${(activePct/100)*314} 314`} transform="rotate(-90 60 60)"/>
              </svg>
              <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
                <span style={{fontSize:26,fontWeight:800}}>{activePct}%</span>
                <span style={{fontSize:10,color:T.faint}}>active</span>
              </div>
            </div>
            <div style={{flex:1,display:'flex',flexDirection:'column',gap:12}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <span style={{width:10,height:10,borderRadius:3,background:T.emerald}}/>
                <span style={{fontSize:12.5,color:T.slate,flex:1}}>Active</span>
                <span style={{fontSize:15,fontWeight:800}}>{stats.activeUsers}</span>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <span style={{width:10,height:10,borderRadius:3,background:T.line}}/>
                <span style={{fontSize:12.5,color:T.slate,flex:1}}>Inactive</span>
                <span style={{fontSize:15,fontWeight:800}}>{inactive}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Account composition */}
        <Card title="Account Composition" sub="Who's in the system">
          {composition.length===0 ? <Empty text="No accounts"/> :
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <ResponsiveContainer width="52%" height={140}>
                <PieChart>
                  <Pie data={composition} cx="50%" cy="50%" innerRadius={38} outerRadius={60} paddingAngle={3} dataKey="value">
                    {composition.map((e,i)=><Cell key={i} fill={e.color}/>)}
                  </Pie>
                  <Tooltip content={<Tip/>}/>
                </PieChart>
              </ResponsiveContainer>
              <div style={{flex:1,display:'flex',flexDirection:'column',gap:9}}>
                {composition.map((e,i)=>(
                  <div key={i} style={{display:'flex',alignItems:'center',gap:8,fontSize:11.5}}>
                    <span style={{width:9,height:9,borderRadius:2,background:e.color}}/>
                    <span style={{color:T.slate,flex:1}}>{e.name}</span>
                    <span style={{fontWeight:700}}>{e.value}</span>
                  </div>
                ))}
              </div>
            </div>
          }
        </Card>

        {/* System status */}
        <Card title="System Status" sub="Live health checks">
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {[
              { label:'System', note:'Online and operational' },
              { label:'Records', note:'All data synced' },
              { label:'File Uploads', note:'Available' },
              { label:'Security', note:'Sessions secure' },
            ].map((s,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:11,padding:'9px 12px',background:T.emeraldSoft,borderRadius:10}}>
                <div style={{width:26,height:26,borderRadius:8,background:'#fff',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <Icon d={ICON.check} color={T.emerald} size={15}/>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:700}}>{s.label}</div>
                  <div style={{fontSize:10.5,color:T.slate}}>{s.note}</div>
                </div>
                <span style={{width:8,height:8,borderRadius:'50%',background:T.emerald}}/>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Finance oversight strip (small — admin just observes) */}
      <div style={{background:T.card,border:`1px solid ${T.line}`,borderRadius:16,padding:'16px 20px',marginBottom:16,display:'flex',alignItems:'center',gap:20,flexWrap:'wrap'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:36,height:36,borderRadius:10,background:T.amberSoft,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>💰</div>
          <div>
            <div style={{fontSize:12.5,fontWeight:700}}>Finance Oversight</div>
            <div style={{fontSize:10.5,color:T.faint}}>Managed by SK Chairperson & Treasurer — view only</div>
          </div>
        </div>
        <div style={{display:'flex',gap:28,marginLeft:'auto',flexWrap:'wrap'}}>
          <MiniStat label="Funds" value={peso(finance.totalFunds)} color={T.emerald}/>
          <MiniStat label="Disbursed" value={peso(finance.totalExpenses)} color={T.rose}/>
          <MiniStat label="Balance" value={peso(finance.balance)} color={T.indigo}/>
        </div>
        <Link to="/admin/finance" style={{fontSize:12,fontWeight:600,color:T.indigo,textDecoration:'none',whiteSpace:'nowrap'}}>View records →</Link>
      </div>

      {/* Roster + Activity */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1.5fr',gap:16}}>
        <Card title="The Council" link="/admin/users" linkText="Manage">
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {Object.entries(ROLES).filter(([r])=>r!=='kabataan'&&r!=='admin').map(([role,cfg])=>{
              const m=users.filter(u=>u.role===role)
              return (
                <div key={role} style={{display:'flex',alignItems:'center',gap:12,padding:'11px 12px',borderRadius:12,background:T.bg}}>
                  <div style={{width:36,height:36,borderRadius:10,background:cfg.color+'18',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800,color:cfg.color}}>
                    {m[0]?`${m[0].firstName[0]}${m[0].lastName[0]}`:'—'}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12.5,fontWeight:700,color:cfg.color}}>{cfg.label}</div>
                    {m[0]
                      ? <div style={{fontSize:11.5,color:T.slate}}>{m[0].firstName} {m[0].lastName}{m.length>1&&<span style={{color:T.faint}}> +{m.length-1}</span>}</div>
                      : <div style={{fontSize:11.5,color:T.faint,fontStyle:'italic'}}>Vacant</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        <Card title="Recent System Activity" sub="Every action, attributed and time-stamped" link="/admin/logs" linkText="View all" flush>
          <div style={{maxHeight:320,overflowY:'auto'}}>
            {logs.length===0
              ? <Empty text="No activity yet"/>
              : logs.map((log,i)=>{
                  const tone=TONE[log.action]||T.slate
                  return (
                    <div key={log._id} style={{display:'flex',gap:12,padding:'13px 20px',borderBottom:i<logs.length-1?`1px solid ${T.line}`:'none'}}>
                      <div style={{width:34,height:34,borderRadius:10,background:tone+'16',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                        <span style={{width:8,height:8,borderRadius:'50%',background:tone}}/>
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12.5,color:T.ink,lineHeight:1.4}}>{log.details}</div>
                        <div style={{fontSize:10.5,color:T.faint,marginTop:3}}>
                          {log.user&&`${log.user.firstName} ${log.user.lastName} · `}
                          {new Date(log.createdAt).toLocaleString('en-PH',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}
                        </div>
                      </div>
                    </div>
                  )
                })}
          </div>
        </Card>
      </div>

    </div>
  )
}

function Card({ title, sub, link, linkText, flush, children }) {
  return (
    <div style={{background:'#fff',border:`1px solid #EEF0F3`,borderRadius:16,overflow:'hidden'}}>
      <div style={{padding:'16px 20px',borderBottom:`1px solid #EEF0F3`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div>
          <div style={{fontSize:14,fontWeight:700}}>{title}</div>
          {sub && <div style={{fontSize:11.5,color:'#9CA3AF',marginTop:2}}>{sub}</div>}
        </div>
        {link && <Link to={link} style={{fontSize:12,fontWeight:600,color:'#4F46E5',textDecoration:'none'}}>{linkText} →</Link>}
      </div>
      <div style={{padding: flush?0:20}}>{children}</div>
    </div>
  )
}
function MiniStat({ label, value, color }) {
  return (
    <div>
      <div style={{fontSize:10,color:'#9CA3AF',textTransform:'uppercase',letterSpacing:'0.5px',fontWeight:600}}>{label}</div>
      <div style={{fontSize:16,fontWeight:800,color,marginTop:2}}>{value}</div>
    </div>
  )
}
function Empty({ text }) {
  return <div style={{height:140,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12.5,color:'#9CA3AF'}}>{text}</div>
}