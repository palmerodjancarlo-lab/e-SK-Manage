// SKApplications.jsx

import { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Icon } from '../../components/Icon'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export default function SKApplications() {
  const [applicants, setApplicants] = useState([])
  const [loading,    setLoading]    = useState(true)
    const [rejectModal, setRejectModal] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [approvePosition, setApprovePosition] = useState('')
  const [processing, setProcessing] = useState(false)

  useEffect(() => { fetchApplications() }, [])

  const fetchApplications = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get(`${API}/admin/sk-applications`)
      setApplicants(data.applicants)
    } catch {
      toast.error('Failed to load applications.')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (applicant) => {
    const position = approvePosition || applicant.skApplication?.appliedPosition
    if (!window.confirm(`Approve ${applicant.firstName} ${applicant.lastName} as ${position}?`)) return
    setProcessing(true)
    try {
      await axios.put(`${API}/admin/sk-applications/${applicant._id}/approve`, { position })
      toast.success(`${applicant.firstName} is now an SK Officer!`)
            setApprovePosition('')
      fetchApplications()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error.')
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) { toast.error('Please provide a reason.'); return }
    setProcessing(true)
    try {
      await axios.put(`${API}/admin/sk-applications/${rejectModal._id}/reject`, { reason: rejectReason })
      toast.success('Application rejected.')
      setRejectModal(null)
      setRejectReason('')
            fetchApplications()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error.')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">SK Official Applications</h1>
          <p className="page-subtitle">Review and approve pending SK official applications</p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span className="badge badge-amber">
            {applicants.length} Pending
          </span>
        </div>
      </div>

      {/* Info box */}
      <div className="alert alert-info" style={{ marginBottom:20 }}>
        <strong>How this works:</strong> When a user registers as an SK Official applicant, they are placed in the Kabataan portal with a pending status. Review their application below, then approve or reject.
      </div>

      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:60 }}>
          <div className="spinner" style={{ width:36, height:36 }} />
        </div>
      ) : applicants.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon"><Icon name="identification" size={40} /></div>
            <div className="empty-title">No pending applications</div>
            <div className="empty-desc">SK official applications will appear here when users apply during registration.</div>
          </div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {applicants.map(app => (
            <div key={app._id} className="card" style={{ padding:'18px 20px' }}>
              <div style={{ display:'flex', gap:14, alignItems:'flex-start', flexWrap:'wrap' }}>

                {/* Avatar */}
                <div className="avatar avatar-lg" style={{ background:'#0F1F5C', flexShrink:0 }}>
                  {app.firstName?.[0]}{app.lastName?.[0]}
                </div>

                {/* Info */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4, flexWrap:'wrap' }}>
                    <h3 style={{ fontWeight:700, fontSize:15 }}>{app.firstName} {app.lastName}</h3>
                    <span className="badge badge-amber">Pending Review</span>
                  </div>
                  <p style={{ fontSize:12, color:'var(--text-faint)', marginBottom:10 }}>
                    {app.email} &middot; Brgy. {app.barangay}, {app.municipality}
                  </p>

                  {/* Application details */}
                  <div className="grid-2" style={{ gap:10, marginBottom:12 }}>
                    <div style={{ background:'var(--bg-subtle)', borderRadius:9, padding:'10px 12px', border:'1px solid var(--border)' }}>
                      <p style={{ fontSize:10, color:'var(--text-faint)', fontWeight:700, marginBottom:3, textTransform:'uppercase', letterSpacing:'0.4px' }}>Applied Position</p>
                      <p style={{ fontSize:13, fontWeight:700, color:'var(--text-base)' }}>{app.skApplication?.appliedPosition || '—'}</p>
                    </div>
                    <div style={{ background:'var(--bg-subtle)', borderRadius:9, padding:'10px 12px', border:'1px solid var(--border)' }}>
                      <p style={{ fontSize:10, color:'var(--text-faint)', fontWeight:700, marginBottom:3, textTransform:'uppercase', letterSpacing:'0.4px' }}>Applied On</p>
                      <p style={{ fontSize:13, fontWeight:600 }}>
                        {app.skApplication?.appliedAt ? new Date(app.skApplication.appliedAt).toLocaleDateString('en-PH') : '—'}
                      </p>
                    </div>
                  </div>

                  {app.skApplication?.whyApply && (
                    <div style={{ marginBottom:10 }}>
                      <p style={{ fontSize:10, color:'var(--text-faint)', fontWeight:700, marginBottom:4, textTransform:'uppercase', letterSpacing:'0.4px' }}>Why they want to be SK Official</p>
                      <p style={{ fontSize:13, color:'var(--text-muted)', lineHeight:1.6, background:'var(--bg-subtle)', padding:'10px 12px', borderRadius:9, border:'1px solid var(--border)' }}>
                        {app.skApplication.whyApply}
                      </p>
                    </div>
                  )}

                  {app.skApplication?.proofDescription && (
                    <div style={{ marginBottom:12 }}>
                      <p style={{ fontSize:10, color:'var(--text-faint)', fontWeight:700, marginBottom:4, textTransform:'uppercase', letterSpacing:'0.4px' }}>Supporting Information</p>
                      <p style={{ fontSize:13, color:'var(--text-muted)', lineHeight:1.6, background:'var(--bg-subtle)', padding:'10px 12px', borderRadius:9, border:'1px solid var(--border)' }}>
                        {app.skApplication.proofDescription}
                      </p>
                    </div>
                  )}

                  {/* Position override + action buttons */}
                  <div style={{ display:'flex', gap:10, alignItems:'flex-end', flexWrap:'wrap' }}>
                    <div style={{ flex:1, minWidth:160 }}>
                      <label style={{ fontSize:11, fontWeight:700, color:'var(--text-faint)', display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.4px' }}>
                        Position to Assign
                      </label>
                      <input className="form-input" style={{ fontSize:13 }}
                        placeholder={app.skApplication?.appliedPosition || 'SK Officer'}
                        value={approvePosition}
                        onChange={e => setApprovePosition(e.target.value)} />
                    </div>
                    <button className="btn btn-success btn-sm" onClick={() => handleApprove(app)} disabled={processing}>
                      <Icon name="check" size={14} /> Approve
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => setRejectModal(app)} disabled={processing}>
                      <Icon name="x" size={14} /> Reject
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject modal */}
      {rejectModal && (
        <div className="modal-overlay" onClick={() => setRejectModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Reject Application</span>
              <button className="modal-close" onClick={() => setRejectModal(null)}><Icon name="x" size={14} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:16 }}>
                Rejecting the application of <strong>{rejectModal.firstName} {rejectModal.lastName}</strong>. They will remain as a Kabataan User.
              </p>
              <div className="form-group">
                <label className="form-label">Reason for Rejection</label>
                <textarea className="form-textarea" rows={3}
                  placeholder="Explain why the application was rejected..."
                  value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost btn-sm" onClick={() => setRejectModal(null)}>Cancel</button>
              <button className="btn btn-danger btn-sm" onClick={handleReject} disabled={processing}>
                {processing ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}