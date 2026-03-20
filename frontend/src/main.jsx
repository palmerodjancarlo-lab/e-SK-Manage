import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { AuthProvider }  from './context/AuthContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { Toaster } from 'react-hot-toast'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              fontFamily: 'Plus Jakarta Sans',
              fontSize: '14px',
              fontWeight: '600'
            }
          }}
        />
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
)