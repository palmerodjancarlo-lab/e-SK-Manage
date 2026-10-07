import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { queryClient } from './lib/queryClient'
import { ThemeProvider } from './context/ThemeProvider'
import { AuthProvider } from './context/AuthProvider'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <App />
            <Toaster position="top-right" toastOptions={{ style:{ fontSize:'13px', fontWeight:600 } }} />
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>
)