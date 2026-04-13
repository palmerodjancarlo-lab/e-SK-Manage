// SK Announcements page
import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { Icon } from '../../components/Icon'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const CATEGORIES = ['All', 'General', 'Events', 'Programs', 'Meetings', 'Opportunities']

const CAT_BADGE = {
  General:       'badge-gray',
  Events:        'badge-blue',
  Programs:      'badge-green',
  Meetings:      'badge-gold',
  Opportunities: 'badge-amber',
}

export default function SKAnnouncements() {
  const { user } = useAuth()
  const [items,    setItems]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [category, setCategory] = useState('All')
  const [search,   setSearch]   = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing,  setEditing]  = useState(null)
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState({ title: '', content: '', category: 'General' })

  const canManage = user?.role === 'admin' || user?.role === 'sk_officer'

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (category !== 'All') params.category = category
      if (search) params.search = search
      const { data } = await axios.get(`${API}/announcements`, { params })
      setItems(data.announcements)
    } catch { toast.error('Failed to load announcement.') }
    finally { setLoading(false) }
  }, [category, search])

  useEffect(() => { fetchItems() }, [fetchItems])

  const openCreate = () => {
    setEditing(null)
    setForm({ title: '', content: '', category: 'General' })
    setShowForm(true)
  }

  const openEdit = (ann) => {
    setEditing(ann)
    setForm({ title: ann.title, content: ann.content, category: ann.category })
    setShowForm(true)
    setSelected(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editing) {
        await axios.put(`${API}/announcements/${editing._id}`, form)
        toast.success('Announcement updated.')
      } else {
        await axios.post(`${API}/announcements`, form)
        toast.success('Announcement posted.')
      }
      setShowForm(false)
      fetchItems()
    } catch (err) { toast.error(err.response?.data?.message || 'May error.') }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this announcement?')) return
    try {
      await axios.delete(`${API}/announcements/${id}`)
      toast.success('Delete Successfully.')
      setSelected(null)
      fetchItems()
    } catch { toast.error('Unable to delete.') }
  }

  const handlePin = async (id) => {
    try {
      const { data } = await axios.put(`${API}/announcements/${id}/pin`)
      toast.success(data.message)
      fetchItems()
    } catch { toast.error('May error.') }
  }

  const pinned   = items.filter(a => a.isPinned)
  const unpinned = items.filter(a => !a.isPinned)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Announcements</h1>
          <p className="page-subtitle">News and Announcements</p>
        </div>
        {canManage && (
          <button className="btn btn-primary btn-sm" onClick={openCreate}>
            <Icon name="plus" size={14} /> New Post
          </button>
        )}
      </div>

      {/* Search + filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <div className="search-wrap" style={{ flex: 1, minWidth: 180 }}>
          <span className="search-icon-el"><Icon name="search" size={14} /></span>
          <input className="form-input search-wrap" placeholder="Search..."
            value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 36 }} />
        </div>
        <div className="tabs" style={{ width: 'auto' }}>
          {CATEGORIES.map(c => (
            <button key={c} className={`tab-btn ${category === c ? 'active' : ''}`} onClick={() => setCategory(c)}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <div className="spinner" />
        </div>
      ) : items.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon"><Icon name="megaphone" size={40} /></div>
            <div className="empty-title">No Announcement</div>
            <div className="empty-desc">{canManage ? 'Click "New Post" to get started.' : 'Check back later for updates.'}</div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Pinned first */}
          {pinned.map(ann => <AnnCard key={ann._id} ann={ann} catBadge={CAT_BADGE} canManage={canManage} onView={() => setSelected(ann)} onEdit={() => openEdit(ann)} onDelete={() => handleDelete(ann._id)} onPin={() => handlePin(ann._id)} />)}
          {unpinned.map(ann => <AnnCard key={ann._id} ann={ann} catBadge={CAT_BADGE} canManage={canManage} onView={() => setSelected(ann)} onEdit={() => openEdit(ann)} onDelete={() => handleDelete(ann._id)} onPin={() => handlePin(ann._id)} />)}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{editing ? 'Edit Announcement' : 'New Announcement'}</span>
              <button className="modal-close" onClick={() => setShowForm(false)}><Icon name="x" size={14} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Title</label>
                  <input className="form-input" required placeholder="Announcement title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                    {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Content</label>
                  <textarea className="form-textarea" required placeholder="Write the announcement..." rows={5} value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">{editing ? 'Update' : 'Post'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-box" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', gap: 8 }}>
                <span className={`badge ${CAT_BADGE[selected.category] || 'badge-gray'}`}>{selected.category}</span>
                {selected.isPinned && <span className="badge badge-gold">Pinned</span>}
              </div>
              <button className="modal-close" onClick={() => setSelected(null)}><Icon name="x" size={14} /></button>
            </div>
            <div className="modal-body">
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: 'var(--text-base)' }}>{selected.title}</h2>
              <p style={{ fontSize: 12, color: 'var(--text-faint)', marginBottom: 18 }}>
                {selected.author?.firstName} {selected.author?.lastName} &middot; {new Date(selected.createdAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              <p style={{ fontSize: 14, lineHeight: 1.75, color: 'var(--text-muted)', whiteSpace: 'pre-wrap' }}>{selected.content}</p>
            </div>
            {canManage && (
              <div className="modal-footer">
                <button className="btn btn-ghost btn-sm" onClick={() => handlePin(selected._id)}>
                  {selected.isPinned ? 'Unpin' : 'Pin'}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => openEdit(selected)}>
                  <Icon name="pencil" size={13} /> Edit
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(selected._id)}>
                  <Icon name="trash" size={13} /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Announcement card component
function AnnCard({ ann, catBadge, canManage, onView, onEdit, onDelete, onPin }) {
  return (
    <div className="card card-hover" style={{ padding: '14px 18px' }} onClick={onView}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{
          width: 36, height: 36, borderRadius: 9, flexShrink: 0,
          background: ann.isPinned ? 'var(--gold-100)' : 'var(--blue-50)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: ann.isPinned ? 'var(--gold-600)' : 'var(--blue-800)',
        }}>
          <Icon name="megaphone" size={16} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 5, flexWrap: 'wrap' }}>
            <span className={`badge ${catBadge[ann.category] || 'badge-gray'}`}>{ann.category}</span>
            {ann.isPinned && <span className="badge badge-gold">Pinned</span>}
          </div>
          <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-base)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {ann.title}
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {ann.content}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>
              {new Date(ann.createdAt).toLocaleDateString('en-PH')}
            </span>
            {canManage && (
              <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }} onClick={e => e.stopPropagation()}>
                <button className="btn btn-ghost btn-sm" style={{ padding: '3px 8px', fontSize: 11 }} onClick={onPin}>
                  {ann.isPinned ? 'Unpin' : 'Pin'}
                </button>
                <button className="btn btn-ghost btn-sm" style={{ padding: '3px 8px', fontSize: 11 }} onClick={onEdit}>Edit</button>
                <button className="btn btn-danger btn-sm" style={{ padding: '3px 8px', fontSize: 11 }} onClick={onDelete}>Delete</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}