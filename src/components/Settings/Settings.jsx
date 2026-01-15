import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import './Settings.css'

const SETTINGS_KEY = 'pcmd.settings.v1'

const defaultSettings = {
  notificationDuration: 1000,
  autoConnectDefault: true,
  theme: 'dark',
  windowSize: 'medium',
  storeCredentials: true,
  language: 'es',
  autoCheckUpdates: true, // Verificar actualizaciones automáticamente
}

const SettingsContext = createContext(null)

function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(defaultSettings)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        // Force autoConnectDefault to true (always auto-connect to default)
        const next = { ...defaultSettings, ...parsed, theme: 'dark', autoConnectDefault: true }
        setSettings(next)
      }
    } catch {
      // Ignore invalid stored settings.
    } finally {
      setLoaded(true)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  }, [settings])

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme
  }, [settings.theme])

  useEffect(() => {
    applyWindowSize(settings.windowSize)
  }, [settings.windowSize])

  const api = useMemo(
    () => ({
      settings,
      loaded,
      updateSettings(patch) {
        setSettings((prev) => ({ ...prev, ...patch }))
      },
    }),
    [settings, loaded],
  )

  return <SettingsContext.Provider value={api}>{children}</SettingsContext.Provider>
}

function useSettings() {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('useSettings debe usarse dentro de SettingsProvider')
  }
  return context
}

async function applyWindowSize(size) {
  const sizes = {
    small: { width: 900, height: 600 },
    medium: { width: 1024, height: 720 },
    large: { width: 1280, height: 840 },
  }
  const target = sizes[size]
  if (!target) return

  if (!window.__TAURI__) return

  try {
    const { appWindow, LogicalSize } = await import('@tauri-apps/api/window')
    await appWindow.setSize(new LogicalSize(target.width, target.height))
    await appWindow.center()
  } catch {
    // Ignore errors when Tauri APIs are unavailable.
  }
}

// eslint-disable-next-line react-refresh/only-export-components
export { SettingsProvider, useSettings, defaultSettings }
