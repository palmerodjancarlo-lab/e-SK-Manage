// admin/Finance.jsx — Financial oversight for Admin
// Read-only view of all funds, expenses, ledger with full audit trail
import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area, CartesianGrid,
} from 'recharts'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'

const C = {
  navy:'#0C2340', navyL:'#E8EEF8', gold:'#B8860B', goldL:'#FDF8EC',
  green:'#14532D', greenL:'#F0FDF4', red:'#7F1D1D', redL:'#FFF1F2',
  amber:'#78350F', amberL:'#FFFBEB', border:'#CBD5E1', white:'#FFFFFF',
  text:'#0F172A', muted:'#64748B', faint:'#94A3B8', bg:'#F1F5F9',
}

const peso = n => `₱${Number(n||0).toLocaleString('en-PH', { minimumFractionDigits:2, maximumFractionDigits:2 })}`

function Card({ title, sub, action, children, pad=20 }) {
  return (
    <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:8, overflow:'hidden' }}>
      {title && (
        <div style={{ padding:'14px 20px', borderBottom:`1px solid ${C.border}`, background:'#FAFBFC', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:C.text }}>{title}</div>
            {sub && <div style={{ fontSize:11, color:C.faint, marginTop:2 }}>{sub}</div>}
          </div>
          {action}
        </div>
      )}
      <div style={{ padding:pad }}>{children}</div>
    </div>
  )
}

function Tip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:6, padding:'8px 12px', fontSize:11, boxShadow:'0 4px 12px rgba(0,0,0,0.1)' }}>
      <div style={{ fontWeight:700, marginBottom:4 }}>{label}</div>
      {payload.map((p,i)=><div key={i} style={{ color:p.color, fontWeight:600 }}>{p.name}: {peso(p.value)}</div>)}
    </div>
  )
}

const STATUS = {
  pending:  { label:'Pending',  color:C.amber, bg:C.amberL },
  approved: { label:'Approved', color:C.green, bg:C.greenL },
  rejected: { label:'Rejected', color:C.red,   bg:C.redL   },
  voided:   { label:'Voided',   color:C.muted, bg:C.bg     },
}

