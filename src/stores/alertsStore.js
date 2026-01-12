/**
 * Store global para sistema de alertas usando Zustand
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Tipos de alerta
 */
export const ALERT_TYPES = {
  CPU_HIGH: 'cpu_high',
  MEMORY_HIGH: 'memory_high',
  DISK_HIGH: 'disk_high',
  CONTAINER_STOPPED: 'container_stopped',
  CONNECTION_LOST: 'connection_lost',
  TEMPERATURE_HIGH: 'temperature_high',
}

/**
 * Severidad de alertas
 */
export const ALERT_SEVERITY = {
  INFO: 'info',
  WARNING: 'warning',
  CRITICAL: 'critical',
}

/**
 * Estado inicial
 */
const initialState = {
  // Alertas activas
  alerts: [],
  
  // Historial de alertas
  history: [],
  
  // Configuracion de umbrales
  thresholds: {
    cpuWarning: 70,
    cpuCritical: 90,
    memoryWarning: 75,
    memoryCritical: 90,
    diskWarning: 80,
    diskCritical: 95,
    temperatureWarning: 70,
    temperatureCritical: 85,
  },
  
  // Configuracion general
  config: {
    enabled: true,
    soundEnabled: false,
    notificationsEnabled: true,
    maxHistoryItems: 100,
  },
}

/**
 * Store de alertas
 */
export const useAlertsStore = create(
  persist(
    (set, get) => ({
      ...initialState,

      // === Alertas Activas ===

      addAlert: (alert) => {
        const newAlert = {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          acknowledged: false,
          ...alert,
        }

        set(state => ({
          alerts: [...state.alerts, newAlert],
          history: [
            newAlert,
            ...state.history.slice(0, state.config.maxHistoryItems - 1),
          ],
        }))

        return newAlert
      },

      removeAlert: (alertId) => {
        set(state => ({
          alerts: state.alerts.filter(a => a.id !== alertId),
        }))
      },

      acknowledgeAlert: (alertId) => {
        set(state => ({
          alerts: state.alerts.map(a =>
            a.id === alertId ? { ...a, acknowledged: true } : a
          ),
        }))
      },

      clearAlerts: () => set({ alerts: [] }),

      // === Historial ===

      clearHistory: () => set({ history: [] }),

      // === Umbrales ===

      setThreshold: (key, value) => {
        set(state => ({
          thresholds: {
            ...state.thresholds,
            [key]: value,
          },
        }))
      },

      setThresholds: (thresholds) => {
        set(state => ({
          thresholds: {
            ...state.thresholds,
            ...thresholds,
          },
        }))
      },

      // === Configuracion ===

      setConfig: (config) => {
        set(state => ({
          config: {
            ...state.config,
            ...config,
          },
        }))
      },

      toggleEnabled: () => {
        set(state => ({
          config: {
            ...state.config,
            enabled: !state.config.enabled,
          },
        }))
      },

      // === Evaluacion de metricas ===

      checkMetrics: (metrics) => {
        const state = get()
        if (!state.config.enabled || !metrics) return []

        const newAlerts = []
        const { thresholds } = state

        // CPU
        if (metrics.cpu?.usage >= thresholds.cpuCritical) {
          newAlerts.push({
            type: ALERT_TYPES.CPU_HIGH,
            severity: ALERT_SEVERITY.CRITICAL,
            message: `CPU usage critical: ${metrics.cpu.usage.toFixed(1)}%`,
            value: metrics.cpu.usage,
          })
        } else if (metrics.cpu?.usage >= thresholds.cpuWarning) {
          newAlerts.push({
            type: ALERT_TYPES.CPU_HIGH,
            severity: ALERT_SEVERITY.WARNING,
            message: `CPU usage high: ${metrics.cpu.usage.toFixed(1)}%`,
            value: metrics.cpu.usage,
          })
        }

        // Memoria
        if (metrics.memory?.usedPercent >= thresholds.memoryCritical) {
          newAlerts.push({
            type: ALERT_TYPES.MEMORY_HIGH,
            severity: ALERT_SEVERITY.CRITICAL,
            message: `Memory usage critical: ${metrics.memory.usedPercent.toFixed(1)}%`,
            value: metrics.memory.usedPercent,
          })
        } else if (metrics.memory?.usedPercent >= thresholds.memoryWarning) {
          newAlerts.push({
            type: ALERT_TYPES.MEMORY_HIGH,
            severity: ALERT_SEVERITY.WARNING,
            message: `Memory usage high: ${metrics.memory.usedPercent.toFixed(1)}%`,
            value: metrics.memory.usedPercent,
          })
        }

        // Disco (revisar todos los discos)
        if (Array.isArray(metrics.disk)) {
          for (const disk of metrics.disk) {
            if (disk.usedPercent >= thresholds.diskCritical) {
              newAlerts.push({
                type: ALERT_TYPES.DISK_HIGH,
                severity: ALERT_SEVERITY.CRITICAL,
                message: `Disk ${disk.mountPoint} critical: ${disk.usedPercent.toFixed(1)}%`,
                value: disk.usedPercent,
                mountPoint: disk.mountPoint,
              })
            } else if (disk.usedPercent >= thresholds.diskWarning) {
              newAlerts.push({
                type: ALERT_TYPES.DISK_HIGH,
                severity: ALERT_SEVERITY.WARNING,
                message: `Disk ${disk.mountPoint} high: ${disk.usedPercent.toFixed(1)}%`,
                value: disk.usedPercent,
                mountPoint: disk.mountPoint,
              })
            }
          }
        }

        // Temperatura
        if (metrics.temperature?.cpu >= thresholds.temperatureCritical) {
          newAlerts.push({
            type: ALERT_TYPES.TEMPERATURE_HIGH,
            severity: ALERT_SEVERITY.CRITICAL,
            message: `CPU temperature critical: ${metrics.temperature.cpu}C`,
            value: metrics.temperature.cpu,
          })
        } else if (metrics.temperature?.cpu >= thresholds.temperatureWarning) {
          newAlerts.push({
            type: ALERT_TYPES.TEMPERATURE_HIGH,
            severity: ALERT_SEVERITY.WARNING,
            message: `CPU temperature high: ${metrics.temperature.cpu}C`,
            value: metrics.temperature.cpu,
          })
        }

        // Agregar alertas nuevas (evitar duplicados)
        const existingTypes = new Set(state.alerts.map(a => a.type))
        for (const alert of newAlerts) {
          if (!existingTypes.has(alert.type)) {
            get().addAlert(alert)
          }
        }

        return newAlerts
      },

      // === Selectores ===

      getActiveAlerts: () => get().alerts.filter(a => !a.acknowledged),
      
      getCriticalAlerts: () => get().alerts.filter(
        a => a.severity === ALERT_SEVERITY.CRITICAL && !a.acknowledged
      ),

      getAlertsByType: (type) => get().alerts.filter(a => a.type === type),

      // === Reset ===

      reset: () => set(initialState),
    }),
    {
      name: 'pcmd-alerts',
      partialize: (state) => ({
        thresholds: state.thresholds,
        config: state.config,
        history: state.history.slice(0, 50), // Solo guardar ultimos 50
      }),
    }
  )
)

export default useAlertsStore
