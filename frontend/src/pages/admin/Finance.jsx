// admin/Finance.jsx — admin financial oversight (read-focused)
import { useState, useEffect } from 'react'
import { useTheme } from '../../context/theme-utils'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, CartesianGrid,
} from 'recharts'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'
const peso = n => `\u20B1${Number(n||0).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2})}`

const STATUS = { pending:'amber', approved:'green', rejected:'red', voided:'text3' }

export default function AdminFinance() {
  const { T } = useTheme()
  const [tab,setTab]=useState('overview')
  const [summary,setSummary]=useState({ totalFunds:0,totalExpenses:0,balance:0,fundsBySource:[],expensesByCategory:[] })
  const [funds,setFunds]=useState([]); const [expenses,setExpenses]=useState([]); const [ledger,setLedger]=useState([])
  const [loading,setLoading]=useState(true)

  useEffect(()=>{
    let active=true
    Promise.all([
      axios.get(`${API}/finance/summary`), axios.get(`${API}/finance/funds`),
      axios.get(`${API}/finance/expenses`), axios.get(`${API}/finance/ledger`),
    ]).then(([s,f,e,l])=>{
      if(!active) return
      setSummary(s.data); setFunds(f.data.funds); setExpenses(e.data.expenses); setLedger(l.data.ledger)
    }).catch(console.error).finally(()=>{ if(active) setLoading(false) })
    return ()=>{ active=false }
  },[])

  const bal = ledger.map((e,i)=>({ n:i+1, balance:e.runningBalance, date:new Date(e.date).toLocaleDateString('en-PH',{month:'short',day:'numeric'}) }))
  const sourceData=(summary.fundsBySource||[]).map(s=>({ name:(s._id||'other').replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase()), value:s.total }))
  const catData=(summary.expensesByCategory||[]).map(e=>({ name:(e._id||'other').replace(/\b\w/g,c=>c.toUpperCase()), value:e.total }))
  const SRC=[T.green,T.amber,T.accent,T.sky,T.violet]
  const statusColor = (s) => ({ amber:T.amber, green:T.green, red:T.red, text3:T.text3 }[STATUS[s]||'text3'])

  if(loading) return <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:400 }}><div style={{ width:30, height:30, border:`2.5px solid ${T.border}`, borderTopColor:T.accent, borderRadius:'50%', animation:'sp .7s linear infinite' }}/><style>{`@keyframes sp{to{transform:rotate(360deg)}}`}</style></div>

  const chartTip = { background:T.surface, border:`1px solid ${T.border}`, borderRadius:8, fontSize:12, color:T.text }

  return (
    <div>
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:11, fontWeight:700, color:T.accentText, textTransform:'uppercase', letterSpacing:'1px', marginBottom:6 }}>Oversight</div>
        <h1 style={{ fontSize:23, fontWeight:800, margin:0, color:T.text, letterSpacing:'-0.5px' }}>Financial Records</h1>
        <p style={{ fontSize:13, color:T.text2, margin:'5px 0 0' }}>Read-only oversight of SK funds and expenses.</p>
      </div>

      {/* Summary */}
      <div className="fin-sum" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:18 }}>
        {[
          { label:'Funds Received', value:peso(summary.totalFunds), c:T.green },
          { label:'Total Disbursed', value:peso(summary.totalExpenses), c:T.red },
          { label:'Balance on Hand', value:peso(summary.balance), c:T.accent },
        ].map((s,i)=>(
          <div key={i} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:'16px 18px', borderTop:`3px solid ${s.c}`, boxShadow:T.shadow }}>
            <div style={{ fontSize:11, fontWeight:600, color:T.text3, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:7 }}>{s.label}</div>
            <div style={{ fontSize:19, fontWeight:800, color:s.c, letterSpacing:'-0.5px' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:16, borderBottom:`1px solid ${T.border}`, flexWrap:'wrap' }}>
        {['overview','funds','expenses','ledger'].map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{
            padding:'10px 16px', border:'none', background:'none', cursor:'pointer', fontSize:13, fontWeight:700, textTransform:'capitalize',
            color: tab===t?T.accentText:T.text2, borderBottom: tab===t?`2px solid ${T.accent}`:'2px solid transparent', marginBottom:-1,
          }}>{t}</button>
        ))}
      </div>

      {tab==='overview' && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {bal.length>1 && (
            <Panel T={T} title="Balance Over Time">
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={bal} margin={{top:4,right:8,left:-8,bottom:0}}>
                  <defs><linearGradient id="fbal" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.accent} stopOpacity={0.18}/><stop offset="100%" stopColor={T.accent} stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false}/>
                  <XAxis dataKey="date" tick={{fontSize:11,fill:T.text3}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fontSize:11,fill:T.text3}} axisLine={false} tickLine={false} tickFormatter={v=>`\u20B1${(v/1000).toFixed(0)}k`}/>
                  <Tooltip contentStyle={chartTip} formatter={v=>peso(v)}/>
                  <Area type="monotone" dataKey="balance" stroke={T.accent} strokeWidth={2.5} fill="url(#fbal)"/>
                </AreaChart>
              </ResponsiveContainer>
            </Panel>
          )}
          <div className="fin-charts" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <Panel T={T} title="Funds by Source">
              {sourceData.length===0 ? <Empty T={T}/> :
                <ResponsiveContainer width="100%" height={190}>
                  <PieChart><Pie data={sourceData} cx="50%" cy="50%" innerRadius={40} outerRadius={68} paddingAngle={2} dataKey="value">{sourceData.map((e,i)=><Cell key={i} fill={SRC[i%SRC.length]}/>)}</Pie><Tooltip contentStyle={chartTip} formatter={v=>peso(v)}/></PieChart>
                </ResponsiveContainer>}
            </Panel>
            <Panel T={T} title="Expenses by Category">
              {catData.length===0 ? <Empty T={T}/> :
                <ResponsiveContainer width="100%" height={190}>
                  <BarChart data={catData} layout="vertical" margin={{left:6,right:10}} barSize={15}>
                    <XAxis type="number" tick={{fontSize:10,fill:T.text3}} axisLine={false} tickLine={false} tickFormatter={v=>`\u20B1${(v/1000).toFixed(0)}k`}/>
                    <YAxis type="category" dataKey="name" tick={{fontSize:11,fill:T.text2}} axisLine={false} tickLine={false} width={82}/>
                    <Tooltip contentStyle={chartTip} cursor={{fill:T.surface2}} formatter={v=>peso(v)}/>
                    <Bar dataKey="value" fill={T.red} radius={[0,5,5,0]}/>
                  </BarChart>
                </ResponsiveContainer>}
            </Panel>
          </div>
        </div>
      )}

      {tab==='funds' && (
        <Panel T={T} title="Fund Receipts" flush>
          <ScrollTable T={T} head={['Date','Source','Amount','Reference','Recorded By']} rows={funds} empty="No fund records"
            render={f=>[
              new Date(f.dateReceived).toLocaleDateString('en-PH'),
              f.source,
              <span style={{ fontWeight:700, color:T.green }}>{peso(f.amount)}</span>,
              f.referenceNumber||'—',
              `${f.recordedBy?.firstName||''} ${f.recordedBy?.lastName||''}`,
            ]}/>
        </Panel>
      )}

      {tab==='expenses' && (
        <Panel T={T} title="Expense Records" flush>
          <ScrollTable T={T} head={['Date','Description','Category','Amount','Status']} rows={expenses} empty="No expense records"
            render={e=>[
              new Date(e.dateSpent).toLocaleDateString('en-PH'),
              e.title,
              <span style={{ textTransform:'capitalize' }}>{e.category}</span>,
              <span style={{ fontWeight:700, color:T.red }}>{peso(e.amount)}</span>,
              <span style={{ fontSize:10.5, fontWeight:700, padding:'2px 9px', borderRadius:999, background:statusColor(e.status)+'18', color:statusColor(e.status), textTransform:'capitalize' }}>{e.status}</span>,
            ]}/>
        </Panel>
      )}

      {tab==='ledger' && (
        <Panel T={T} title="Transaction Ledger" flush>
          <ScrollTable T={T} head={['Date','Type','Description','In','Out','Balance']} rows={ledger} empty="No transactions"
            render={e=>{const isFund=e.entryType==='fund';return[
              new Date(e.date).toLocaleDateString('en-PH'),
              <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:999, background:isFund?T.greenSoft:T.redSoft, color:isFund?T.green:T.red }}>{isFund?'IN':'OUT'}</span>,
              isFund?e.source:e.title,
              isFund?<span style={{ color:T.green, fontWeight:600 }}>{peso(e.amount)}</span>:'',
              !isFund?<span style={{ color:T.red, fontWeight:600 }}>{peso(e.amount)}</span>:'',
              <span style={{ fontWeight:800, color:T.accent }}>{peso(e.runningBalance)}</span>,
            ]}}/>
        </Panel>
      )}

      <style>{`
        @media (max-width: 720px) {
          .fin-sum { grid-template-columns: 1fr !important; }
          .fin-charts { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

function Panel({ T, title, flush, children }) {
  return (
    <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:14, overflow:'hidden', boxShadow:T.shadow }}>
      <div style={{ padding:'15px 18px', borderBottom:`1px solid ${T.border}`, fontSize:13.5, fontWeight:700, color:T.text }}>{title}</div>
      <div style={{ padding: flush?0:18 }}>{children}</div>
    </div>
  )
}
function ScrollTable({ T, head, rows, render, empty }) {
  return (
    <div style={{ overflowX:'auto' }}>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12.5, minWidth:520 }}>
        <thead><tr style={{ background:T.surface2 }}>{head.map(h=><th key={h} style={{ padding:'11px 16px', textAlign:'left', fontSize:11, fontWeight:700, color:T.text3, textTransform:'uppercase', letterSpacing:'0.4px', whiteSpace:'nowrap' }}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.length===0 ? <tr><td colSpan={head.length} style={{ padding:40, textAlign:'center', color:T.text3 }}>{empty}</td></tr>
            : rows.map((r,i)=>(
              <tr key={r._id||i} style={{ borderTop:`1px solid ${T.border}`, opacity:r.isVoided?0.5:1 }}>
                {render(r).map((cell,j)=><td key={j} style={{ padding:'11px 16px', color:T.text2, whiteSpace:'nowrap' }}>{cell}</td>)}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  )
}
function Empty({ T }) { return <div style={{ height:180, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12.5, color:T.text3 }}>No data yet</div> }