export default function AdminFinance() {
  const [tab,     setTab]     = useState('overview')
  const [summary, setSummary] = useState({ totalFunds:0, totalExpenses:0, balance:0, pendingExpenses:{count:0,total:0}, fundsBySource:[], expensesByCategory:[] })
  const [funds,   setFunds]   = useState([])
  const [expenses,setExpenses]= useState([])
  const [ledger,  setLedger]  = useState([])
  const [loading, setLoading] = useState(true)


  useEffect(() => {
    Promise.all([
      axios.get(`${API}/finance/summary`),
      axios.get(`${API}/finance/funds`),
      axios.get(`${API}/finance/expenses`),
      axios.get(`${API}/finance/ledger`),
    ]).then(([s,f,e,l]) => {
      setSummary(s.data)
      setFunds(f.data.funds)
      setExpenses(e.data.expenses)
      setLedger(l.data.ledger)
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  const sourceData = (summary.fundsBySource || []).map(s => ({
    name: s._id?.replace(/_/g,' ').replace(/\b\w/g, c=>c.toUpperCase()) || 'Other',
    value: s.total,
  }))
  const sourceColors = [C.green, C.gold, C.navy, '#1D4ED8', '#6D28D9']

  const catData = (summary.expensesByCategory || []).map(e => ({
    name: e._id?.charAt(0).toUpperCase() + e._id?.slice(1) || 'Other',
    value: e.total,
  }))

  // Ledger running balance area chart
  const ledgerChart = ledger.map((entry, i) => ({
    name: `#${i+1}`,
    balance: entry.runningBalance,
    date: new Date(entry.date).toLocaleDateString('en-PH', { month:'short', day:'numeric' }),
  }))

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:400 }}>
      <div style={{ width:36, height:36, border:`3px solid ${C.border}`, borderTopColor:C.navy, borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ fontFamily:"'Inter','Segoe UI',sans-serif", color:C.text }}>

      {/* Header */}
      <div style={{ marginBottom:24 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
          <div style={{ width:16, height:3, background:C.gold, borderRadius:2 }} />
          <span style={{ fontSize:10, fontWeight:700, color:C.gold, letterSpacing:'2px', textTransform:'uppercase' }}>Financial Oversight</span>
        </div>
        <h1 style={{ fontSize:22, fontWeight:800, color:C.navy, margin:0 }}>Financial Records</h1>
        <p style={{ fontSize:12, color:C.muted, marginTop:4 }}>Complete transparency — every peso received and spent is recorded and traceable.</p>
      </div>

      {/* Summary cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:24 }}>
        {[
          { label:'Total Funds Received', value:peso(summary.totalFunds),    accent:C.green },
          { label:'Total Expenses',       value:peso(summary.totalExpenses), accent:C.red   },
          { label:'Current Balance',      value:peso(summary.balance),       accent:C.navy, sub: summary.balance < 0 ? '⚠ Deficit' : 'Available funds' },
          { label:'Pending Approval',     value:summary.pendingExpenses?.count || 0, accent:C.amber, sub: peso(summary.pendingExpenses?.total) },
        ].map((s,i) => (
          <div key={i} style={{ background:C.white, border:`1px solid ${C.border}`, borderTop:`3px solid ${s.accent}`, borderRadius:8, padding:'18px 20px' }}>
            <div style={{ fontSize:11, fontWeight:600, color:C.muted, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:8 }}>{s.label}</div>
            <div style={{ fontSize:22, fontWeight:800, color:C.text, letterSpacing:'-0.5px' }}>{s.value}</div>
            {s.sub && <div style={{ fontSize:11, color:C.faint, marginTop:4 }}>{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:16, borderBottom:`1px solid ${C.border}` }}>
        {['overview','funds','expenses','ledger'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding:'10px 18px', border:'none', background:'none', cursor:'pointer',
            fontSize:13, fontWeight:700, textTransform:'capitalize',
            color: tab === t ? C.navy : C.muted,
            borderBottom: tab === t ? `2px solid ${C.navy}` : '2px solid transparent',
            marginBottom:-1,
          }}>
            {t}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {tab === 'overview' && (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <Card title="Funds by Source" sub="Where the money comes from">
              {sourceData.length === 0
                ? <p style={{ textAlign:'center', color:C.faint, padding:'40px 0', fontSize:12 }}>No funds recorded yet</p>
                : <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={sourceData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({value})=>`₱${(value/1000).toFixed(0)}k`}>
                        {sourceData.map((e,i)=><Cell key={i} fill={sourceColors[i % sourceColors.length]} />)}
                      </Pie>
                      <Tooltip content={<Tip />} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:10 }} />
                    </PieChart>
                  </ResponsiveContainer>
              }
            </Card>

            <Card title="Expenses by Category" sub="Where the money goes">
              {catData.length === 0
                ? <p style={{ textAlign:'center', color:C.faint, padding:'40px 0', fontSize:12 }}>No expenses recorded yet</p>
                : <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={catData} barSize={30} margin={{ left:0, right:8 }}>
                      <XAxis dataKey="name" tick={{ fontSize:9, fill:C.muted }} axisLine={false} tickLine={false} angle={-20} textAnchor="end" height={50} />
                      <YAxis tick={{ fontSize:10, fill:C.muted }} axisLine={false} tickLine={false} tickFormatter={v=>`₱${(v/1000).toFixed(0)}k`} />
                      <Tooltip content={<Tip />} />
                      <Bar dataKey="value" fill={C.red} radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
              }
            </Card>
          </div>

          {ledgerChart.length > 0 && (
            <Card title="Balance Over Time" sub="Running balance after each transaction">
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={ledgerChart} margin={{ left:0, right:8, top:8 }}>
                  <defs>
                    <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.navy} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={C.navy} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize:9, fill:C.muted }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize:10, fill:C.muted }} axisLine={false} tickLine={false} tickFormatter={v=>`₱${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<Tip />} />
                  <Area type="monotone" dataKey="balance" name="Balance" stroke={C.navy} strokeWidth={2} fill="url(#balGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          )}
        </div>
      )}

      {/* ── FUNDS TAB ── */}
      {tab === 'funds' && (
        <Card title="Fund Receipts" sub="All money received by SK — recorded by Chairperson" pad={0}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead>
              <tr style={{ background:'#FAFBFC', borderBottom:`2px solid ${C.border}` }}>
                {['Date','Source','Amount','Reference','Recorded By','Status'].map(x=>(
                  <th key={x} style={{ padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase' }}>{x}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {funds.length === 0
                ? <tr><td colSpan={6} style={{ padding:40, textAlign:'center', color:C.faint }}>No fund records yet</td></tr>
                : funds.map((f,i) => (
                  <tr key={f._id} style={{ borderBottom:`1px solid ${C.border}`, background:i%2?  '#FAFBFC':C.white, opacity:f.isVoided?0.5:1 }}>
                    <td style={{ padding:'10px 14px', color:C.muted }}>{new Date(f.dateReceived).toLocaleDateString('en-PH')}</td>
                    <td style={{ padding:'10px 14px', fontWeight:600 }}>{f.source}</td>
                    <td style={{ padding:'10px 14px', fontWeight:700, color:C.green }}>{peso(f.amount)}</td>
                    <td style={{ padding:'10px 14px', color:C.muted }}>{f.referenceNumber || '—'}</td>
                    <td style={{ padding:'10px 14px', color:C.muted }}>{f.recordedBy?.firstName} {f.recordedBy?.lastName}</td>
                    <td style={{ padding:'10px 14px' }}>
                      {f.isVoided
                        ? <span style={{ fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:999, background:C.bg, color:C.muted }}>Voided</span>
                        : <span style={{ fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:999, background:C.greenL, color:C.green }}>Valid</span>
                      }
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </Card>
      )}

      {/* ── EXPENSES TAB ── */}
      {tab === 'expenses' && (
        <Card title="Expense Records" sub="All money spent — Treasurer records, Chairperson approves" pad={0}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead>
              <tr style={{ background:'#FAFBFC', borderBottom:`2px solid ${C.border}` }}>
                {['Date','Description','Category','Amount','Receipt #','Recorded By','Status'].map(x=>(
                  <th key={x} style={{ padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase' }}>{x}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0
                ? <tr><td colSpan={7} style={{ padding:40, textAlign:'center', color:C.faint }}>No expense records yet</td></tr>
                : expenses.map((e,i) => {
                  const st = STATUS[e.status] || STATUS.pending
                  return (
                    <tr key={e._id} style={{ borderBottom:`1px solid ${C.border}`, background:i%2?'#FAFBFC':C.white }}>
                      <td style={{ padding:'10px 14px', color:C.muted }}>{new Date(e.dateSpent).toLocaleDateString('en-PH')}</td>
                      <td style={{ padding:'10px 14px', fontWeight:600 }}>{e.title}</td>
                      <td style={{ padding:'10px 14px', color:C.muted, textTransform:'capitalize' }}>{e.category}</td>
                      <td style={{ padding:'10px 14px', fontWeight:700, color:C.red }}>{peso(e.amount)}</td>
                      <td style={{ padding:'10px 14px', color:C.muted }}>{e.receiptNumber || '—'}</td>
                      <td style={{ padding:'10px 14px', color:C.muted }}>{e.recordedBy?.firstName} {e.recordedBy?.lastName}</td>
                      <td style={{ padding:'10px 14px' }}>
                        <span style={{ fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:999, background:st.bg, color:st.color }}>{st.label}</span>
                      </td>
                    </tr>
                  )
                })
              }
            </tbody>
          </table>
        </Card>
      )}

      {/* ── LEDGER TAB ── */}
      {tab === 'ledger' && (
        <Card title="Transaction Ledger" sub="Complete chronological record with running balance" pad={0}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead>
              <tr style={{ background:'#FAFBFC', borderBottom:`2px solid ${C.border}` }}>
                {['Date','Type','Description','Debit','Credit','Balance'].map(x=>(
                  <th key={x} style={{ padding:'10px 14px', textAlign: x==='Debit'||x==='Credit'||x==='Balance'?'right':'left', fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase' }}>{x}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ledger.length === 0
                ? <tr><td colSpan={6} style={{ padding:40, textAlign:'center', color:C.faint }}>No transactions yet</td></tr>
                : ledger.map((entry,i) => {
                  const isFund = entry.entryType === 'fund'
                  return (
                    <tr key={i} style={{ borderBottom:`1px solid ${C.border}`, background:i%2?'#FAFBFC':C.white }}>
                      <td style={{ padding:'10px 14px', color:C.muted }}>{new Date(entry.date).toLocaleDateString('en-PH')}</td>
                      <td style={{ padding:'10px 14px' }}>
                        <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:999, background: isFund?C.greenL:C.redL, color: isFund?C.green:C.red }}>
                          {isFund ? 'FUND IN' : 'EXPENSE'}
                        </span>
                      </td>
                      <td style={{ padding:'10px 14px', fontWeight:600 }}>{isFund ? entry.source : entry.title}</td>
                      <td style={{ padding:'10px 14px', textAlign:'right', color:C.red, fontWeight:600 }}>{isFund ? '' : peso(entry.amount)}</td>
                      <td style={{ padding:'10px 14px', textAlign:'right', color:C.green, fontWeight:600 }}>{isFund ? peso(entry.amount) : ''}</td>
                      <td style={{ padding:'10px 14px', textAlign:'right', fontWeight:800, color:C.navy }}>{peso(entry.runningBalance)}</td>
                    </tr>
                  )
                })
              }
            </tbody>
          </table>
        </Card>
      )}

    </div>
  )
}