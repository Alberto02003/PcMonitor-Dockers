/**
 * Tests para Fase 1.2 - Metricas del Sistema
 * 
 * Verifica las funciones de metricas del sistema
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { invoke } from '@tauri-apps/api/core'
import { getSystemMetrics, _resetIsTauriCache } from '../src/services/tauri.js'

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

})
