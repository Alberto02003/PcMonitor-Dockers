/**
 * Hook para integrar sistema de alertas con metricas
 */

import { useEffect, useCallback, useRef } from 'react'
import { useAlertsStore, ALERT_TYPES, ALERT_SEVERITY } from '../stores/alertsStore.js'
import { useMetricsStore } from '../stores/metricsStore.js'

/**
 * Hook para monitorear metricas y generar alertas automaticamente
 * 
 * @param {Object} options
 * @param {boolean} options.enabled - Si el monitoreo esta habilitado
 * @param {Function} options.onAlert - Callback cuando se genera una alerta
 * @param {Function} options.onCritical - Callback para alertas criticas
 */
export function useAlertMonitor({ enabled = true, onAlert, onCritical } = {}) {
  const metrics = useMetricsStore((state) => state.metrics)
  const containers = useMetricsStore((state) => state.containers)
  const checkMetrics = useAlertsStore((state) => state.checkMetrics)
  const addAlert = useAlertsStore((state) => state.addAlert)
  const config = useAlertsStore((state) => state.config)
  
  const previousContainersRef = useRef([])

  // Monitorear metricas del sistema
  useEffect(() => {
    if (!enabled || !config.enabled || !metrics) return

    const newAlerts = checkMetrics(metrics)
    
    if (newAlerts.length > 0) {
      newAlerts.forEach((alert) => {
        onAlert?.(alert)
        if (alert.severity === ALERT_SEVERITY.CRITICAL) {
          onCritical?.(alert)
        }
      })
    }
  }, [metrics, enabled, config.enabled, checkMetrics, onAlert, onCritical])

  // Monitorear contenedores Docker
  useEffect(() => {
    if (!enabled || !config.enabled || !containers.length) return

    const previous = previousContainersRef.current
    
    // Detectar contenedores que se detuvieron
    for (const prevContainer of previous) {
      if (prevContainer.state === 'running') {
        const current = containers.find((c) => c.id === prevContainer.id)
        if (current && current.state !== 'running') {
          const alert = addAlert({
            type: ALERT_TYPES.CONTAINER_STOPPED,
            severity: ALERT_SEVERITY.WARNING,
            message: `Contenedor ${prevContainer.name || prevContainer.id.slice(0, 12)} se detuvo`,
            containerId: prevContainer.id,
            containerName: prevContainer.name,
          })
          onAlert?.(alert)
        }
      }
    }

    previousContainersRef.current = containers
  }, [containers, enabled, config.enabled, addAlert, onAlert])

  return null
}

/**
 * Hook para acceder a las alertas de forma conveniente
 */
export function useAlerts() {
  const alerts = useAlertsStore((state) => state.alerts)
  const history = useAlertsStore((state) => state.history)
  const thresholds = useAlertsStore((state) => state.thresholds)
  const config = useAlertsStore((state) => state.config)
  
  const addAlert = useAlertsStore((state) => state.addAlert)
  const removeAlert = useAlertsStore((state) => state.removeAlert)
  const acknowledgeAlert = useAlertsStore((state) => state.acknowledgeAlert)
  const clearAlerts = useAlertsStore((state) => state.clearAlerts)
  const setThreshold = useAlertsStore((state) => state.setThreshold)
  const setConfig = useAlertsStore((state) => state.setConfig)

  const activeAlerts = alerts.filter((a) => !a.acknowledged)
  const criticalAlerts = activeAlerts.filter((a) => a.severity === ALERT_SEVERITY.CRITICAL)
  const warningAlerts = activeAlerts.filter((a) => a.severity === ALERT_SEVERITY.WARNING)

  // Crear alerta de conexion perdida
  const alertConnectionLost = useCallback((serverName) => {
    return addAlert({
      type: ALERT_TYPES.CONNECTION_LOST,
      severity: ALERT_SEVERITY.CRITICAL,
      message: `Conexion perdida con ${serverName || 'el servidor'}`,
    })
  }, [addAlert])

  // Crear alerta de reconexion
  const alertReconnected = useCallback((serverName) => {
    // Remover alertas de conexion perdida anteriores
    const connectionAlerts = alerts.filter((a) => a.type === ALERT_TYPES.CONNECTION_LOST)
    connectionAlerts.forEach((a) => removeAlert(a.id))
    
    return addAlert({
      type: 'connection_restored',
      severity: ALERT_SEVERITY.INFO,
      message: `Reconectado a ${serverName || 'el servidor'}`,
    })
  }, [alerts, addAlert, removeAlert])

  return {
    // Estado
    alerts,
    activeAlerts,
    criticalAlerts,
    warningAlerts,
    history,
    thresholds,
    config,
    
    // Contadores
    activeCount: activeAlerts.length,
    criticalCount: criticalAlerts.length,
    warningCount: warningAlerts.length,
    
    // Acciones
    addAlert,
    removeAlert,
    acknowledgeAlert,
    clearAlerts,
    setThreshold,
    setConfig,
    
    // Helpers
    alertConnectionLost,
    alertReconnected,
    
    // Estado derivado
    hasCritical: criticalAlerts.length > 0,
    hasWarning: warningAlerts.length > 0,
    hasAlerts: activeAlerts.length > 0,
  }
}

export { ALERT_TYPES, ALERT_SEVERITY }
export default useAlerts
