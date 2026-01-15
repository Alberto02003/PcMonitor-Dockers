/**
 * Hook para gestionar notificaciones de alertas basadas en métricas
 * Verifica umbrales y envía notificaciones cuando se superan
 */

import { useEffect, useRef, useCallback } from 'react'
import { useNotifications, NOTIFICATION_TYPES } from '../../../hooks/useNotifications.js'
import { useAlertCooldown } from './useAlertCooldown.js'
import { useTrendDetection } from './useTrendDetection.js'
import { useAlertHistory } from './useAlertHistory.js'

/**
 * Hook que verifica métricas contra umbrales y envía notificaciones
 * @param {Object} options - Opciones del hook
 * @param {Object} options.metrics - Métricas actuales del servidor
 * @param {boolean} options.metricsLoading - Si las métricas están cargando
 * @param {Array} options.containers - Lista de contenedores Docker
 * @param {boolean} options.containersLoading - Si los contenedores están cargando
 * @param {Object} options.alerts - Configuración de alertas con umbrales
 * @param {Object} options.connection - Conexión activa (id, name)
 */
export function useAlertNotifications({
  metrics,
  metricsLoading,
  containers,
  containersLoading,
  alerts,
  connection,
}) {
  const { notify, permission, requestPermission, isSupported } = useNotifications()
  
  // New enhanced hooks
  const alertCooldown = useAlertCooldown(300000) // 5 minutes cooldown
  const trendDetection = useTrendDetection()
  const { addAlert, history: alertHistory } = useAlertHistory()
  
  // Refs para evitar alertas duplicadas
  const triggeredAlertsRef = useRef(new Set())
  const previousContainersRef = useRef([])
  const alertsInitializedRef = useRef(false)

  // Solicitar permiso de notificación al montar
  useEffect(() => {
    if (isSupported && permission === 'default') {
      console.log('[useAlertNotifications] Requesting notification permission...')
      requestPermission()
    }
  }, [isSupported, permission, requestPermission])

  // Inicializar sistema de alertas - log estado actual
  useEffect(() => {
    if (!alertsInitializedRef.current) {
      alertsInitializedRef.current = true
      console.log('[useAlertNotifications] Alerts system initialized', {
        isSupported,
        permission,
        alertsEnabled: alerts,
      })
    }
  }, [isSupported, permission, alerts])

  // Función helper para verificar y notificar
  const checkAndNotify = useCallback((alertKey, value, label, unit = '') => {
    const alertConfig = alerts[alertKey]
    if (!alertConfig?.enabled) {
      return
    }
    
    const threshold = alertConfig.value
    if (threshold == null) return
    
    if (value >= threshold) {
      const alertId = `${alertKey}-${connection?.id || 'global'}`
      
      // Check cooldown before triggering
      if (!alertCooldown.canTrigger(alertId)) {
        return // Alert is in cooldown
      }
      
      console.log(`[useAlertNotifications] ALERT TRIGGERED: ${alertKey}`, {
        value,
        threshold,
        label,
      })
      
      // Mark as triggered (start cooldown)
      alertCooldown.markTriggered(alertId)
      
      const valueStr = Number.isInteger(value) ? value.toString() : value.toFixed(1)
      notify(`[ALERTA] ${connection?.name || 'Servidor'}`, {
        type: NOTIFICATION_TYPES.WARNING,
        body: `${label}: ${valueStr}${unit} (umbral: ${threshold}${unit})`,
      })
      
      // Add to history
      addAlert({
        type: alertKey,
        label,
        value,
        threshold,
        unit,
        connectionId: connection?.id,
        connectionName: connection?.name,
      })
    } else {
      // Si el valor baja del umbral, resetear cooldown
      const alertId = `${alertKey}-${connection?.id || 'global'}`
      alertCooldown.resetCooldown(alertId)
    }
  }, [alerts, connection?.id, connection?.name, notify, alertCooldown, addAlert])

  // Verificar métricas contra umbrales
  useEffect(() => {
    if (!metrics || metricsLoading) {
      return
    }

    console.log('[useAlertNotifications] Checking metrics against thresholds...', {
      cpu: metrics.cpu,
      memory: metrics.memory,
      disks: metrics.disks,
      temperatures: metrics.temperatures,
      alerts,
    })

    // Check CPU - backend uses usagePercent
    if (metrics.cpu?.usagePercent != null) {
      checkAndNotify('cpuUsage', metrics.cpu.usagePercent, 'CPU', '%')
    }

    // Check RAM - backend uses usagePercent
    if (metrics.memory?.usagePercent != null) {
      checkAndNotify('ramUsage', metrics.memory.usagePercent, 'RAM', '%')
    }

    // Check Disk (main partition) - backend uses disks[] with usagePercent
    if (Array.isArray(metrics.disks) && metrics.disks.length > 0) {
      const mainDisk = metrics.disks.find(d => d.mountPoint === '/') || metrics.disks[0]
      if (mainDisk?.usagePercent != null) {
        checkAndNotify('diskUsage', mainDisk.usagePercent, `Disco ${mainDisk.mountPoint}`, '%')
      }
    }

    // Check CPU Temperature - backend uses temperatures.cpuTempC
    if (metrics.temperatures?.cpuTempC != null && metrics.temperatures.cpuTempC > 0) {
      checkAndNotify('cpuTemp', metrics.temperatures.cpuTempC, 'Temp CPU', 'C')
    }

    // Check GPU Temperature - backend uses temperatures.gpuTempC or gpu.temperatureC
    const gpuTemp = metrics.temperatures?.gpuTempC || metrics.gpu?.temperatureC
    if (gpuTemp != null && gpuTemp > 0) {
      checkAndNotify('gpuTemp', gpuTemp, 'Temp GPU', 'C')
    }

    // Check GPU Usage
    if (metrics.gpu?.usagePercent != null) {
      checkAndNotify('gpuUsage', metrics.gpu.usagePercent, 'GPU', '%')
    }

    // Check Load Average - backend uses cpu.loadAvg1m
    if (metrics.cpu?.loadAvg1m != null) {
      checkAndNotify('loadAvg', metrics.cpu.loadAvg1m, 'Carga promedio', '')
    }

    // Check Swap - backend uses memory.swapPercent
    if (metrics.memory?.swapPercent != null) {
      checkAndNotify('swapUsage', metrics.memory.swapPercent, 'Swap', '%')
    }

    // Check Network - backend uses network[] array with rxMbps/txMbps
    if (Array.isArray(metrics.network) && metrics.network.length > 0) {
      const mainNet = metrics.network[0]
      if (mainNet?.rxMbps != null) {
        checkAndNotify('netIn', mainNet.rxMbps, 'Red entrada', ' Mb/s')
      }
      if (mainNet?.txMbps != null) {
        checkAndNotify('netOut', mainNet.txMbps, 'Red salida', ' Mb/s')
      }
    }

    // === NEW: Record metrics for trend detection ===
    if (metrics.cpu?.usagePercent != null) {
      trendDetection.recordValue('cpu', metrics.cpu.usagePercent)
    }
    if (metrics.memory?.usagePercent != null) {
      trendDetection.recordValue('ram', metrics.memory.usagePercent)
    }

    // === NEW: Check for rising trends ===
    if (alerts.cpuTrend?.enabled) {
      const cpuTrend = trendDetection.detectRisingTrend('cpu', 5) // 5% per minute
      if (cpuTrend) {
        const alertId = `cpu-trend-${connection?.id || 'global'}`
        if (alertCooldown.canTrigger(alertId)) {
          alertCooldown.markTriggered(alertId)
          notify(`[ALERTA] ${connection?.name || 'Servidor'}`, {
            type: NOTIFICATION_TYPES.WARNING,
            body: `CPU aumentando rápidamente: +${cpuTrend.rate.toFixed(1)}%/min (desde ${cpuTrend.startValue.toFixed(1)}% a ${cpuTrend.currentValue.toFixed(1)}%)`,
          })
          addAlert({
            type: 'cpuTrend',
            label: 'CPU Trend',
            value: cpuTrend.rate,
            threshold: 5,
            unit: '%/min',
            connectionId: connection?.id,
            connectionName: connection?.name,
          })
        }
      }
    }

    if (alerts.ramTrend?.enabled) {
      const ramTrend = trendDetection.detectRisingTrend('ram', 5) // 5% per minute
      if (ramTrend) {
        const alertId = `ram-trend-${connection?.id || 'global'}`
        if (alertCooldown.canTrigger(alertId)) {
          alertCooldown.markTriggered(alertId)
          notify(`[ALERTA] ${connection?.name || 'Servidor'}`, {
            type: NOTIFICATION_TYPES.WARNING,
            body: `RAM aumentando rápidamente: +${ramTrend.rate.toFixed(1)}%/min (desde ${ramTrend.startValue.toFixed(1)}% a ${ramTrend.currentValue.toFixed(1)}%)`,
          })
          addAlert({
            type: 'ramTrend',
            label: 'RAM Trend',
            value: ramTrend.rate,
            threshold: 5,
            unit: '%/min',
            connectionId: connection?.id,
            connectionName: connection?.name,
          })
        }
      }
    }

    // === NEW: Check combined alerts (CPU AND RAM high) ===
    if (alerts.cpuRamCombined?.enabled) {
      const cpuHigh = metrics.cpu?.usagePercent >= 80
      const ramHigh = metrics.memory?.usagePercent >= 80
      if (cpuHigh && ramHigh) {
        const alertId = `cpu-ram-combined-${connection?.id || 'global'}`
        if (alertCooldown.canTrigger(alertId)) {
          alertCooldown.markTriggered(alertId)
          notify(`[ALERTA CRÍTICA] ${connection?.name || 'Servidor'}`, {
            type: NOTIFICATION_TYPES.ERROR,
            body: `CPU y RAM altos simultáneamente: CPU ${metrics.cpu.usagePercent.toFixed(1)}%, RAM ${metrics.memory.usagePercent.toFixed(1)}%`,
          })
          addAlert({
            type: 'cpuRamCombined',
            label: 'CPU + RAM Combined',
            value: metrics.cpu.usagePercent,
            threshold: 80,
            unit: '%',
            connectionId: connection?.id,
            connectionName: connection?.name,
          })
        }
      }
    }

  }, [metrics, metricsLoading, alerts, checkAndNotify, trendDetection, alertCooldown, notify, addAlert, connection?.id, connection?.name])

  // Verificar contenedores Docker detenidos
  useEffect(() => {
    if (!containers || containersLoading) return
    if (!alerts.dockerDown?.enabled) return

    const previous = previousContainersRef.current

    // Detectar contenedores que se detuvieron
    for (const prevContainer of previous) {
      if (prevContainer.state === 'running') {
        const current = containers.find(c => c.id === prevContainer.id)
        if (current && current.state !== 'running') {
          const alertId = `docker-stopped-${prevContainer.id}`
          if (!triggeredAlertsRef.current.has(alertId)) {
            console.log('[useAlertNotifications] Docker container stopped:', prevContainer.name)
            triggeredAlertsRef.current.add(alertId)
            notify(`[ALERTA] ${connection?.name || 'Servidor'}`, {
              type: NOTIFICATION_TYPES.ERROR,
              body: `Contenedor detenido: ${prevContainer.name || prevContainer.id.slice(0, 12)}`,
            })
            // Limpiar después de 5 minutos
            setTimeout(() => {
              triggeredAlertsRef.current.delete(alertId)
            }, 300000)
          }
        }
      }
    }

    previousContainersRef.current = [...containers]
  }, [containers, containersLoading, alerts.dockerDown?.enabled, notify, connection?.name])

  return {
    isSupported,
    permission,
    requestPermission,
    alertHistory,
  }
}

export default useAlertNotifications
