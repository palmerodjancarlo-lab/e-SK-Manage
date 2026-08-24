// context/ThemeContext.jsx
// Defaults to LIGHT mode. Remembers the user's choice.
import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

export const ThemeProvider = ({ children }) => {
  // Default to light. Only use dark if the user explicitly chose it before.
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('eskmanage-theme')
    return saved === 'dark'   // anything other than 'dark' = light
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
    localStorage.setItem('eskmanage-theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  const toggleTheme = () => setDarkMode(d => !d)

  return (
    <ThemeContext.Provider value={{ darkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => useContext(ThemeContext)