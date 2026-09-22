// context/AuthContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import axios from 'axios'

const AuthContext = createContext()

// FIXED: must match backend BASE_URI which is /api/v1
const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null)
  const [token,   setToken]   = useState(() => localStorage.getItem('eskmanage-token'))
  const [loading, setLoading] = useState(true)

  const logout = useCallback(() => {
    localStorage.removeItem('eskmanage-token')
    localStorage.removeItem('esk-theme')   // reset to light for next login
    delete axios.defaults.headers.common['Authorization']
    setToken(null)
    setUser(null)
  }, [])

  const fetchProfile = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/auth/profile`)
      setUser(data.user)
    } catch {
      logout()
    } finally {
      setLoading(false)
    }
  }, [logout])

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      fetchProfile()
    } else {
      setLoading(false)
    }
  }, [token, fetchProfile])

  const login = async (email, password) => {
    const { data } = await axios.post(`${API}/auth/login`, { email, password })
    localStorage.setItem('eskmanage-token', data.token)
    axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`
    setToken(data.token)
    setUser(data.user)
    return data
  }

  const register = async (formData) => {
    const { data } = await axios.post(`${API}/auth/register`, formData)
    return data
  }

  // Verify the emailed code — logs the user in on success
  const verifyEmail = async (email, code) => {
    const { data } = await axios.post(`${API}/auth/verify-email`, { email, code })
    localStorage.setItem('eskmanage-token', data.token)
    axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`
    setToken(data.token)
    setUser(data.user)
    return data
  }

  const resendCode = async (email) => {
    const { data } = await axios.post(`${API}/auth/resend-code`, { email })
    return data
  }

  const forgotPassword = async (email) => {
    const { data } = await axios.post(`${API}/auth/forgot-password`, { email })
    return data
  }

  const resetPassword = async (email, code, newPassword) => {
    const { data } = await axios.post(`${API}/auth/reset-password`, { email, code, newPassword })
    return data
  }

  return (
    <AuthContext.Provider value={{ user, setUser, token, loading, login, register, verifyEmail, resendCode, forgotPassword, resetPassword, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)