/**
 * Tests para Zustand stores de Fase 3
 * 
 * Verifica connectionsStore, metricsStore y alertsStore
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { act } from '@testing-library/react'
import { useMetricsStore } from '../src/stores/metricsStore.js'
import { useAlertsStore, ALERT_TYPES, ALERT_SEVERITY } from '../src/stores/alertsStore.js'

describe('Fase 3 - Zustand Stores', () => {
  describe('metricsStore', () => {
    beforeEach(() => {
      // Reset store before each test
      useMetricsStore.getState().reset()
    })

    describe('estado inicial', () => {
      it('debe tener valores por defecto correctos', () => {
        const state = useMetricsStore.getState()

        expect(state.metrics).toBe(null)
        expect(state.metricsLoading).toBe(true)
        expect(state.metricsError).toBe(null)
        expect(state.containers).toEqual([])
        expect(state.containersLoading).toBe(true)
        expect(state.logs).toEqual([])
        expect(state.activeConnectionId).toBe(null)
      })
    })

    describe('setMetrics()', () => {
      it('debe actualizar metricas y limpiar loading/error', () => {
        const metrics = {
          cpu: { usage: 50 },
          memory: { total: 16000, used: 8000 },
        }

        act(() => {
          useMetricsStore.getState().setMetrics(metrics)
        })

        const state = useMetricsStore.getState()
        expect(state.metrics).toEqual(metrics)
        expect(state.metricsLoading).toBe(false)
        expect(state.metricsError).toBe(null)
        expect(state.metricsLastUpdate).toBeInstanceOf(Date)
      })
    })

    describe('setMetricsError()', () => {
      it('debe setear error y limpiar loading', () => {
        act(() => {
          useMetricsStore.getState().setMetricsError('Connection lost')
        })

        const state = useMetricsStore.getState()
        expect(state.metricsError).toBe('Connection lost')
        expect(state.metricsLoading).toBe(false)
      })
    })

    describe('setContainers()', () => {
      it('debe actualizar lista de contenedores', () => {
        const containers = [
          { id: 'c1', name: 'nginx', state: 'running' },
          { id: 'c2', name: 'postgres', state: 'running' },
        ]

        act(() => {
          useMetricsStore.getState().setContainers(containers)
        })

        const state = useMetricsStore.getState()
        expect(state.containers).toEqual(containers)
        expect(state.containersLoading).toBe(false)
        expect(state.containersLastUpdate).toBeInstanceOf(Date)
      })

      it('debe manejar null como array vacio', () => {
        act(() => {
          useMetricsStore.getState().setContainers(null)
        })

        expect(useMetricsStore.getState().containers).toEqual([])
      })
    })

    describe('updateContainerStatus()', () => {
      it('debe actualizar estado de un contenedor', () => {
        const containers = [
          { id: 'c1', name: 'nginx', state: 'running' },
          { id: 'c2', name: 'postgres', state: 'running' },
        ]

        act(() => {
          useMetricsStore.getState().setContainers(containers)
          useMetricsStore.getState().updateContainerStatus('c1', 'stopped')
        })

        const state = useMetricsStore.getState()
        expect(state.containers[0].state).toBe('stopped')
        expect(state.containers[1].state).toBe('running')
      })
    })

    describe('setLogs()', () => {
      it('debe actualizar logs', () => {
        const logs = ['line 1', 'line 2', 'line 3']

        act(() => {
          useMetricsStore.getState().setLogs(logs)
        })

        expect(useMetricsStore.getState().logs).toEqual(logs)
      })
    })

    describe('clearLogs()', () => {
      it('debe limpiar logs', () => {
        act(() => {
          useMetricsStore.getState().setLogs(['log 1', 'log 2'])
          useMetricsStore.getState().clearLogs()
        })

        expect(useMetricsStore.getState().logs).toEqual([])
      })
    })

    describe('setActiveConnectionId()', () => {
      it('debe resetear datos al cambiar conexion', () => {
        // Setear datos
        act(() => {
          useMetricsStore.getState().setMetrics({ cpu: { usage: 50 } })
          useMetricsStore.getState().setContainers([{ id: 'c1' }])
          useMetricsStore.getState().setLogs(['log 1'])
        })

        // Cambiar conexion
        act(() => {
          useMetricsStore.getState().setActiveConnectionId('new-conn')
        })

        const state = useMetricsStore.getState()
        expect(state.activeConnectionId).toBe('new-conn')
        expect(state.metrics).toBe(null)
        expect(state.containers).toEqual([])
        expect(state.logs).toEqual([])
      })
    })

    describe('selectores', () => {
      it('getContainer() debe retornar contenedor por ID', () => {
        const containers = [
          { id: 'c1', name: 'nginx' },
          { id: 'c2', name: 'postgres' },
        ]

        act(() => {
          useMetricsStore.getState().setContainers(containers)
        })

        expect(useMetricsStore.getState().getContainer('c1')).toEqual({ id: 'c1', name: 'nginx' })
        expect(useMetricsStore.getState().getContainer('invalid')).toBe(null)
      })

      it('getRunningContainers() debe filtrar running', () => {
        const containers = [
          { id: 'c1', state: 'running' },
          { id: 'c2', state: 'stopped' },
          { id: 'c3', state: 'running' },
        ]

        act(() => {
          useMetricsStore.getState().setContainers(containers)
        })

        const running = useMetricsStore.getState().getRunningContainers()
        expect(running).toHaveLength(2)
        expect(running.every(c => c.state === 'running')).toBe(true)
      })

      it('getStoppedContainers() debe filtrar no-running', () => {
        const containers = [
          { id: 'c1', state: 'running' },
          { id: 'c2', state: 'stopped' },
          { id: 'c3', state: 'exited' },
        ]

        act(() => {
          useMetricsStore.getState().setContainers(containers)
        })

        const stopped = useMetricsStore.getState().getStoppedContainers()
        expect(stopped).toHaveLength(2)
      })
    })
  })

  describe('alertsStore', () => {
    beforeEach(() => {
      useAlertsStore.getState().reset()
    })

    describe('estado inicial', () => {
      it('debe tener valores por defecto correctos', () => {
        const state = useAlertsStore.getState()

        expect(state.alerts).toEqual([])
        expect(state.history).toEqual([])
        expect(state.config.enabled).toBe(true)
        expect(state.thresholds.cpuWarning).toBe(70)
        expect(state.thresholds.cpuCritical).toBe(90)
      })
    })

    describe('addAlert()', () => {
      it('debe agregar alerta con ID y timestamp', () => {
        act(() => {
          useAlertsStore.getState().addAlert({
            type: ALERT_TYPES.CPU_HIGH,
            severity: ALERT_SEVERITY.WARNING,
            message: 'CPU high',
          })
        })

        const state = useAlertsStore.getState()
        expect(state.alerts).toHaveLength(1)
        expect(state.alerts[0].id).toBeDefined()
        expect(state.alerts[0].timestamp).toBeDefined()
        expect(state.alerts[0].acknowledged).toBe(false)
        expect(state.alerts[0].type).toBe(ALERT_TYPES.CPU_HIGH)
      })

      it('debe agregar al historial', () => {
        act(() => {
          useAlertsStore.getState().addAlert({
            type: ALERT_TYPES.MEMORY_HIGH,
            message: 'Memory high',
          })
        })

        expect(useAlertsStore.getState().history).toHaveLength(1)
      })
    })

    describe('removeAlert()', () => {
      it('debe eliminar alerta por ID', () => {
        let alertId
        act(() => {
          const alert = useAlertsStore.getState().addAlert({
            type: ALERT_TYPES.CPU_HIGH,
            message: 'Test',
          })
          alertId = alert.id
        })

        expect(useAlertsStore.getState().alerts).toHaveLength(1)

        act(() => {
          useAlertsStore.getState().removeAlert(alertId)
        })

        expect(useAlertsStore.getState().alerts).toHaveLength(0)
      })
    })

    describe('acknowledgeAlert()', () => {
      it('debe marcar alerta como acknowledged', () => {
        let alertId
        act(() => {
          const alert = useAlertsStore.getState().addAlert({
            type: ALERT_TYPES.CPU_HIGH,
            message: 'Test',
          })
          alertId = alert.id
        })

        expect(useAlertsStore.getState().alerts[0].acknowledged).toBe(false)

        act(() => {
          useAlertsStore.getState().acknowledgeAlert(alertId)
        })

        expect(useAlertsStore.getState().alerts[0].acknowledged).toBe(true)
      })
    })

    describe('setThreshold()', () => {
      it('debe actualizar un umbral especifico', () => {
        act(() => {
          useAlertsStore.getState().setThreshold('cpuWarning', 80)
        })

        expect(useAlertsStore.getState().thresholds.cpuWarning).toBe(80)
      })
    })

    describe('checkMetrics()', () => {
      it('debe crear alerta para CPU critico', () => {
        const metrics = {
          cpu: { usage: 95 },
        }

        act(() => {
          useAlertsStore.getState().checkMetrics(metrics)
        })

        const alerts = useAlertsStore.getState().alerts
        expect(alerts).toHaveLength(1)
        expect(alerts[0].type).toBe(ALERT_TYPES.CPU_HIGH)
        expect(alerts[0].severity).toBe(ALERT_SEVERITY.CRITICAL)
      })

      it('debe crear alerta para memoria warning', () => {
        const metrics = {
          memory: { usedPercent: 78 },
        }

        act(() => {
          useAlertsStore.getState().checkMetrics(metrics)
        })

        const alerts = useAlertsStore.getState().alerts
        expect(alerts).toHaveLength(1)
        expect(alerts[0].type).toBe(ALERT_TYPES.MEMORY_HIGH)
        expect(alerts[0].severity).toBe(ALERT_SEVERITY.WARNING)
      })

      it('debe crear alertas para disco', () => {
        const metrics = {
          disk: [
            { mountPoint: '/', usedPercent: 96 },
            { mountPoint: '/home', usedPercent: 50 },
          ],
        }

        act(() => {
          useAlertsStore.getState().checkMetrics(metrics)
        })

        const alerts = useAlertsStore.getState().alerts
        expect(alerts).toHaveLength(1)
        expect(alerts[0].mountPoint).toBe('/')
      })

      it('no debe crear alertas si disabled', () => {
        act(() => {
          useAlertsStore.getState().setConfig({ enabled: false })
          useAlertsStore.getState().checkMetrics({ cpu: { usage: 99 } })
        })

        expect(useAlertsStore.getState().alerts).toHaveLength(0)
      })

      it('no debe duplicar alertas del mismo tipo', () => {
        const metrics = { cpu: { usage: 95 } }

        act(() => {
          useAlertsStore.getState().checkMetrics(metrics)
          useAlertsStore.getState().checkMetrics(metrics)
          useAlertsStore.getState().checkMetrics(metrics)
        })

        // Solo debe haber una alerta de CPU
        expect(useAlertsStore.getState().alerts).toHaveLength(1)
      })
    })

    describe('selectores', () => {
      it('getActiveAlerts() debe filtrar no-acknowledged', () => {
        act(() => {
          const alert1 = useAlertsStore.getState().addAlert({ type: 'test1' })
          useAlertsStore.getState().addAlert({ type: 'test2' })
          useAlertsStore.getState().acknowledgeAlert(alert1.id)
        })

        const active = useAlertsStore.getState().getActiveAlerts()
        expect(active).toHaveLength(1)
      })

      it('getCriticalAlerts() debe filtrar critical no-acknowledged', () => {
        act(() => {
          useAlertsStore.getState().addAlert({
            type: 'test1',
            severity: ALERT_SEVERITY.CRITICAL,
          })
          useAlertsStore.getState().addAlert({
            type: 'test2',
            severity: ALERT_SEVERITY.WARNING,
          })
        })

        const critical = useAlertsStore.getState().getCriticalAlerts()
        expect(critical).toHaveLength(1)
        expect(critical[0].severity).toBe(ALERT_SEVERITY.CRITICAL)
      })
    })
  })

  describe('Constantes exportadas', () => {
    it('ALERT_TYPES debe tener todos los tipos', () => {
      expect(ALERT_TYPES.CPU_HIGH).toBe('cpu_high')
      expect(ALERT_TYPES.MEMORY_HIGH).toBe('memory_high')
      expect(ALERT_TYPES.DISK_HIGH).toBe('disk_high')
      expect(ALERT_TYPES.CONTAINER_STOPPED).toBe('container_stopped')
      expect(ALERT_TYPES.CONNECTION_LOST).toBe('connection_lost')
      expect(ALERT_TYPES.TEMPERATURE_HIGH).toBe('temperature_high')
    })

    it('ALERT_SEVERITY debe tener todos los niveles', () => {
      expect(ALERT_SEVERITY.INFO).toBe('info')
      expect(ALERT_SEVERITY.WARNING).toBe('warning')
      expect(ALERT_SEVERITY.CRITICAL).toBe('critical')
    })
  })
})
