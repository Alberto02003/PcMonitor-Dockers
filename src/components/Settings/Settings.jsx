import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import './Settings.css'

const SETTINGS_KEY = 'pcmd.settings.v1'

const defaultSettings = {
  notificationDuration: 1000,
  autoConnectDefault: false,
  theme: 'dark',
  windowSize: 'medium',
  storeCredentials: true,
  language: 'es',
}

const SettingsContext = createContext(null)

function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(defaultSettings)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        const next = { ...defaultSettings, ...parsed, theme: 'dark' }
        setSettings(next)
      }
    } catch (error) {
      // Ignore invalid stored settings.
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
      updateSettings(patch) {
        setSettings((prev) => ({ ...prev, ...patch }))
      },
    }),
    [settings],
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
  } catch (error) {
    // Ignore errors when Tauri APIs are unavailable.
  }
}

export { SettingsProvider, useSettings, defaultSettings }
