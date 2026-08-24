// sk/Finance.jsx — Budget & Finance for SK
// Chairperson + Treasurer manage (record funds/expenses).
// Chairperson approves expenses. Everyone else views only.
// Receipt upload + OCR scan supported. Full audit trail.

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, CartesianGrid,
} from 'recharts'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'

const T = {
  bg:'#F7F8FA', card:'#FFFFFF', ink:'#111827', slate:'#6B7280', faint:'#9CA3AF',
  line:'#EEF0F3', indigo:'#4F46E5', indigoSoft:'#EEF0FF',
  emerald:'#059669', emeraldSoft:'#ECFDF5', amber:'#D97706', amberSoft:'#FFFBEB',
  rose:'#E11D48', roseSoft:'#FFF1F3', sky:'#0284C7', skySoft:'#F0F9FF',
}
const peso = n => `₱${Number(n||0).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2})}`

const STATUS = {
  pending:  { label:'Pending',  color:T.amber,   bg:T.amberSoft },
  approved: { label:'Approved', color:T.emerald, bg:T.emeraldSoft },
  rejected: { label:'Rejected', color:T.rose,    bg:T.roseSoft },
  voided:   { label:'Voided',   color:T.slate,   bg:T.bg },
}

function Tip({ active, payload, label, money }) {
  if(!active||!payload?.length) return null
  return (
    <div style={{ background:T.ink, borderRadius:8, padding:'8px 12px', fontSize:11.5 }}>
      {label && <div style={{ color:'#fff', fontWeight:700, marginBottom:3 }}>{label}</div>}
      {payload.map((p,i)=><div key={i} style={{ color:'#A5B4FC', fontWeight:600 }}>{money?peso(p.value):p.value}</div>)}
    </div>
  )
}

