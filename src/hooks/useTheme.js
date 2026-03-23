/**
 * Hook useTheme - Gestión de tema (light/dark mode)
 * 
 * Fase 4.1 - Dark Mode Support
 * 
 * Features:
 * - Cambio entre tema claro y oscuro
 * - Persistencia en localStorage
 * - Detección automática del tema del sistema
 * - Aplicación de clase CSS al body
 */

import { useState, useEffect, useMemo } from 'react'

export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  AUTO: 'auto',
}

const STORAGE_KEY = 'pcmd.theme.v1'

/**
 * Detecta la preferencia de tema del sistema
 * @returns {string} 'light' o 'dark'
 */
function getSystemTheme() {
  if (typeof window === 'undefined') return THEMES.LIGHT
  
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)')
  return prefersDark.matches ? THEMES.DARK : THEMES.LIGHT
}

/**
 * Obtiene el tema almacenado o el del sistema
 * @returns {string} Tema preferido
 */
function getStoredTheme() {
  if (typeof window === 'undefined') return THEMES.AUTO
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && Object.values(THEMES).includes(stored)) {
      return stored
    }
  } catch (error) {
    console.warn('Error loading theme from localStorage:', error)
  }
  
  return THEMES.AUTO
}

/**
 * Resuelve el tema actual basado en la preferencia
 * @param {string} preference - 'light', 'dark', o 'auto'
 * @returns {string} 'light' o 'dark'
 */
function resolveTheme(preference) {
  if (preference === THEMES.AUTO) {
    return getSystemTheme()
  }
  return preference
}

/**
 * Hook para gestionar el tema de la aplicación
 * 
 * @returns {{
 *   theme: string,
 *   effectiveTheme: string,
 *   setTheme: (theme: string) => void,
 *   toggleTheme: () => void,
 *   isDark: boolean
 * }}
 */
export function useTheme() {
  const [theme, setThemeState] = useState(() => getStoredTheme())
  const [systemThemeKey, setSystemThemeKey] = useState(0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const effectiveTheme = useMemo(() => resolveTheme(theme), [theme, systemThemeKey])

  // Aplicar tema al body
  useEffect(() => {
    // Aplicar clase al body
    document.body.classList.remove('theme-light', 'theme-dark')
    document.body.classList.add(`theme-${effectiveTheme}`)

    // Actualizar meta theme-color para móviles
    const metaThemeColor = document.querySelector('meta[name="theme-color"]')
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        'content',
        effectiveTheme === THEMES.DARK ? '#1a1a1a' : '#ffffff'
      )
    }
  }, [effectiveTheme])

  // Escuchar cambios en la preferencia del sistema
  useEffect(() => {
    if (theme !== THEMES.AUTO) return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const handleChange = () => {
      setSystemThemeKey(k => k + 1)
    }

    // Modern API
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
    // Legacy API
    else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange)
      return () => mediaQuery.removeListener(handleChange)
    }
  }, [theme])

  /**
   * Cambiar el tema
   * @param {string} newTheme - 'light', 'dark', o 'auto'
   */
  const setTheme = (newTheme) => {
    if (!Object.values(THEMES).includes(newTheme)) {
      console.warn(`Invalid theme: ${newTheme}`)
      return
    }

    setThemeState(newTheme)
    
    try {
      localStorage.setItem(STORAGE_KEY, newTheme)
    } catch (error) {
      console.warn('Error saving theme to localStorage:', error)
    }
  }

  /**
   * Alternar entre tema claro y oscuro
   */
  const toggleTheme = () => {
    const current = resolveTheme(theme)
    const next = current === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK
    setTheme(next)
  }

  return {
    theme, // Preferencia del usuario ('light', 'dark', 'auto')
    effectiveTheme, // Tema resuelto actual ('light' o 'dark')
    setTheme,
    toggleTheme,
    isDark: effectiveTheme === THEMES.DARK,
  }
}

export default useTheme
