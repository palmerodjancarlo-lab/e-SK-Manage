// Admin Create Account — for creating SK Officers and Members
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import axios from 'axios'
import toast from 'react-hot-toast'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const MUNIS = ['Boac','Buenavista','Gasan','Mogpog','Santa Cruz','Torrijos']
// Standard SK positions: 1 Chairperson, 1 Secretary, 1 Treasurer, 7 Kagawad
const POSITIONS = ['SK Chairperson','SK Secretary','SK Treasurer','SK Kagawad']

export default function AdminCreateAccount() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [created, setCreated] = useState(null)
  const [form, setForm] = useState({
    firstName:'', lastName:'', email:'', password:'',
    role:'sk_officer', municipality:'Boac', barangay:'', position:'',
  })
  const set = (k,v) => setForm(p=>({...p,[k]:v}))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await axios.post(`${API}/admin/create-user`, form)
      toast.success(data.message)
      setCreated({ ...data, password: form.password || data.defaultPassword })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create account.')
    } finally { setLoading(false) }
  }

  if (created) return (
    <div style={{ maxWidth:520, margin:'0 auto' }}>
      <div className="card" style={{ textAlign:'center', padding:'36px 28px' }}>
        <div style={{ width:60, height:60, borderRadius:'50%', background:'var(--green-100)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
          <Icon name="check" size={28} color="var(--green-600)" />
        </div>
        <h2 style={{ fontSize:20, fontWeight:800, marginBottom:8 }}>Account Created!</h2>
        <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:24 }}>Share these credentials with the new user.</p>
        <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:24, textAlign:'left' }}>
          {[
            { label:'Name',     value:`${created.user?.firstName} ${created.user?.lastName}` },
            { label:'Email',    value:created.user?.email },
            { label:'Password', value:created.password },
            { label:'Role',     value:created.user?.role?.replace('_',' ').toUpperCase() },
            { label:'Position', value:created.user?.position || '—' },
          ].map(item => (
            <div key={item.label} style={{ padding:'10px 14px', background:'var(--bg-subtle)', borderRadius:9, border:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:12, color:'var(--text-faint)', fontWeight:700 }}>{item.label}</span>
              <span style={{ fontSize:13, fontWeight:600 }}>{item.value}</span>
            </div>
          ))}
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button className="btn btn-ghost btn-full" onClick={() => { setCreated(null); setForm({ firstName:'', lastName:'', email:'', password:'', role:'sk_officer', municipality:'Boac', barangay:'', position:'' }) }}>
            Create Another
          </button>
          <button className="btn btn-primary btn-full" onClick={() => navigate('/admin/users')}>
            View Users
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ maxWidth:560, margin:'0 auto' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Create Account</h1>
          <p className="page-subtitle">Add a new SK Officer or Member</p>
        </div>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">First Name</label>
              <input className="form-input" required value={form.firstName} onChange={e=>set('firstName',e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name</label>
              <input className="form-input" required value={form.lastName} onChange={e=>set('lastName',e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input type="email" className="form-input" required value={form.email} onChange={e=>set('email',e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input type="password" className="form-input" placeholder="Leave blank to use default: SKManage2026" value={form.password} onChange={e=>set('password',e.target.value)} />
            <p className="form-hint">Default password if blank: SKManage2026</p>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Role</label>
              <select className="form-select" value={form.role} onChange={e=>set('role',e.target.value)}>
                <option value="sk_officer">SK Officer</option>
                              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Position</label>
              <select className="form-select" value={form.position} onChange={e=>set('position',e.target.value)}>
                <option value="">Select position...</option>
                {POSITIONS.map(p=><option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Municipality</label>
              <select className="form-select" value={form.municipality} onChange={e=>set('municipality',e.target.value)}>
                {MUNIS.map(m=><option key={m}>{m}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Barangay</label>
              <input className="form-input" value={form.barangay} onChange={e=>set('barangay',e.target.value)} />
            </div>
          </div>
          <div style={{ display:'flex', gap:10, marginTop:8 }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={()=>navigate('/admin/users')}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Icon name="plus" size={14} /> {loading ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}