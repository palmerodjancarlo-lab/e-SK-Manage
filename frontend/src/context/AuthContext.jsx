import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import axios from 'axios'

const AuthContext = createContext()
const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null)
  const [token,   setToken]   = useState(() => localStorage.getItem('eskmanage-token'))
  const [loading, setLoading] = useState(true)

  const logout = useCallback(() => {
    localStorage.removeItem('eskmanage-token')
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

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)