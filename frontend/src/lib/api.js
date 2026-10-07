import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1',
  timeout: 15000, // 15 seconds
})

// Attach token on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('esk-token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export default api