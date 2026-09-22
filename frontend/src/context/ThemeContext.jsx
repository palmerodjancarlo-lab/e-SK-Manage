// context/ThemeContext.jsx — app-wide light/dark theme with a proper token system
// Fixes the "ridiculous dark mode" by giving every surface a real dark value,
// not just inverting colors. Persists choice; respects system preference first time.
import { useState, useEffect, useMemo } from 'react'
import { ThemeContext } from './theme-utils'

// ── Design tokens ──────────────────────────────────────────────
// Institutional look: deep slate/navy, restrained steel-blue accent,
// gold reserved for a few civic highlights. Mature, not childish.
const LIGHT = {
  mode:'light',
  appBg:'#EEF1F6',
  surface:'#FFFFFF',
  surface2:'#F6F8FB',
  sidebar:'#0B1A2B',
  sidebarText:'#9AABC0',
  sidebarActive:'#FFFFFF',
  text:'#0E1A2B',
  text2:'#4A5A6E',
  text3:'#8B99AD',
  border:'#E2E7EE',
  borderStrong:'#CDD6E1',
  accent:'#1E56D6',
  accentSoft:'#ECF1FE',
  accentText:'#1B4FCC',
  gold:'#B0851A',
  green:'#1B7A3E', greenSoft:'#EFFAF2',
  amber:'#B25E09', amberSoft:'#FEF7EC',
  red:'#C42B2B',   redSoft:'#FDF0F0',
  sky:'#0A6B9E',   skySoft:'#EEF7FD',
  violet:'#6B2FC7',violetSoft:'#F3EFFD',
  shadow:'0 1px 2px rgba(14,26,43,0.05), 0 2px 6px rgba(14,26,43,0.04)',
  shadowMd:'0 6px 20px rgba(14,26,43,0.09)',
  overlay:'rgba(8,16,27,0.45)',
}

const DARK = {
  mode:'dark',
  appBg:'#0A1017',       // deep neutral slate
  surface:'#121A26',     // cards clearly float above bg
  surface2:'#0F1620',
  sidebar:'#080D14',
  sidebarText:'#8394A8',
  sidebarActive:'#FFFFFF',
  text:'#EAEEF4',        // soft white
  text2:'#AAB6C6',
  text3:'#6E7C90',
  border:'#202C3C',
  borderStrong:'#303F52',
  accent:'#4C86F5',      // legible bright blue
  accentSoft:'#152238',
  accentText:'#8FB4FB',
  gold:'#D6AB35',
  green:'#43D07E', greenSoft:'#0E2018',
  amber:'#F5B830', amberSoft:'#231A0C',
  red:'#F26D6D',   redSoft:'#261314',
  sky:'#3FB6F0',   skySoft:'#0A1B27',
  violet:'#A184F0',violetSoft:'#171331',
  shadow:'0 1px 3px rgba(0,0,0,0.5)',
  shadowMd:'0 8px 24px rgba(0,0,0,0.5)',
  overlay:'rgba(0,0,0,0.62)',
}

export function ThemeProvider({ children }) {
  // Always default to LIGHT. Dark mode is applied only if the user explicitly chose it.
  const [mode, setMode] = useState(() => {
    const saved = localStorage.getItem('esk-theme')
    return saved === 'dark' ? 'dark' : 'light'
  })

  useEffect(() => {
    localStorage.setItem('esk-theme', mode)
    // set body bg so there's no white flash around the app
    document.body.style.background = (mode === 'dark' ? DARK.appBg : LIGHT.appBg)
    document.body.style.margin = '0'
  }, [mode])

  const toggle = () => setMode(m => (m === 'dark' ? 'light' : 'dark'))

  const T = useMemo(() => (mode === 'dark' ? DARK : LIGHT), [mode])

  return (
    <ThemeContext.Provider value={{ T, mode, toggle, setMode }}>
      {children}
    </ThemeContext.Provider>
  )
}