function Card({ title, sub, action, flush, children }) {
  return (
    <div style={{ background:T.card, border:`1px solid ${T.line}`, borderRadius:16, overflow:'hidden' }}>
      {title && (
        <div style={{ padding:'16px 20px', borderBottom:`1px solid ${T.line}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontSize:14, fontWeight:700 }}>{title}</div>
            {sub && <div style={{ fontSize:11.5, color:T.faint, marginTop:2 }}>{sub}</div>}
          </div>
          {action}
        </div>
      )}
      <div style={{ padding: flush?0:20 }}>{children}</div>
    </div>
  )
}

const field = { width:'100%', padding:'10px 12px', border:`1px solid ${T.line}`, borderRadius:8, fontSize:13, outline:'none', boxSizing:'border-box', fontFamily:'inherit' }
const lbl   = { fontSize:11, fontWeight:700, color:T.slate, textTransform:'uppercase', letterSpacing:'0.4px', display:'block', marginBottom:6 }

export default function SKFinance() {
  const { user } = useAuth()
  const role = user?.role
  const canRecordFunds    = role === 'sk_chairperson'                          // chairperson records funds
  const canRecordExpenses = role === 'sk_chairperson' || role === 'sk_treasurer' // both record expenses
  const canApprove        = role === 'sk_chairperson'                          // chairperson approves
  const canManage         = canRecordFunds || canRecordExpenses

  const [tab,setTab]=useState('overview')
  const [summary,setSummary]=useState({ totalFunds:0,totalExpenses:0,balance:0,pendingExpenses:{count:0,total:0},fundsBySource:[],expensesByCategory:[] })
  const [funds,setFunds]=useState([]); const [expenses,setExpenses]=useState([]); const [ledger,setLedger]=useState([])
  const [loading,setLoading]=useState(true)
  const [showFund,setShowFund]=useState(false)
  const [showExpense,setShowExpense]=useState(false)
  const [msg,setMsg]=useState('')

  const loadAll = () => {
    Promise.all([
      axios.get(`${API}/finance/summary`),
      axios.get(`${API}/finance/funds`),
      axios.get(`${API}/finance/expenses`),
      axios.get(`${API}/finance/ledger`),
    ]).then(([s,f,e,l])=>{
      setSummary(s.data); setFunds(f.data.funds); setExpenses(e.data.expenses); setLedger(l.data.ledger)
    }).catch(console.error).finally(()=>setLoading(false))
  }
  useEffect(()=>{ loadAll() },[])

  const flash = (m) => { setMsg(m); setTimeout(()=>setMsg(''),3500) }

  const approve = async (id) => { await axios.put(`${API}/finance/expenses/${id}/approve`,{}); flash('Expense approved.'); loadAll() }
  const reject  = async (id) => { const r=prompt('Reason for rejection:'); if(!r)return; await axios.put(`${API}/finance/expenses/${id}/reject`,{reason:r}); flash('Expense rejected.'); loadAll() }
  const voidExp = async (id) => { const r=prompt('Reason for voiding this expense:'); if(!r)return; await axios.put(`${API}/finance/expenses/${id}/void`,{reason:r}); flash('Expense voided.'); loadAll() }
  const voidFund= async (id) => { const r=prompt('Reason for voiding this fund record:'); if(!r)return; await axios.put(`${API}/finance/funds/${id}/void`,{reason:r}); flash('Fund voided.'); loadAll() }

  const balSeries = ledger.map((e,i)=>({ n:i+1, balance:e.runningBalance, date:new Date(e.date).toLocaleDateString('en-PH',{month:'short',day:'numeric'}) }))
  const sourceData=(summary.fundsBySource||[]).map(s=>({ name:(s._id||'other').replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase()), value:s.total }))
  const catData=(summary.expensesByCategory||[]).map(e=>({ name:(e._id||'other').replace(/\b\w/g,c=>c.toUpperCase()), value:e.total }))
  const SRC_COLORS=[T.emerald,T.amber,T.indigo,T.sky,'#7C3AED']

  if(loading) return <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:400}}><div style={{width:32,height:32,border:`2.5px solid ${T.line}`,borderTopColor:T.indigo,borderRadius:'50%',animation:'sp .7s linear infinite'}}/><style>{`@keyframes sp{to{transform:rotate(360deg)}}`}</style></div>

  return (
    <div style={{fontFamily:"'Inter','Segoe UI',system-ui,sans-serif",color:T.ink}}>

      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12,marginBottom:20}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:800,margin:0,letterSpacing:'-0.5px'}}>Budget & Finance</h1>
          <p style={{fontSize:12.5,color:T.slate,margin:'4px 0 0'}}>
            {canManage ? 'Record and manage every peso in and out.' : 'Full transparency of SK funds — view only for your role.'}
          </p>
        </div>
        {canManage && (
          <div style={{display:'flex',gap:8}}>
            {canRecordFunds && <button onClick={()=>setShowFund(true)} style={{padding:'9px 16px',background:T.emerald,color:'#fff',border:'none',borderRadius:10,fontSize:12.5,fontWeight:600,cursor:'pointer'}}>+ Record Fund</button>}
            {canRecordExpenses && <button onClick={()=>setShowExpense(true)} style={{padding:'9px 16px',background:T.rose,color:'#fff',border:'none',borderRadius:10,fontSize:12.5,fontWeight:600,cursor:'pointer'}}>+ Record Expense</button>}
          </div>
        )}
      </div>

      {msg && <div style={{background:T.emeraldSoft,border:'1px solid #A7F3D0',color:T.emerald,padding:'10px 16px',borderRadius:10,marginBottom:16,fontSize:13,fontWeight:600}}>✓ {msg}</div>}

      {/* Role notice for view-only */}
      {!canManage && (
        <div style={{background:T.skySoft,border:'1px solid #BAE6FD',color:T.sky,padding:'10px 16px',borderRadius:10,marginBottom:16,fontSize:12.5}}>
          ℹ️ As {role==='sk_secretary'?'SK Secretary':'SK Kagawad'}, you can view all financial records for transparency. Only the Chairperson and Treasurer can record transactions.
        </div>
      )}

      {/* Summary cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:20}}>
        {[
          {label:'Funds Received',value:peso(summary.totalFunds),color:T.emerald},
          {label:'Total Disbursed',value:peso(summary.totalExpenses),color:T.rose},
          {label:'Balance on Hand',value:peso(summary.balance),color:T.indigo,sub:summary.balance<0?'⚠ Deficit':'Available'},
          {label:'Pending Approval',value:summary.pendingExpenses?.count||0,color:T.amber,sub:peso(summary.pendingExpenses?.total)},
        ].map((s,i)=>(
          <div key={i} style={{background:T.card,border:`1px solid ${T.line}`,borderRadius:14,padding:'16px 18px',borderTop:`3px solid ${s.color}`}}>
            <div style={{fontSize:11,fontWeight:600,color:T.slate,textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:8}}>{s.label}</div>
            <div style={{fontSize:20,fontWeight:800,letterSpacing:'-0.5px'}}>{s.value}</div>
            {s.sub && <div style={{fontSize:11,color:T.faint,marginTop:4}}>{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:4,marginBottom:16,borderBottom:`1px solid ${T.line}`}}>
        {['overview','pending','funds','expenses','ledger'].map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{padding:'10px 16px',border:'none',background:'none',cursor:'pointer',fontSize:13,fontWeight:700,textTransform:'capitalize',color:tab===t?T.indigo:T.slate,borderBottom:tab===t?`2px solid ${T.indigo}`:'2px solid transparent',marginBottom:-1}}>
            {t}{t==='pending'&&summary.pendingExpenses?.count>0&&<span style={{marginLeft:6,fontSize:10,background:T.amber,color:'#fff',borderRadius:999,padding:'1px 7px'}}>{summary.pendingExpenses.count}</span>}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {tab==='overview' && (
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          {balSeries.length>1 && (
            <Card title="Balance on Hand — Over Time" sub="Running balance after each transaction">
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={balSeries} margin={{top:8,right:12,left:-6}}>
                  <defs><linearGradient id="bf" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.indigo} stopOpacity={0.2}/><stop offset="100%" stopColor={T.indigo} stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.line} vertical={false}/>
                  <XAxis dataKey="date" tick={{fontSize:11,fill:T.faint}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fontSize:11,fill:T.faint}} axisLine={false} tickLine={false} tickFormatter={v=>`₱${(v/1000).toFixed(0)}k`}/>
                  <Tooltip content={<Tip money/>}/>
                  <Area type="monotone" dataKey="balance" stroke={T.indigo} strokeWidth={2.5} fill="url(#bf)"/>
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          )}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            <Card title="Funds by Source">
              {sourceData.length===0?<p style={{textAlign:'center',color:T.faint,padding:'40px 0',fontSize:12}}>No funds yet</p>:
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart><Pie data={sourceData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="value" label={({value})=>`₱${(value/1000).toFixed(0)}k`}>{sourceData.map((e,i)=><Cell key={i} fill={SRC_COLORS[i%SRC_COLORS.length]}/>)}</Pie><Tooltip content={<Tip money/>}/></PieChart>
                </ResponsiveContainer>}
            </Card>
            <Card title="Expenses by Category">
              {catData.length===0?<p style={{textAlign:'center',color:T.faint,padding:'40px 0',fontSize:12}}>No expenses yet</p>:
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={catData} layout="vertical" margin={{left:8,right:10}} barSize={16}><XAxis type="number" tick={{fontSize:10,fill:T.faint}} axisLine={false} tickLine={false} tickFormatter={v=>`₱${(v/1000).toFixed(0)}k`}/><YAxis type="category" dataKey="name" tick={{fontSize:11,fill:T.slate}} axisLine={false} tickLine={false} width={84}/><Tooltip content={<Tip money/>} cursor={{fill:T.bg}}/><Bar dataKey="value" fill={T.rose} radius={[0,5,5,0]}/></BarChart>
                </ResponsiveContainer>}
            </Card>
          </div>
        </div>
      )}

      {/* PENDING */}
      {tab==='pending' && (
        <Card title="Expenses Awaiting Approval" sub={canApprove?'Review and approve or reject':'Only the Chairperson can approve'} flush>
          {expenses.filter(e=>e.status==='pending').length===0
            ? <p style={{textAlign:'center',color:T.faint,padding:'40px 0',fontSize:13}}>No pending expenses 🎉</p>
            : expenses.filter(e=>e.status==='pending').map((e,i,arr)=>(
              <div key={e._id} style={{padding:'16px 20px',borderBottom:i<arr.length-1?`1px solid ${T.line}`:'none',display:'flex',justifyContent:'space-between',alignItems:'center',gap:16}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',alignItems:'center',gap:8}}><span style={{fontSize:14,fontWeight:700}}>{e.title}</span><span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:999,background:T.amberSoft,color:T.amber}}>PENDING</span></div>
                  <div style={{fontSize:11.5,color:T.slate,marginTop:4}}>{e.category} · Receipt #{e.receiptNumber||'N/A'} · {e.vendor||'—'} · Recorded by {e.recordedBy?.firstName} {e.recordedBy?.lastName}</div>
                  {e.receiptPhoto && <a href={e.receiptPhoto} target="_blank" rel="noreferrer" style={{fontSize:11,color:T.indigo,fontWeight:600,textDecoration:'none'}}>📎 View receipt</a>}
                </div>
                <div style={{fontSize:17,fontWeight:800,color:T.rose,minWidth:110,textAlign:'right'}}>{peso(e.amount)}</div>
                {canApprove && (
                  <div style={{display:'flex',gap:6}}>
                    <button onClick={()=>approve(e._id)} style={{padding:'7px 14px',background:T.emerald,color:'#fff',border:'none',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer'}}>Approve</button>
                    <button onClick={()=>reject(e._id)} style={{padding:'7px 14px',background:T.card,color:T.rose,border:`1px solid ${T.rose}`,borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer'}}>Reject</button>
                  </div>
                )}
              </div>
            ))}
        </Card>
      )}

      {/* FUNDS */}
      {tab==='funds' && (
        <Card title="Fund Receipts" sub="Money received by SK" flush>
          <FinanceTable
            head={['Date','Source','Amount','Reference','Recorded By','Receipt', canRecordFunds?'Action':null].filter(Boolean)}
            rows={funds} empty="No fund records yet"
            render={(f)=>(
              <>
                <td style={td}>{new Date(f.dateReceived).toLocaleDateString('en-PH')}</td>
                <td style={{...td,fontWeight:600}}>{f.source}</td>
                <td style={{...td,fontWeight:700,color:T.emerald}}>{peso(f.amount)}</td>
                <td style={td}>{f.referenceNumber||'—'}</td>
                <td style={td}>{f.recordedBy?.firstName} {f.recordedBy?.lastName}</td>
                <td style={td}>{f.receiptPhoto?<a href={f.receiptPhoto} target="_blank" rel="noreferrer" style={{color:T.indigo,fontWeight:600,textDecoration:'none'}}>📎 View</a>:'—'}</td>
                {canRecordFunds && <td style={td}>{!f.isVoided && <button onClick={()=>voidFund(f._id)} style={voidBtn}>Void</button>}{f.isVoided && <span style={{fontSize:10,color:T.faint}}>Voided</span>}</td>}
              </>
            )}
          />
        </Card>
      )}

      {/* EXPENSES */}
      {tab==='expenses' && (
        <Card title="Expense Records" sub="Money spent by SK" flush>
          <FinanceTable
            head={['Date','Description','Category','Amount','Receipt','Status', canApprove?'Action':null].filter(Boolean)}
            rows={expenses} empty="No expense records yet"
            render={(e)=>{
              const st=STATUS[e.status]||STATUS.pending
              return (
                <>
                  <td style={td}>{new Date(e.dateSpent).toLocaleDateString('en-PH')}</td>
                  <td style={{...td,fontWeight:600}}>{e.title}</td>
                  <td style={{...td,textTransform:'capitalize'}}>{e.category}</td>
                  <td style={{...td,fontWeight:700,color:T.rose}}>{peso(e.amount)}</td>
                  <td style={td}>{e.receiptPhoto?<a href={e.receiptPhoto} target="_blank" rel="noreferrer" style={{color:T.indigo,fontWeight:600,textDecoration:'none'}}>📎 View</a>:'—'}</td>
                  <td style={td}><span style={{fontSize:10,fontWeight:700,padding:'3px 10px',borderRadius:999,background:st.bg,color:st.color}}>{st.label}</span></td>
                  {canApprove && <td style={td}>{e.status!=='voided' && <button onClick={()=>voidExp(e._id)} style={voidBtn}>Void</button>}</td>}
                </>
              )
            }}
          />
        </Card>
      )}

      {/* LEDGER */}
      {tab==='ledger' && (
        <Card title="Transaction Ledger" sub="Complete chronological record with running balance" flush>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead><tr style={{background:T.bg,borderBottom:`2px solid ${T.line}`}}>
              {['Date','Type','Description','In','Out','Balance'].map(h=><th key={h} style={{...th,textAlign:['In','Out','Balance'].includes(h)?'right':'left'}}>{h}</th>)}
            </tr></thead>
            <tbody>
              {ledger.length===0?<tr><td colSpan={6} style={{padding:40,textAlign:'center',color:T.faint}}>No transactions yet</td></tr>:
                ledger.map((e,i)=>{const isFund=e.entryType==='fund';return(
                  <tr key={i} style={{borderBottom:`1px solid ${T.line}`,background:i%2?T.bg:T.card}}>
                    <td style={td}>{new Date(e.date).toLocaleDateString('en-PH')}</td>
                    <td style={td}><span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:999,background:isFund?T.emeraldSoft:T.roseSoft,color:isFund?T.emerald:T.rose}}>{isFund?'FUND IN':'EXPENSE'}</span></td>
                    <td style={{...td,fontWeight:600}}>{isFund?e.source:e.title}</td>
                    <td style={{...td,textAlign:'right',color:T.emerald,fontWeight:600}}>{isFund?peso(e.amount):''}</td>
                    <td style={{...td,textAlign:'right',color:T.rose,fontWeight:600}}>{!isFund?peso(e.amount):''}</td>
                    <td style={{...td,textAlign:'right',fontWeight:800,color:T.indigo}}>{peso(e.runningBalance)}</td>
                  </tr>
                )})}
            </tbody>
          </table>
        </Card>
      )}

      {showFund && <FundModal onClose={()=>setShowFund(false)} onSaved={()=>{setShowFund(false);loadAll();flash('Fund recorded.')}} />}
      {showExpense && <ExpenseModal onClose={()=>setShowExpense(false)} onSaved={()=>{setShowExpense(false);loadAll();flash('Expense recorded — pending approval.')}} balance={summary.balance} />}
    </div>
  )
}

const th = { padding:'11px 16px', fontSize:11, fontWeight:700, color:T.slate, textTransform:'uppercase', letterSpacing:'0.4px', textAlign:'left' }
const td = { padding:'11px 16px', color:T.slate }
const voidBtn = { padding:'4px 10px', fontSize:10, fontWeight:700, border:'none', borderRadius:6, cursor:'pointer', background:T.roseSoft, color:T.rose }

function FinanceTable({ head, rows, empty, render }) {
  return (
    <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
      <thead><tr style={{background:T.bg,borderBottom:`2px solid ${T.line}`}}>{head.map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
      <tbody>
        {rows.length===0?<tr><td colSpan={head.length} style={{padding:40,textAlign:'center',color:T.faint}}>{empty}</td></tr>:
          rows.map((r,i)=><tr key={r._id} style={{borderBottom:`1px solid ${T.line}`,background:i%2?T.bg:T.card,opacity:r.isVoided?0.5:1}}>{render(r)}</tr>)}
      </tbody>
    </table>
  )
}

// ── Receipt uploader with scan ──
function ReceiptUploader({ onResult }) {
  const [uploading,setUploading]=useState(false)
  const [scanning,setScanning]=useState(false)
  const [preview,setPreview]=useState('')
  const fileRef=useRef()

  const handle = async (file, scan) => {
    if(!file) return
    setPreview(URL.createObjectURL(file))
    const fd=new FormData(); fd.append('file',file)
    const setL = scan?setScanning:setUploading; setL(true)
    try {
      const url = scan?`${API}/upload/scan-receipt`:`${API}/upload/receipt`
      const { data } = await axios.post(url, fd, { headers:{'Content-Type':'multipart/form-data'} })
      onResult(data)  // { url, ocr? }
    } catch(e){ alert('Upload failed: '+(e.response?.data?.message||e.message)) }
    finally { setL(false) }
  }

  return (
    <div>
      <label style={lbl}>Receipt / Document</label>
      <div style={{display:'flex',gap:8,marginBottom:8}}>
        <input ref={fileRef} type="file" accept="image/*,.pdf" style={{display:'none'}} onChange={e=>handle(e.target.files[0],false)} />
        <button type="button" onClick={()=>fileRef.current.click()} disabled={uploading} style={{flex:1,padding:'10px',border:`1px dashed ${T.line}`,borderRadius:8,background:T.bg,cursor:'pointer',fontSize:12,fontWeight:600,color:T.slate}}>
          {uploading?'Uploading…':'📎 Upload Receipt'}
        </button>
        <label style={{flex:1,padding:'10px',border:`1px dashed ${T.indigo}`,borderRadius:8,background:T.indigoSoft,cursor:'pointer',fontSize:12,fontWeight:600,color:T.indigo,textAlign:'center'}}>
          {scanning?'Scanning…':'📷 Scan & Auto-fill'}
          <input type="file" accept="image/*" capture="environment" style={{display:'none'}} onChange={e=>handle(e.target.files[0],true)} />
        </label>
      </div>
      {preview && <img src={preview} alt="receipt" style={{width:'100%',maxHeight:140,objectFit:'contain',borderRadius:8,border:`1px solid ${T.line}`,marginBottom:4}} />}
      <p style={{fontSize:10.5,color:T.faint,margin:0}}>Upload for proof, or Scan to auto-read the amount (you can still edit it).</p>
    </div>
  )
}

function Modal({ title, children, onClose }) {
  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(17,24,39,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,padding:20}}>
      <div onClick={e=>e.stopPropagation()} style={{background:'#fff',borderRadius:16,width:'100%',maxWidth:520,maxHeight:'90vh',overflowY:'auto'}}>
        <div style={{padding:'18px 22px',borderBottom:`1px solid ${T.line}`,display:'flex',justifyContent:'space-between',alignItems:'center',position:'sticky',top:0,background:'#fff'}}>
          <h3 style={{fontSize:16,fontWeight:700,margin:0}}>{title}</h3>
          <button onClick={onClose} style={{background:'none',border:'none',fontSize:22,color:T.slate,cursor:'pointer'}}>×</button>
        </div>
        <div style={{padding:22}}>{children}</div>
      </div>
    </div>
  )
}

function FundModal({ onClose, onSaved }) {
  const [f,setF]=useState({ source:'', sourceType:'barangay_allocation', amount:'', referenceNumber:'', dateReceived:new Date().toISOString().slice(0,10), purpose:'', receiptPhoto:'' })
  const [saving,setSaving]=useState(false)
  const save=async()=>{ setSaving(true); try{ await axios.post(`${API}/finance/funds`,{...f,amount:Number(f.amount)}); onSaved() }catch(e){alert(e.response?.data?.message||'Error')}finally{setSaving(false)} }
  return (
    <Modal title="Record Fund Received" onClose={onClose}>
      <div style={{display:'flex',flexDirection:'column',gap:14}}>
        <ReceiptUploader onResult={(d)=>setF(x=>({...x,receiptPhoto:d.url,...(d.ocr?.amount?{amount:String(d.ocr.amount)}:{})}))} />
        <div><label style={lbl}>Source</label><input style={field} value={f.source} onChange={e=>setF({...f,source:e.target.value})} placeholder="e.g. Barangay Allocation, Donation - SM" /></div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <div><label style={lbl}>Type</label><select style={field} value={f.sourceType} onChange={e=>setF({...f,sourceType:e.target.value})}><option value="barangay_allocation">Barangay Allocation</option><option value="donation">Donation</option><option value="grant">Grant</option><option value="other">Other</option></select></div>
          <div><label style={lbl}>Amount (₱)</label><input type="number" style={field} value={f.amount} onChange={e=>setF({...f,amount:e.target.value})} placeholder="0.00" /></div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <div><label style={lbl}>Reference No.</label><input style={field} value={f.referenceNumber} onChange={e=>setF({...f,referenceNumber:e.target.value})} placeholder="Check/OR number" /></div>
          <div><label style={lbl}>Date Received</label><input type="date" style={field} value={f.dateReceived} onChange={e=>setF({...f,dateReceived:e.target.value})} /></div>
        </div>
        <div><label style={lbl}>Purpose / Notes</label><input style={field} value={f.purpose} onChange={e=>setF({...f,purpose:e.target.value})} placeholder="Optional" /></div>
        <button onClick={save} disabled={saving||!f.source||!f.amount} style={{padding:'11px',background:T.emerald,color:'#fff',border:'none',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',opacity:saving||!f.source||!f.amount?0.6:1}}>{saving?'Recording…':'Record Fund'}</button>
      </div>
    </Modal>
  )
}

function ExpenseModal({ onClose, onSaved, balance }) {
  const [f,setF]=useState({ title:'', category:'supplies', amount:'', receiptNumber:'', vendor:'', dateSpent:new Date().toISOString().slice(0,10), receiptPhoto:'', description:'' })
  const [saving,setSaving]=useState(false)
  const save=async()=>{
    if(Number(f.amount)>balance && !confirm(`This expense (${peso(Number(f.amount))}) exceeds the balance (${peso(balance)}). Continue anyway?`)) return
    setSaving(true); try{ await axios.post(`${API}/finance/expenses`,{...f,amount:Number(f.amount)}); onSaved() }catch(e){alert(e.response?.data?.message||'Error')}finally{setSaving(false)}
  }
  return (
    <Modal title="Record Expense" onClose={onClose}>
      <div style={{display:'flex',flexDirection:'column',gap:14}}>
        <ReceiptUploader onResult={(d)=>setF(x=>({...x,receiptPhoto:d.url,...(d.ocr?.amount?{amount:String(d.ocr.amount)}:{})}))} />
        <div><label style={lbl}>What was it for?</label><input style={field} value={f.title} onChange={e=>setF({...f,title:e.target.value})} placeholder="e.g. Snacks for General Assembly" /></div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <div><label style={lbl}>Category</label><select style={field} value={f.category} onChange={e=>setF({...f,category:e.target.value})}>{['supplies','food','transportation','equipment','venue','printing','honorarium','other'].map(c=><option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}</select></div>
          <div><label style={lbl}>Amount (₱)</label><input type="number" style={field} value={f.amount} onChange={e=>setF({...f,amount:e.target.value})} placeholder="0.00" /></div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <div><label style={lbl}>Receipt No.</label><input style={field} value={f.receiptNumber} onChange={e=>setF({...f,receiptNumber:e.target.value})} placeholder="OR number" /></div>
          <div><label style={lbl}>Vendor / Store</label><input style={field} value={f.vendor} onChange={e=>setF({...f,vendor:e.target.value})} placeholder="Store name" /></div>
        </div>
        <div><label style={lbl}>Date Spent</label><input type="date" style={field} value={f.dateSpent} onChange={e=>setF({...f,dateSpent:e.target.value})} /></div>
        <p style={{fontSize:11,color:T.slate,margin:0,background:T.amberSoft,padding:'8px 12px',borderRadius:8}}>💡 This expense will be marked <strong>pending</strong> until the Chairperson approves it.</p>
        <button onClick={save} disabled={saving||!f.title||!f.amount} style={{padding:'11px',background:T.rose,color:'#fff',border:'none',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',opacity:saving||!f.title||!f.amount?0.6:1}}>{saving?'Recording…':'Record Expense'}</button>
      </div>
    </Modal>
  )
}