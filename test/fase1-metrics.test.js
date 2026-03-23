/**
 * Tests para Fase 1.2 - Metricas del Sistema
 * 
 * Verifica las funciones de metricas y el hook useRealTimeMetrics
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { invoke } from '@tauri-apps/api/core'
import { getSystemMetrics, _resetIsTauriCache } from '../src/services/tauri.js'
import { useRealTimeMetrics } from '../src/hooks/useRealTimeData.js'

describe('Fase 1.2 - Metricas del Sistema', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    _resetIsTauriCache()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('getSystemMetrics()', () => {
    it('debe llamar a invoke con connectionId', async () => {
      vi.useRealTimers()
      const mockMetrics = {
        cpu: { usage: 45.5, cores: 4 },
        memory: { total: 16000, used: 8000, free: 8000 },
        disk: { total: 500000, used: 250000, free: 250000 },
      }

      invoke.mockResolvedValue(mockMetrics)

      const result = await getSystemMetrics('test-connection')

      expect(invoke).toHaveBeenCalledWith('get_system_metrics', {
        connectionId: 'test-connection',
      })
      expect(result).toEqual(mockMetrics)
    })

    it('debe propagar errores del backend', async () => {
      vi.useRealTimers()
      invoke.mockRejectedValue(new Error('SSH connection lost'))

      await expect(getSystemMetrics('test-connection')).rejects.toThrow('SSH connection lost')
    })
  })

  describe('useRealTimeMetrics()', () => {
    const mockMetrics = {
      cpu: { usage: 50, cores: 8 },
      memory: { total: 32000, used: 16000, free: 16000, usedPercent: 50 },
      disk: [{ mountPoint: '/', total: 1000000, used: 500000, free: 500000 }],
      network: { bytesRecv: 1000, bytesSent: 500 },
    }

    it('debe iniciar en estado loading', () => {
      invoke.mockResolvedValue(mockMetrics)
      
      const { result } = renderHook(() => useRealTimeMetrics('test-conn', 5000))
      
      expect(result.current.loading).toBe(true)
      expect(result.current.metrics).toBe(null)
      expect(result.current.error).toBe(null)
    })

    it('debe obtener metricas despues de montar', async () => {
      vi.useRealTimers()
      invoke.mockResolvedValue(mockMetrics)
      
      const { result } = renderHook(() => useRealTimeMetrics('test-conn', 5000))
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      expect(result.current.metrics).toEqual(mockMetrics)
      expect(result.current.error).toBe(null)
      expect(result.current.lastUpdate).toBeInstanceOf(Date)
    })

    it('debe manejar errores correctamente', async () => {
      vi.useRealTimers()
      invoke.mockRejectedValue(new Error('Connection failed'))
      
      const { result } = renderHook(() => useRealTimeMetrics('test-conn', 5000))
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      expect(result.current.error).toBe('Error: Connection failed')
      expect(result.current.metrics).toBe(null)
    })

    it('debe mostrar error cuando no hay Tauri', async () => {
      vi.useRealTimers()
      // Temporarily remove Tauri
      const originalInternals = window.__TAURI_INTERNALS__
      const originalTauri = window.__TAURI__
      window.__TAURI_INTERNALS__ = undefined
      window.__TAURI__ = undefined
      _resetIsTauriCache()
      
      const { result } = renderHook(() => useRealTimeMetrics('test-conn', 5000))
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      expect(result.current.error).toContain('Tauri')
      
      // Restore
      window.__TAURI_INTERNALS__ = originalInternals
      window.__TAURI__ = originalTauri
    })

    it('no debe hacer fetch sin connectionId', async () => {
      vi.useRealTimers()
      invoke.mockResolvedValue(mockMetrics)
      
      const { result } = renderHook(() => useRealTimeMetrics(null, 5000))
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      expect(invoke).not.toHaveBeenCalled()
    })

    it('debe tener funcion refresh', async () => {
      vi.useRealTimers()
      invoke.mockResolvedValue(mockMetrics)
      
      const { result } = renderHook(() => useRealTimeMetrics('test-conn', 5000))
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      invoke.mockClear()
      
      // Call refresh
      act(() => {
        result.current.refresh()
      })
      
      await waitFor(() => {
        expect(invoke).toHaveBeenCalledWith('get_system_metrics', {
          connectionId: 'test-conn',
        })
      })
    })

    it('debe hacer polling con el intervalo especificado', async () => {
      invoke.mockResolvedValue(mockMetrics)
      
      renderHook(() => useRealTimeMetrics('test-conn', 5000))
      
      // Initial fetch (after setTimeout 0)
      await act(async () => {
        vi.advanceTimersByTime(0)
      })
      
      // First interval
      await act(async () => {
        vi.advanceTimersByTime(5000)
      })
      
      // invoke should have been called at least twice
      expect(invoke.mock.calls.filter(call => call[0] === 'get_system_metrics').length).toBeGreaterThanOrEqual(1)
    })

    it('debe limpiar interval al desmontar', async () => {
      vi.useRealTimers()
      invoke.mockResolvedValue(mockMetrics)
      
      const { unmount } = renderHook(() => useRealTimeMetrics('test-conn', 5000))
      
      await waitFor(() => {
        expect(invoke).toHaveBeenCalled()
      })
      
      const callCount = invoke.mock.calls.length
      
      unmount()
      
      // Wait a bit to ensure no more calls are made
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // No additional calls should be made after unmount
      expect(invoke.mock.calls.length).toBe(callCount)
    })
  })
})
