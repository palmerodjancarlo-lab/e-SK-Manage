// SK Members page
// Listahan ng lahat ng miyembro ng e-SK Manage system

import { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Icon } from '../../components/Icon'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const MUNIS = ['All','Boac','Buenavista','Gasan','Mogpog','Santa Cruz','Torrijos']

const ROLE_INFO = {
  admin:         { label: 'Admin',         badge: 'badge-red' },
  sk_officer:    { label: 'SK Officer',    badge: 'badge-blue' },
  kabataan_user: { label: 'Kabataan User', badge: 'badge-green' },
}

export default function SKMembers() {
  const [members,  setMembers]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [muni,     setMuni]     = useState('All')
  const [roleFilter, setRoleFilter] = useState('all')
  const [view,     setView]     = useState('table') // table | grid
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    axios.get(`${API}/admin/users`)
      .then(r => setMembers(r.data.users.filter(u => u.role !== 'admin')))
      .catch(() => toast.error('Hindi ma-load ang mga miyembro.'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = members.filter(m => {
    const s = `${m.firstName} ${m.lastName} ${m.email||''} ${m.barangay||''} ${m.position||''}`.toLowerCase()
    return s.includes(search.toLowerCase())
      && (muni === 'All' || m.municipality === muni)
      && (roleFilter === 'all' || m.role === roleFilter)
  })

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Member Directory</h1>
          <p className="page-subtitle">{members.length} miyembro sa sistema</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className={`btn btn-sm ${view==='table'?'btn-primary':'btn-ghost'}`} onClick={() => setView('table')}>
            <Icon name="listBullet" size={14} />
          </button>
          <button className={`btn btn-sm ${view==='grid'?'btn-primary':'btn-ghost'}`} onClick={() => setView('grid')}>
            <Icon name="users" size={14} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <div className="search-wrap" style={{ flex: 1, minWidth: 180 }}>
          <span className="search-icon-el"><Icon name="search" size={14} /></span>
          <input className="form-input" placeholder="Search name, email, barangay..."
            value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 36 }} />
        </div>
        <select className="form-select" style={{ width: 'auto', minWidth: 150 }}
          value={muni} onChange={e => setMuni(e.target.value)}>
          {MUNIS.map(m => <option key={m} value={m}>{m === 'All' ? 'All Municipalities' : m}</option>)}
        </select>
        <select className="form-select" style={{ width: 'auto', minWidth: 140 }}
          value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="all">All Roles</option>
          <option value="admin">Admin</option>
          <option value="sk_officer">SK Officer</option>
          
          <option value="kabataan_user">Kabataan User</option>
        </select>
      </div>

      {/* Stats row */}
      <div className="grid-4" style={{ marginBottom: 18 }}>
        {[
          { label: 'Total',         value: members.length,                                        color: 'var(--blue-800)' },
          { label: 'SK Officials',  value: members.filter(m=>m.role==='sk_officer').length, color: 'var(--red-600)' },
          { label: 'Kabataan',      value: members.filter(m=>m.role==='kabataan_user').length,    color: 'var(--green-600)' },
          { label: 'Active',        value: members.filter(m=>m.isActive).length,                  color: 'var(--gold-500)' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 4, height: 36, background: s.color, borderRadius: 4 }} />
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-base)', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon"><Icon name="users" size={40} /></div>
            <div className="empty-title">No results found</div>
            <div className="empty-desc">Subukan ang ibang search o filter.</div>
          </div>
        </div>
      ) : view === 'grid' ? (
        <div className="grid-4">
          {filtered.map(m => {
            const ri = ROLE_INFO[m.role] || ROLE_INFO.kabataan_user
            return (
              <div key={m._id} className="card card-hover" style={{ padding: 18, textAlign: 'center' }} onClick={() => setSelected(m)}>
                <div className="avatar avatar-lg" style={{
                  margin: '0 auto 12px',
                  background: m.role==='admin'?'var(--red-600)':m.role==='sk_officer'?'var(--blue-800)':'var(--green-600)',
                }}>
                  {m.firstName?.[0]}{m.lastName?.[0]}
                </div>
                <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 3 }}>{m.firstName} {m.lastName}</p>
                {m.position && <p style={{ fontSize: 11, color: 'var(--blue-800)', fontWeight: 600, marginBottom: 5 }}>{m.position}</p>}
                <span className={`badge ${ri.badge}`} style={{ marginBottom: 8 }}>{ri.label}</span>
                <p style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 4 }}>
                  {m.barangay && `Brgy. ${m.barangay}, `}{m.municipality}
                </p>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead><tr><th>Member</th><th>Role</th><th>Position</th><th>Location</th><th>Points</th><th>Status</th></tr></thead>
            <tbody>
              {filtered.map(m => {
                const ri = ROLE_INFO[m.role] || ROLE_INFO.kabataan_user
                return (
                  <tr key={m._id} style={{ cursor: 'pointer' }} onClick={() => setSelected(m)}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="avatar avatar-sm" style={{ background: m.role==='admin'?'var(--red-600)':m.role==='sk_officer'?'var(--blue-800)':'var(--green-600)' }}>
                          {m.firstName?.[0]}{m.lastName?.[0]}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{m.firstName} {m.lastName}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{m.email}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className={`badge ${ri.badge}`}>{ri.label}</span></td>
                    <td style={{ fontSize: 12 }}>{m.position || '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-faint)' }}>{m.barangay && `${m.barangay}, `}{m.municipality}</td>
                    <td style={{ fontSize: 13, fontWeight: 600 }}>{m.points || 0}</td>
                    <td><span className={`badge ${m.isActive?'badge-green':'badge-rose'}`}>{m.isActive?'Active':'Inactive'}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Member detail modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Member Profile</span>
              <button className="modal-close" onClick={() => setSelected(null)}><Icon name="x" size={14} /></button>
            </div>
            <div className="modal-body">
              <div style={{ textAlign: 'center', marginBottom: 22 }}>
                <div className="avatar avatar-lg" style={{
                  margin: '0 auto 10px',
                  background: selected.role==='sk_officer'?'var(--blue-800)':'var(--green-600)',
                  width: 60, height: 60, fontSize: 22, borderRadius: 16,
                }}>
                  {selected.firstName?.[0]}{selected.lastName?.[0]}
                </div>
                <p style={{ fontSize: 17, fontWeight: 700 }}>{selected.firstName} {selected.lastName}</p>
                {selected.position && <p style={{ fontSize: 13, color: 'var(--blue-800)', fontWeight: 600, marginTop: 3 }}>{selected.position}</p>}
                <span className={`badge ${ROLE_INFO[selected.role]?.badge || 'badge-gray'}`} style={{ marginTop: 8 }}>
                  {ROLE_INFO[selected.role]?.label}
                </span>
              </div>
              <div className="grid-2" style={{ gap: 10 }}>
                {[
                  { label: 'Email',       value: selected.email },
                  { label: 'Municipality',value: selected.municipality },
                  { label: 'Barangay',    value: selected.barangay || '—' },
                  { label: 'Points',      value: selected.points || 0 },
                  { label: 'Status',      value: selected.isActive ? 'Active' : 'Inactive' },
                  { label: 'Joined',      value: new Date(selected.createdAt).toLocaleDateString('en-PH') },
                ].map(item => (
                  <div key={item.label} style={{ padding: '10px 12px', background: 'var(--bg-subtle)', borderRadius: 9, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-faint)', fontWeight: 700, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{item.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-base)' }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}