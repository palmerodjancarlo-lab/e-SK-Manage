// Admin Users — manage all user accounts, change roles, deactivate
import { useState, useEffect } from 'react'
import { Icon } from '../../components/Icon'
import axios from 'axios'
import toast from 'react-hot-toast'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const ROLE_INFO = {
  admin:         { label:'Admin',         badge:'badge-red' },
  sk_officer:    { label:'SK Officer',    badge:'badge-blue' },
  kabataan_user: { label:'Kabataan User', badge:'badge-green' },
}

export default function AdminUsers() {
  const [users,   setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const fetchUsers = () => {
    setLoading(true)
    axios.get(`${API}/admin/users`)
      .then(r => setUsers(r.data.users))
      .catch(() => toast.error('Failed to load users.'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { fetchUsers() }, []) // eslint-disable-line

  const handleRoleChange = async (id, role) => {
    try {
      await axios.put(`${API}/admin/users/${id}/role`, { role })
      toast.success('Role updated.')
      fetchUsers()
    } catch { toast.error('Failed.') }
  }

  const handleToggle = async (id) => {
    try {
      const { data } = await axios.put(`${API}/admin/users/${id}/toggle`)
      toast.success(data.message)
      fetchUsers()
    } catch { toast.error('Failed.') }
  }

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return
    try {
      await axios.delete(`${API}/admin/users/${id}`)
      toast.success('User deleted.')
      fetchUsers()
    } catch { toast.error('Failed.') }
  }

  const filtered = users.filter(u => {
    const s = `${u.firstName} ${u.lastName} ${u.email} ${u.municipality}`.toLowerCase()
    return s.includes(search.toLowerCase())
      && (roleFilter === 'all' || u.role === roleFilter)
      && (statusFilter === 'all' || (statusFilter === 'active' ? u.isActive : !u.isActive))
  })

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">User Accounts</h1>
          <p className="page-subtitle">{users.length} total users</p>
        </div>
      </div>

      <div style={{ display:'flex', gap:10, marginBottom:18, flexWrap:'wrap' }}>
        <div style={{ position:'relative', flex:1, minWidth:200 }}>
          <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-faint)', display:'flex' }}><Icon name="search" size={14}/></span>
          <input className="form-input" placeholder="Search name, email..." value={search} onChange={e=>setSearch(e.target.value)} style={{ paddingLeft:36 }} />
        </div>
        <select className="form-select" style={{ width:'auto', minWidth:140 }} value={roleFilter} onChange={e=>setRoleFilter(e.target.value)}>
          <option value="all">All Roles</option>
          <option value="admin">Admin</option>
          <option value="sk_officer">SK Officer</option>
          
          <option value="kabataan_user">Kabataan User</option>
        </select>
        <select className="form-select" style={{ width:'auto', minWidth:130 }} value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:60 }}><div className="spinner" style={{ width:36, height:36 }}/></div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr><th>User</th><th>Role</th><th>Location</th><th>Points</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map(u => {
                                return (
                  <tr key={u._id}>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div className="avatar avatar-sm" style={{ background: u.role==='admin'?'var(--red-600)':u.role==='sk_officer'?'var(--blue-800)':'var(--green-600)' }}>
                          {u.firstName?.[0]}{u.lastName?.[0]}
                        </div>
                        <div>
                          <div style={{ fontWeight:600, fontSize:13 }}>{u.firstName} {u.lastName}</div>
                          <div style={{ fontSize:11, color:'var(--text-faint)' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <select value={u.role} onChange={e=>handleRoleChange(u._id,e.target.value)}
                        style={{ fontSize:11, padding:'4px 8px', borderRadius:6, border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--text-base)', cursor:'pointer' }}>
                        <option value="admin">Admin</option>
                        <option value="sk_officer">SK Officer</option>
                        
                        <option value="kabataan_user">Kabataan User</option>
                      </select>
                    </td>
                    <td style={{ fontSize:12, color:'var(--text-muted)' }}>
                      {u.barangay && `${u.barangay}, `}{u.municipality}
                    </td>
                    <td style={{ fontSize:13, fontWeight:600 }}>{u.points || 0}</td>
                    <td>
                      <span className={`badge ${u.isActive?'badge-green':'badge-gray'}`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display:'flex', gap:6 }}>
                        <button className={`btn btn-sm ${u.isActive?'btn-ghost':'btn-success'}`} onClick={()=>handleToggle(u._id)}>
                          {u.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={()=>handleDelete(u._id, `${u.firstName} ${u.lastName}`)}>
                          <Icon name="trash" size={13}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}