import { useState, useEffect, useCallback } from 'react'
import api from '../lib/api'
import { queryClient } from '../lib/queryClient'
import { AuthContext } from './auth-store'

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(() => !!localStorage.getItem('esk-token'))

  // Load profile if a token exists
  useEffect(() => {
    const token = localStorage.getItem('esk-token')
    if (!token) return              // no token → loading already false, nothing to do
    let active = true
    api.get('/auth/profile')
      .then(r => { if (active) setUser(r.data.user) })
      .catch(() => { localStorage.removeItem('esk-token') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('esk-token', data.token)
    queryClient.clear()          // drop any cached data from a previous account
    setUser(data.user)
    return data
  }, [])

  const register     = useCallback(async (payload) => (await api.post('/auth/register', payload)).data, [])
  const verifyEmail  = useCallback(async (email, code) => {
    const { data } = await api.post('/auth/verify-email', { email, code })
    localStorage.setItem('esk-token', data.token)
    queryClient.clear()          // start the new session with a clean cache
    setUser(data.user)
    return data
  }, [])
  const resendCode     = useCallback(async (email) => (await api.post('/auth/resend-code', { email })).data, [])
  const forgotPassword = useCallback(async (email) => (await api.post('/auth/forgot-password', { email })).data, [])
  const resetPassword  = useCallback(async (email, code, newPassword) => (await api.post('/auth/reset-password', { email, code, newPassword })).data, [])

  const logout = useCallback(() => {
    localStorage.removeItem('esk-token')
    localStorage.removeItem('esk-theme')
    queryClient.clear()          // wipe cached queries so nothing bleeds into the next login
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{
      user, setUser, loading,
      login, register, verifyEmail, resendCode, forgotPassword, resetPassword, logout,
    }}>
      {children}
    </AuthContext.Provider>
  )
}