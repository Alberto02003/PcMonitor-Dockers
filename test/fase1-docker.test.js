/**
 * Tests para Fase 1.3 - Control Docker
 * 
 * Verifica las funciones de Docker y el hook useRealTimeContainers
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { invoke } from '@tauri-apps/api/core'
import { 
  dockerList,
  dockerStart,
  dockerStop,
  dockerRestart,
  dockerLogs,
  dockerImages,
  dockerVolumes,
  dockerInfo,
} from '../src/services/tauri.js'
import { useRealTimeContainers, useRealTimeLogs } from '../src/hooks/useRealTimeData.js'

describe('Fase 1.3 - Control Docker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Docker Service Functions', () => {
    describe('dockerList()', () => {
      it('debe llamar a invoke con connectionId y all=false por defecto', async () => {
        const mockContainers = [
          { id: 'abc123', name: 'nginx', state: 'running', status: 'Up 2 hours' },
          { id: 'def456', name: 'postgres', state: 'running', status: 'Up 1 day' },
        ]
        invoke.mockResolvedValue(mockContainers)

        const result = await dockerList('conn-id')

        expect(invoke).toHaveBeenCalledWith('docker_list', {
          connectionId: 'conn-id',
          all: false,
        })
        expect(result).toEqual(mockContainers)
      })

      it('debe pasar all=true cuando se especifica', async () => {
        invoke.mockResolvedValue([])

        await dockerList('conn-id', true)

        expect(invoke).toHaveBeenCalledWith('docker_list', {
          connectionId: 'conn-id',
          all: true,
        })
      })
    })

    describe('dockerStart()', () => {
      it('debe llamar a invoke con connectionId y containerId', async () => {
        invoke.mockResolvedValue({ success: true })

        await dockerStart('conn-id', 'container-123')

        expect(invoke).toHaveBeenCalledWith('docker_start', {
          connectionId: 'conn-id',
          containerId: 'container-123',
        })
      })
    })

    describe('dockerStop()', () => {
      it('debe llamar a invoke con connectionId y containerId', async () => {
        invoke.mockResolvedValue({ success: true })

        await dockerStop('conn-id', 'container-123')

        expect(invoke).toHaveBeenCalledWith('docker_stop', {
          connectionId: 'conn-id',
          containerId: 'container-123',
        })
      })
    })

    describe('dockerRestart()', () => {
      it('debe llamar a invoke con connectionId y containerId', async () => {
        invoke.mockResolvedValue({ success: true })

        await dockerRestart('conn-id', 'container-123')

        expect(invoke).toHaveBeenCalledWith('docker_restart', {
          connectionId: 'conn-id',
          containerId: 'container-123',
        })
      })
    })

    describe('dockerLogs()', () => {
      it('debe llamar a invoke con tail=100 por defecto', async () => {
        const mockLogs = ['log line 1', 'log line 2', 'log line 3']
        invoke.mockResolvedValue(mockLogs)

        const result = await dockerLogs('conn-id', 'container-123')

        expect(invoke).toHaveBeenCalledWith('docker_logs', {
          connectionId: 'conn-id',
          containerId: 'container-123',
          tail: 100,
        })
        expect(result).toEqual(mockLogs)
      })

      it('debe aceptar tail personalizado', async () => {
        invoke.mockResolvedValue([])

        await dockerLogs('conn-id', 'container-123', 500)

        expect(invoke).toHaveBeenCalledWith('docker_logs', {
          connectionId: 'conn-id',
          containerId: 'container-123',
          tail: 500,
        })
      })
    })

    describe('dockerImages()', () => {
      it('debe llamar a invoke con connectionId', async () => {
        const mockImages = [
          { id: 'img1', repository: 'nginx', tag: 'latest', size: 140000000 },
        ]
        invoke.mockResolvedValue(mockImages)

        const result = await dockerImages('conn-id')

        expect(invoke).toHaveBeenCalledWith('docker_images', {
          connectionId: 'conn-id',
        })
        expect(result).toEqual(mockImages)
      })
    })

    describe('dockerVolumes()', () => {
      it('debe llamar a invoke con connectionId', async () => {
        const mockVolumes = [
          { name: 'data_volume', driver: 'local', mountpoint: '/var/lib/docker/volumes/data_volume' },
        ]
        invoke.mockResolvedValue(mockVolumes)

        const result = await dockerVolumes('conn-id')

        expect(invoke).toHaveBeenCalledWith('docker_volumes', {
          connectionId: 'conn-id',
        })
        expect(result).toEqual(mockVolumes)
      })
    })

    describe('dockerInfo()', () => {
      it('debe llamar a invoke con connectionId', async () => {
        const mockInfo = {
          containers: 10,
          containersRunning: 5,
          containersPaused: 0,
          containersStopped: 5,
          images: 20,
          serverVersion: '24.0.5',
        }
        invoke.mockResolvedValue(mockInfo)

        const result = await dockerInfo('conn-id')

        expect(invoke).toHaveBeenCalledWith('docker_info', {
          connectionId: 'conn-id',
        })
        expect(result).toEqual(mockInfo)
      })
    })
  })

  describe('useRealTimeContainers()', () => {
    const mockContainers = [
      { id: 'abc123', name: 'nginx', state: 'running', status: 'Up 2 hours' },
      { id: 'def456', name: 'postgres', state: 'exited', status: 'Exited (0) 5 minutes ago' },
    ]

    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('debe iniciar en estado loading con array vacio', () => {
      invoke.mockResolvedValue(mockContainers)
      
      const { result } = renderHook(() => useRealTimeContainers('test-conn', 5000))
      
      expect(result.current.loading).toBe(true)
      expect(result.current.containers).toEqual([])
      expect(result.current.error).toBe(null)
    })

    it('debe obtener contenedores despues de montar', async () => {
      vi.useRealTimers()
      invoke.mockResolvedValue(mockContainers)
      
      const { result } = renderHook(() => useRealTimeContainers('test-conn', 5000))
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      expect(result.current.containers).toEqual(mockContainers)
      expect(result.current.error).toBe(null)
    })

    it('debe manejar errores correctamente', async () => {
      vi.useRealTimers()
      invoke.mockRejectedValue(new Error('Docker not available'))
      
      const { result } = renderHook(() => useRealTimeContainers('test-conn', 5000))
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      expect(result.current.error).toBe('Error: Docker not available')
      expect(result.current.containers).toEqual([])
    })

    it('no debe hacer fetch sin connectionId', async () => {
      vi.useRealTimers()
      invoke.mockResolvedValue(mockContainers)
      
      const { result } = renderHook(() => useRealTimeContainers(null, 5000))
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      expect(invoke).not.toHaveBeenCalled()
    })

    it('debe tener funcion refresh', async () => {
      vi.useRealTimers()
      invoke.mockResolvedValue(mockContainers)
      
      const { result } = renderHook(() => useRealTimeContainers('test-conn', 5000))
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      invoke.mockClear()
      
      act(() => {
        result.current.refresh()
      })
      
      await waitFor(() => {
        expect(invoke).toHaveBeenCalledWith('docker_list', {
          connectionId: 'test-conn',
          all: true,
        })
      })
    })

    it('debe llamar a dockerList con all=true', async () => {
      vi.useRealTimers()
      invoke.mockResolvedValue(mockContainers)
      
      renderHook(() => useRealTimeContainers('test-conn', 5000))
      
      await waitFor(() => {
        expect(invoke).toHaveBeenCalledWith('docker_list', {
          connectionId: 'test-conn',
          all: true,
        })
      })
    })
  })

  describe('useRealTimeLogs()', () => {
    const mockLogs = [
      '2024-01-01 10:00:00 Starting server...',
      '2024-01-01 10:00:01 Server started on port 80',
      '2024-01-01 10:00:05 Connection received',
    ]

    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('debe iniciar con logs vacios', () => {
      invoke.mockResolvedValue(mockLogs)
      
      const { result } = renderHook(() => useRealTimeLogs('test-conn', 'container-1', 1000))
      
      expect(result.current.logs).toEqual([])
      expect(result.current.error).toBe(null)
    })

    it('debe obtener logs despues de montar', async () => {
      vi.useRealTimers()
      invoke.mockResolvedValue(mockLogs)
      
      const { result } = renderHook(() => useRealTimeLogs('test-conn', 'container-1', 1000))
      
      await waitFor(() => {
        expect(result.current.logs).toEqual(mockLogs)
      })
      
      expect(result.current.error).toBe(null)
    })

    it('no debe hacer fetch sin containerId', async () => {
      vi.useRealTimers()
      invoke.mockResolvedValue(mockLogs)
      
      renderHook(() => useRealTimeLogs('test-conn', null, 1000))
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(invoke).not.toHaveBeenCalled()
    })

    it('no debe hacer fetch sin connectionId', async () => {
      vi.useRealTimers()
      invoke.mockResolvedValue(mockLogs)
      
      renderHook(() => useRealTimeLogs(null, 'container-1', 1000))
      
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(invoke).not.toHaveBeenCalled()
    })

    it('debe tener funcion clearLogs', async () => {
      vi.useRealTimers()
      invoke.mockResolvedValue(mockLogs)
      
      const { result } = renderHook(() => useRealTimeLogs('test-conn', 'container-1', 1000))
      
      await waitFor(() => {
        expect(result.current.logs).toEqual(mockLogs)
      })
      
      act(() => {
        result.current.clearLogs()
      })
      
      expect(result.current.logs).toEqual([])
    })

    it('debe llamar a dockerLogs con tail=200', async () => {
      vi.useRealTimers()
      invoke.mockResolvedValue(mockLogs)
      
      renderHook(() => useRealTimeLogs('test-conn', 'container-1', 1000))
      
      await waitFor(() => {
        expect(invoke).toHaveBeenCalledWith('docker_logs', {
          connectionId: 'test-conn',
          containerId: 'container-1',
          tail: 200,
        })
      })
    })
  })
})
