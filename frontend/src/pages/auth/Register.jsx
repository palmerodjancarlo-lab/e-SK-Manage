import { useState }          from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth }           from '../../context/AuthContext'
import { useTheme }          from '../../context/ThemeContext'
import toast                 from 'react-hot-toast'
import skLogo                from '../../assets/sk-logo.png'

const ROLES = [
  { value: 'sk_officer',    label: 'SK Officer',     icon: '👮', desc: 'Manage SK operations' },
  { value: 'sk_member',     label: 'SK Member',      icon: '🧑', desc: 'View and participate' },
  { value: 'kabataan_user', label: 'Kabataan User',  icon: '🌟', desc: 'Earn points & rewards' },
]

const MUNICIPALITIES = ['Boac','Buenavista','Gasan','Mogpog','Santa Cruz','Torrijos']

export default function Register() {
  const { register }          = useAuth()
  const { darkMode, toggleTheme } = useTheme()
  const navigate              = useNavigate()
  const [step, setStep]       = useState(1)
  const [loading, setLoading] = useState(false)
  const [form, setForm]       = useState({
    firstName: '', lastName: '', email: '',
    password: '', confirmPassword: '',
    role: '', municipality: 'Boac', barangay: ''
  })

  const nextStep = () => {
    if (!form.firstName || !form.lastName || !form.email || !form.password) {
      return toast.error('Please fill in all fields')
    }
    if (form.password !== form.confirmPassword) {
      return toast.error('Passwords do not match')
    }
    if (form.password.length < 6) {
      return toast.error('Password must be at least 6 characters')
    }
    setStep(2)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.role) return toast.error('Please select your role')
    if (!form.barangay) return toast.error('Please enter your barangay')
    setLoading(true)
    try {
      await register(form)
      toast.success('Account created! Wait for admin verification.')
      navigate('/login')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      padding: 24
    }}>
      <div style={{ width: '100%', maxWidth: 500 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src={skLogo} alt="SK" style={{ width: 44, height: 44, objectFit: 'contain' }} />
            <div>
              <div style={{ fontWeight: 900, color: 'var(--sk-blue)', fontSize: 18 }}>e-SK Manage</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Province of Marinduque</div>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            style={{
              width: 38, height: 38,
              border: '1.5px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-card)',
              fontSize: 16,
              cursor: 'pointer'
            }}
          >{darkMode ? '☀️' : '🌙'}</button>
        </div>

        <div className="card">
          <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 4 }}>Create Account</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>
            Register to join e-SK Manage
          </p>

          {/* Step indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
            {[1, 2].map(s => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 32, height: 32,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: 13,
                  background: step >= s ? 'var(--sk-blue)' : 'var(--bg-card2)',
                  color: step >= s ? 'white' : 'var(--text-muted)',
                  border: step >= s ? 'none' : '1.5px solid var(--border)',
                  transition: 'var(--transition)'
                }}>
                  {s}
                </div>
                {s < 2 && (
                  <div style={{
                    width: 60, height: 2,
                    borderRadius: 2,
                    background: step > s ? 'var(--sk-blue)' : 'var(--border)',
                    transition: 'var(--transition)'
                  }} />
                )}
              </div>
            ))}
            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 4 }}>
              Step {step} of 2
            </span>
          </div>

          <form onSubmit={handleSubmit}>
            {/* STEP 1 */}
            {step === 1 && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">First Name</label>
                    <input className="form-input" placeholder="Juan"
                      value={form.firstName}
                      onChange={e => setForm({ ...form, firstName: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name</label>
                    <input className="form-input" placeholder="Dela Cruz"
                      value={form.lastName}
                      onChange={e => setForm({ ...form, lastName: e.target.value })} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input type="email" className="form-input" placeholder="you@example.com"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input type="password" className="form-input" placeholder="Min. 6 characters"
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm Password</label>
                  <input type="password" className="form-input" placeholder="Re-enter password"
                    value={form.confirmPassword}
                    onChange={e => setForm({ ...form, confirmPassword: e.target.value })} />
                </div>
                <button type="button" className="btn btn-primary btn-full" onClick={nextStep}>
                  Next Step →
                </button>
              </>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <>
                <div className="form-group">
                  <label className="form-label">Select Your Role</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {ROLES.map(role => (
                      <button
                        key={role.value}
                        type="button"
                        onClick={() => setForm({ ...form, role: role.value })}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 14,
                          padding: '14px 16px',
                          borderRadius: 'var(--radius-md)',
                          border: form.role === role.value
                            ? `2px solid var(--sk-blue)`
                            : '1.5px solid var(--border)',
                          background: form.role === role.value
                            ? 'var(--sk-blue-pale)'
                            : 'var(--bg-card2)',
                          cursor: 'pointer',
                          transition: 'var(--transition)',
                          textAlign: 'left'
                        }}
                      >
                        <span style={{ fontSize: 28 }}>{role.icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
                            {role.label}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                            {role.desc}
                          </div>
                        </div>
                        {form.role === role.value && (
                          <div style={{
                            width: 22, height: 22,
                            background: 'var(--sk-blue)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: 12,
                            fontWeight: 800
                          }}>✓</div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Municipality</label>
                  <select className="form-select"
                    value={form.municipality}
                    onChange={e => setForm({ ...form, municipality: e.target.value })}>
                    {MUNICIPALITIES.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Barangay</label>
                  <input className="form-input" placeholder="Enter your barangay"
                    value={form.barangay}
                    onChange={e => setForm({ ...form, barangay: e.target.value })} />
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" className="btn btn-outline" style={{ flex: 1 }}
                    onClick={() => setStep(1)}>
                    ← Back
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}
                    disabled={loading}>
                    {loading ? <><div className="spinner" />Creating...</> : 'Create Account'}
                  </button>
                </div>
              </>
            )}
          </form>

          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 14, marginTop: 20 }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--sk-blue)', fontWeight: 700 }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}