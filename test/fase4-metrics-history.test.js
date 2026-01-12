/**
 * Tests para Fase 4.2 - Histórico de Métricas
 * 
 * Verifica el hook useMetricsHistory
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useMetricsHistory } from '../src/hooks/useMetricsHistory.js'

describe('Fase 4.2 - Histórico de Métricas', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Estado inicial', () => {
    it('debe iniciar con historial vacío', () => {
      const { result } = renderHook(() => useMetricsHistory('test-connection'))

      expect(result.current.history).toEqual([])
      expect(result.current.size).toBe(0)
    })

    it('debe cargar historial desde localStorage', () => {
      const mockHistory = [
        { timestamp: Date.now(), cpu: { usage: 50 } },
        { timestamp: Date.now() + 1000, cpu: { usage: 60 } },
      ]
      localStorage.setItem(
        'pcmd.metrics.history.v1.test-connection',
        JSON.stringify(mockHistory)
      )

      const { result } = renderHook(() => useMetricsHistory('test-connection'))

      expect(result.current.history).toEqual(mockHistory)
      expect(result.current.size).toBe(2)
    })

    it('debe manejar localStorage corrupto', () => {
      localStorage.setItem('pcmd.metrics.history.v1.test-connection', 'invalid-json')

      const { result } = renderHook(() => useMetricsHistory('test-connection'))

      expect(result.current.history).toEqual([])
    })
  })

  describe('addMetrics()', () => {
    it('debe agregar métricas al historial', () => {
      const { result } = renderHook(() => useMetricsHistory('test-connection'))

      act(() => {
        result.current.addMetrics({ cpu: { usage: 50 }, ram: { usage: 60 } })
      })

      expect(result.current.size).toBe(1)
      expect(result.current.history[0]).toMatchObject({
        cpu: { usage: 50 },
        ram: { usage: 60 },
      })
      expect(result.current.history[0].timestamp).toBeDefined()
    })

    it('debe agregar múltiples entradas', () => {
      const { result } = renderHook(() => useMetricsHistory('test-connection'))

      act(() => {
        result.current.addMetrics({ cpu: { usage: 50 } })
        result.current.addMetrics({ cpu: { usage: 60 } })
        result.current.addMetrics({ cpu: { usage: 70 } })
      })

      expect(result.current.size).toBe(3)
      expect(result.current.history.map(h => h.cpu.usage)).toEqual([50, 60, 70])
    })

    it('debe ignorar métricas null/undefined', () => {
      const { result } = renderHook(() => useMetricsHistory('test-connection'))

      act(() => {
        result.current.addMetrics(null)
        result.current.addMetrics(undefined)
      })

      expect(result.current.size).toBe(0)
    })
  })

  describe('clear()', () => {
    it('debe limpiar todo el historial', () => {
      const { result } = renderHook(() => useMetricsHistory('test-connection'))

      act(() => {
        result.current.addMetrics({ cpu: { usage: 50 } })
        result.current.addMetrics({ cpu: { usage: 60 } })
      })

      expect(result.current.size).toBe(2)

      act(() => {
        result.current.clear()
      })

      expect(result.current.size).toBe(0)
      expect(result.current.history).toEqual([])
    })

    it('debe eliminar de localStorage', () => {
      const { result } = renderHook(() => useMetricsHistory('test-connection'))

      act(() => {
        result.current.addMetrics({ cpu: { usage: 50 } })
      })

      expect(localStorage.getItem('pcmd.metrics.history.v1.test-connection')).toBeTruthy()

      act(() => {
        result.current.clear()
      })

      // After clear, localStorage should be either null or empty array
      const stored = localStorage.getItem('pcmd.metrics.history.v1.test-connection')
      expect(stored === null || stored === '[]').toBe(true)
    })
  })

  describe('getStats()', () => {
    it('debe calcular estadísticas correctamente', () => {
      const { result } = renderHook(() => useMetricsHistory('test-connection'))

      act(() => {
        result.current.addMetrics({ cpu: { usage: 10 } })
        result.current.addMetrics({ cpu: { usage: 20 } })
        result.current.addMetrics({ cpu: { usage: 30 } })
      })

      const stats = result.current.getStats('cpu.usage')

      expect(stats.min).toBe(10)
      expect(stats.max).toBe(30)
      expect(stats.avg).toBe(20)
      expect(stats.count).toBe(3)
    })

    it('debe manejar claves anidadas', () => {
      const { result } = renderHook(() => useMetricsHistory('test-connection'))

      act(() => {
        result.current.addMetrics({ system: { cpu: { temp: 50 } } })
        result.current.addMetrics({ system: { cpu: { temp: 60 } } })
      })

      const stats = result.current.getStats('system.cpu.temp')

      expect(stats.min).toBe(50)
      expect(stats.max).toBe(60)
      expect(stats.avg).toBe(55)
    })

    it('debe retornar ceros para historial vacío', () => {
      const { result } = renderHook(() => useMetricsHistory('test-connection'))

      const stats = result.current.getStats('cpu.usage')

      expect(stats).toEqual({ min: 0, max: 0, avg: 0, count: 0 })
    })

    it('debe filtrar por rango de tiempo', () => {
      const { result } = renderHook(() => useMetricsHistory('test-connection'))
      const now = Date.now()

      // Agregar métricas con diferentes timestamps
      act(() => {
        vi.setSystemTime(now - 2000)
        result.current.addMetrics({ cpu: { usage: 10 } })
        
        vi.setSystemTime(now - 1000)
        result.current.addMetrics({ cpu: { usage: 20 } })
        
        vi.setSystemTime(now)
        result.current.addMetrics({ cpu: { usage: 30 } })
      })

      // Solo últimos 1500ms
      const stats = result.current.getStats('cpu.usage', 1500)

      expect(stats.count).toBe(2)
      expect(stats.min).toBe(20)
      expect(stats.max).toBe(30)
    })

    it('debe ignorar valores no numéricos', () => {
      const { result } = renderHook(() => useMetricsHistory('test-connection'))

      act(() => {
        result.current.addMetrics({ value: 10 })
        result.current.addMetrics({ value: 'invalid' })
        result.current.addMetrics({ value: null })
        result.current.addMetrics({ value: 20 })
      })

      const stats = result.current.getStats('value')

      expect(stats.count).toBe(2)
      expect(stats.avg).toBe(15)
    })
  })

  describe('getTimeSeries()', () => {
    it('debe retornar serie temporal correcta', () => {
      const { result } = renderHook(() => useMetricsHistory('test-connection'))

      act(() => {
        result.current.addMetrics({ cpu: { usage: 10 } })
        result.current.addMetrics({ cpu: { usage: 20 } })
        result.current.addMetrics({ cpu: { usage: 30 } })
      })

      const series = result.current.getTimeSeries('cpu.usage')

      expect(series).toHaveLength(3)
      expect(series[0]).toMatchObject({ value: 10 })
      expect(series[1]).toMatchObject({ value: 20 })
      expect(series[2]).toMatchObject({ value: 30 })
      expect(series.every(s => typeof s.timestamp === 'number')).toBe(true)
    })

    it('debe filtrar por rango de tiempo', () => {
      const { result } = renderHook(() => useMetricsHistory('test-connection'))
      const now = Date.now()

      act(() => {
        vi.setSystemTime(now - 3000)
        result.current.addMetrics({ value: 10 })
        
        vi.setSystemTime(now - 1000)
        result.current.addMetrics({ value: 20 })
        
        vi.setSystemTime(now)
        result.current.addMetrics({ value: 30 })
      })

      const series = result.current.getTimeSeries('value', 2000)

      expect(series).toHaveLength(2)
      expect(series.map(s => s.value)).toEqual([20, 30])
    })
  })

  describe('exportToJSON()', () => {
    it('debe exportar a JSON válido', () => {
      const { result } = renderHook(() => useMetricsHistory('test-connection'))

      act(() => {
        result.current.addMetrics({ cpu: { usage: 50 } })
      })

      const json = result.current.exportToJSON()
      const parsed = JSON.parse(json)

      expect(Array.isArray(parsed)).toBe(true)
      expect(parsed[0]).toMatchObject({ cpu: { usage: 50 } })
    })

    it('debe incluir timestamps', () => {
      const { result } = renderHook(() => useMetricsHistory('test-connection'))

      act(() => {
        result.current.addMetrics({ cpu: { usage: 50 } })
      })

      const json = result.current.exportToJSON()
      const parsed = JSON.parse(json)

      expect(parsed[0].timestamp).toBeDefined()
      expect(typeof parsed[0].timestamp).toBe('number')
    })
  })

  describe('exportToCSV()', () => {
    it('debe exportar a CSV válido', () => {
      const { result } = renderHook(() => useMetricsHistory('test-connection'))

      act(() => {
        result.current.addMetrics({ cpu: 50, ram: 60 })
        result.current.addMetrics({ cpu: 55, ram: 65 })
      })

      const csv = result.current.exportToCSV()
      const lines = csv.split('\n')

      expect(lines.length).toBeGreaterThan(1)
      expect(lines[0]).toContain('cpu')
      expect(lines[0]).toContain('ram')
      expect(lines[0]).toContain('timestamp')
    })

    it('debe retornar string vacío para historial vacío', () => {
      const { result } = renderHook(() => useMetricsHistory('test-connection'))

      const csv = result.current.exportToCSV()

      expect(csv).toBe('')
    })
  })

  describe('Retención y límites', () => {
    it('debe respetar maxPoints', () => {
      const { result } = renderHook(() => 
        useMetricsHistory('test-connection', { maxPoints: 5 })
      )

      act(() => {
        for (let i = 0; i < 10; i++) {
          result.current.addMetrics({ value: i })
        }
      })

      expect(result.current.size).toBe(5)
      // Debe mantener los últimos 5
      expect(result.current.history[0].value).toBe(5)
      expect(result.current.history[4].value).toBe(9)
    })

    it('debe eliminar entradas antiguas según retention', () => {
      const { result } = renderHook(() => 
        useMetricsHistory('test-connection', { 
          retention: 1000, // 1 segundo
          maxPoints: 100 
        })
      )

      const now = Date.now()

      act(() => {
        vi.setSystemTime(now - 2000)
        result.current.addMetrics({ value: 1 })
        
        vi.setSystemTime(now - 500)
        result.current.addMetrics({ value: 2 })
        
        vi.setSystemTime(now)
        result.current.addMetrics({ value: 3 })
      })

      // Solo las últimas 2 deben quedar (dentro del retention de 1s)
      expect(result.current.size).toBe(2)
    })
  })

  describe('Persistencia automática', () => {
    it('debe guardar automáticamente en localStorage', () => {
      const { result } = renderHook(() => 
        useMetricsHistory('test-connection', { autoSave: true })
      )

      act(() => {
        result.current.addMetrics({ cpu: { usage: 50 } })
      })

      const stored = localStorage.getItem('pcmd.metrics.history.v1.test-connection')
      expect(stored).toBeTruthy()

      const parsed = JSON.parse(stored)
      expect(parsed[0]).toMatchObject({ cpu: { usage: 50 } })
    })

    it('no debe guardar si autoSave es false', () => {
      const { result } = renderHook(() => 
        useMetricsHistory('test-connection', { autoSave: false })
      )

      act(() => {
        result.current.addMetrics({ cpu: { usage: 50 } })
      })

      const stored = localStorage.getItem('pcmd.metrics.history.v1.test-connection')
      expect(stored).toBeNull()
    })
  })

  describe('Cambio de conexión', () => {
    it('debe cargar nuevo historial al cambiar connectionId', () => {
      localStorage.setItem(
        'pcmd.metrics.history.v1.connection-1',
        JSON.stringify([{ value: 1, timestamp: Date.now() }])
      )
      localStorage.setItem(
        'pcmd.metrics.history.v1.connection-2',
        JSON.stringify([{ value: 2, timestamp: Date.now() }, { value: 3, timestamp: Date.now() }])
      )

      const { result, rerender } = renderHook(
        ({ id }) => useMetricsHistory(id, { autoSave: false }),
        { initialProps: { id: 'connection-1' } }
      )

      expect(result.current.size).toBe(1)

      act(() => {
        rerender({ id: 'connection-2' })
      })

      expect(result.current.size).toBe(2)
    })
  })
})
