import { useState }        from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth }         from '../../context/AuthContext'
import { useTheme }        from '../../context/ThemeContext'
import toast               from 'react-hot-toast'
import skLogo              from '../../assets/sk-logo.png'

export default function Login() {
  const { login }             = useAuth()
  const { darkMode, toggleTheme } = useTheme()
  const navigate              = useNavigate()
  const [loading, setLoading] = useState(false)
  const [form, setForm]       = useState({ email: '', password: '' })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(form.email, form.password)
      toast.success('Welcome back!')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: 'var(--bg)'
    }}>

      {/* ── Left Panel — Branding ── */}
      <div style={{
        flex: '0 0 45%',
        background: 'var(--sk-blue)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 48,
        position: 'relative',
        overflow: 'hidden'
      }}
      className="login-left-panel"
      >
        {/* Decorative circles */}
        <div style={{
          position: 'absolute', top: -80, left: -80,
          width: 320, height: 320,
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '50%'
        }} />
        <div style={{
          position: 'absolute', bottom: -60, right: -60,
          width: 260, height: 260,
          background: 'rgba(245,196,0,0.12)',
          borderRadius: '50%'
        }} />
        <div style={{
          position: 'absolute', top: '50%', left: -40,
          width: 160, height: 160,
          background: 'rgba(192,17,31,0.1)',
          borderRadius: '50%'
        }} />

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>

          {/* SK Logo */}
          <div style={{
            width: 120, height: 120,
            background: 'rgba(255,255,255,0.15)',
            borderRadius: 28,
            border: '2px solid rgba(255,255,255,0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px'
          }}>
            <img
              src={skLogo}
              alt="SK Logo"
              style={{ width: 88, height: 88, objectFit: 'contain' }}
            />
          </div>

          <h1 style={{
            fontSize: 36,
            fontWeight: 900,
            color: 'white',
            marginBottom: 8
          }}>e-SK Manage</h1>

          <p style={{
            fontSize: 16,
            color: 'rgba(255,255,255,0.75)',
            marginBottom: 4,
            fontWeight: 500
          }}>Sangguniang Kabataan</p>

          <p style={{
            fontSize: 14,
            color: 'rgba(255,255,255,0.55)'
          }}>Province of Marinduque</p>

          {/* Feature cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
            marginTop: 40
          }}>
            {[
              { icon: '📢', title: 'Announcements', desc: 'Stay updated' },
              { icon: '⭐', title: 'Points & Rewards', desc: 'Earn by joining' },
              { icon: '📊', title: 'Transparency', desc: 'See SK funds' },
              { icon: '📅', title: 'Events',        desc: 'Never miss out' },
            ].map(f => (
              <div key={f.title} style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.18)',
                borderRadius: 16,
                padding: 16,
                textAlign: 'left'
              }}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>{f.icon}</div>
                <div style={{ color: 'white', fontWeight: 700, fontSize: 13 }}>{f.title}</div>
                <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, marginTop: 2 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right Panel — Form ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32
      }}>
        <div style={{ width: '100%', maxWidth: 420 }}>

          {/* Theme toggle */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 32 }}>
            <button
              onClick={toggleTheme}
              style={{
                width: 40, height: 40,
                border: '1.5px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-card)',
                fontSize: 18,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-sm)'
              }}
            >{darkMode ? '☀️' : '🌙'}</button>
          </div>

          {/* Mobile logo */}
          <div style={{ display: 'none', alignItems: 'center', gap: 12, marginBottom: 28 }}
               className="mobile-logo">
            <img src={skLogo} alt="SK" style={{ width: 44, height: 44, objectFit: 'contain' }} />
            <div>
              <div style={{ fontWeight: 900, color: 'var(--sk-blue)', fontSize: 18 }}>e-SK Manage</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Province of Marinduque</div>
            </div>
          </div>

          <h2 style={{ fontSize: 30, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 6 }}>
            Welcome back!
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 32 }}>
            Sign in to your e-SK Manage account
          </p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-input"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <label className="form-label" style={{ margin: 0 }}>Password</label>
                <a href="#" style={{ fontSize: 12, color: 'var(--sk-blue)', fontWeight: 700 }}>
                  Forgot password?
                </a>
              </div>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
              <input type="checkbox" id="remember" style={{ width: 16, height: 16, accentColor: 'var(--sk-blue)' }} />
              <label htmlFor="remember" style={{ fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                Remember me
              </label>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full btn-lg"
              disabled={loading}
            >
              {loading ? <><div className="spinner" />Signing in...</> : 'Sign In'}
            </button>
          </form>

          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 14, marginTop: 24 }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: 'var(--sk-blue)', fontWeight: 700 }}>
              Register here
            </Link>
          </p>

          {/* Roles info */}
          <div className="alert alert-info" style={{ marginTop: 24 }}>
            <p style={{ fontWeight: 700, fontSize: 12, marginBottom: 8 }}>Available Roles:</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {['Admin', 'SK Officer', 'SK Member', 'Kabataan User'].map(r => (
                <span key={r} className="badge badge-blue">{r}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}