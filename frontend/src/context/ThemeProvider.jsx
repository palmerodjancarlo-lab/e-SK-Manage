import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({
  theme: 'light',
  toggleTheme: () => {},
  setTheme: () => {},
});

function getInitial() {
  try {
    const saved = localStorage.getItem('esk-theme');
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    /* localStorage unavailable — fall through */
  }
  // Always default to light on a fresh login/session.
  return 'light';
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getInitial);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    try {
      localStorage.setItem('esk-theme', theme);
    } catch {
      /* ignore persistence errors */
    }
  }, [theme]);

  const setTheme = (t) => setThemeState(t === 'dark' ? 'dark' : 'light');
  const toggleTheme = () => setThemeState((t) => (t === 'dark' ? 'light' : 'dark'));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  return useContext(ThemeContext);
}
