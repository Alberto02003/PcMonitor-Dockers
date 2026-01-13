/**
 * Hook para gestionar la configuración de alertas
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import { ALERTS_KEY_PREFIX, defaultAlerts } from '../constants/alertsConfig.js'

export function useAlertsConfig(connectionId) {
  const [alerts, setAlerts] = useState(defaultAlerts)
  const [alertsOpen, setAlertsOpen] = useState(false)

  const alertsKey = useMemo(
    () => `${ALERTS_KEY_PREFIX}.${connectionId || 'global'}`,
    [connectionId]
  )

  // Cargar alertas desde localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(alertsKey)
      if (!stored) {
        setAlerts(defaultAlerts)
        return
      }
      const parsed = JSON.parse(stored)
      setAlerts({ ...defaultAlerts, ...parsed })
    } catch {
      setAlerts(defaultAlerts)
    }
  }, [alertsKey])

  const updateAlertValue = useCallback((key, value) => {
    setAlerts((prev) => ({
      ...prev,
      [key]: { ...prev[key], value },
    }))
  }, [])

  const updateAlertEnabled = useCallback((key, enabled) => {
    setAlerts((prev) => ({
      ...prev,
      [key]: { ...prev[key], enabled },
    }))
  }, [])

  const saveAlerts = useCallback(() => {
    localStorage.setItem(alertsKey, JSON.stringify(alerts))
    setAlertsOpen(false)
  }, [alertsKey, alerts])

  const openAlerts = useCallback(() => setAlertsOpen(true), [])
  const closeAlerts = useCallback(() => setAlertsOpen(false), [])

  return {
    alerts,
    alertsOpen,
    openAlerts,
    closeAlerts,
    updateAlertValue,
    updateAlertEnabled,
    saveAlerts,
  }
}

export default useAlertsConfig
