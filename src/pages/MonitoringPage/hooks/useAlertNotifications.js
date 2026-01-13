/**
 * Hook para gestionar notificaciones de alertas basadas en métricas
 * Verifica umbrales y envía notificaciones cuando se superan
 */

import { useEffect, useRef, useCallback } from 'react'
import { useNotifications, NOTIFICATION_TYPES } from '../../../hooks/useNotifications.js'

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
      if (!triggeredAlertsRef.current.has(alertId)) {
        console.log(`[useAlertNotifications] ALERT TRIGGERED: ${alertKey}`, {
          value,
          threshold,
          label,
        })
        
        triggeredAlertsRef.current.add(alertId)
        
        const valueStr = Number.isInteger(value) ? value.toString() : value.toFixed(1)
        notify(`[ALERTA] ${connection?.name || 'Servidor'}`, {
          type: NOTIFICATION_TYPES.WARNING,
          body: `${label}: ${valueStr}${unit} (umbral: ${threshold}${unit})`,
        })
        
        // Limpiar alerta después de 60 segundos para permitir re-trigger
        setTimeout(() => {
          triggeredAlertsRef.current.delete(alertId)
        }, 60000)
      }
    } else {
      // Si el valor baja del umbral, permitir re-trigger
      const alertId = `${alertKey}-${connection?.id || 'global'}`
      if (triggeredAlertsRef.current.has(alertId)) {
        triggeredAlertsRef.current.delete(alertId)
      }
    }
  }, [alerts, connection?.id, connection?.name, notify])

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

  }, [metrics, metricsLoading, alerts, checkAndNotify])

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
  }
}

export default useAlertNotifications
