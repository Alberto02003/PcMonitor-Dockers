/**
 * Tests para hooks de Fase 3
 * 
 * Verifica useConnections y useConnectionStatus
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { invoke } from '@tauri-apps/api/core'
import {
  normalizeConnection,
  connectionToFormData,
  emptyConnectionForm,
} from '../src/hooks/useConnections.js'
import {
  useConnectionStatus,
  CONNECTION_STATUS,
} from '../src/hooks/useConnectionStatus.js'

describe('Fase 3 - Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  describe('useConnections utilities', () => {
    describe('normalizeConnection()', () => {
      it('debe normalizar una conexion completa', () => {
        const raw = {
          id: 'test-id',
          name: 'My Server',
          host: '192.168.1.1',
          port: 22,
          username: 'admin',
          authType: 'password',
          password: 'secret',
          keyPath: '',
          notes: 'Test notes',
          isFavorite: true,
          isDefault: false,
          status: 'online',
          updatedAt: '2024-01-01T00:00:00Z',
        }

        const result = normalizeConnection(raw)

        expect(result).toEqual(raw)
      })

      it('debe asignar valores por defecto', () => {
        const raw = {
          name: 'Server',
          host: '10.0.0.1',
          username: 'root',
        }

        const result = normalizeConnection(raw)

        expect(result.id).toBeDefined()
        expect(result.port).toBe(22)
        expect(result.authType).toBe('password')
        expect(result.password).toBe('')
        expect(result.keyPath).toBe('')
        expect(result.notes).toBe('')
        expect(result.isFavorite).toBe(false)
        expect(result.isDefault).toBe(false)
        expect(result.status).toBe('unknown')
        expect(result.updatedAt).toBeDefined()
      })

      it('debe limpiar credenciales si storeCredentials es false', () => {
        const raw = {
          name: 'Server',
          host: '10.0.0.1',
          username: 'root',
          password: 'secret123',
          keyPath: '/path/to/key',
        }

        const result = normalizeConnection(raw, { storeCredentials: false })

        expect(result.password).toBe('')
        expect(result.keyPath).toBe('')
      })

      it('debe convertir port string a numero', () => {
        const raw = {
          name: 'Server',
          host: '10.0.0.1',
          port: '8022',
          username: 'root',
        }

        const result = normalizeConnection(raw)

        expect(result.port).toBe(8022)
      })

      it('debe normalizar authType a password o key', () => {
        expect(normalizeConnection({ authType: 'key' }).authType).toBe('key')
        expect(normalizeConnection({ authType: 'password' }).authType).toBe('password')
        expect(normalizeConnection({ authType: 'invalid' }).authType).toBe('password')
        expect(normalizeConnection({}).authType).toBe('password')
      })
    })

    describe('connectionToFormData()', () => {
      it('debe convertir conexion a datos de formulario', () => {
        const connection = {
          name: 'Server',
          host: '192.168.1.1',
          port: 22,
          username: 'admin',
          authType: 'password',
          password: 'secret',
          keyPath: '',
          notes: 'Notes here',
        }

        const result = connectionToFormData(connection)

        expect(result).toEqual({
          name: 'Server',
          host: '192.168.1.1',
          port: '22',
          username: 'admin',
          authType: 'password',
          password: 'secret',
          keyPath: '',
          notes: 'Notes here',
        })
      })

      it('debe retornar formulario vacio para null', () => {
        expect(connectionToFormData(null)).toEqual(emptyConnectionForm)
      })

      it('debe convertir port a string', () => {
        const connection = { port: 8080 }
        const result = connectionToFormData(connection)
        expect(result.port).toBe('8080')
      })
    })

    describe('emptyConnectionForm', () => {
      it('debe tener todos los campos requeridos', () => {
        expect(emptyConnectionForm).toEqual({
          name: '',
          host: '',
          port: '22',
          username: '',
          authType: 'password',
          password: '',
          keyPath: '',
          notes: '',
        })
      })
    })
  })

  describe('useConnectionStatus', () => {
    describe('estado inicial', () => {
      it('debe iniciar con valores por defecto', () => {
        const { result } = renderHook(() => useConnectionStatus())

        expect(result.current.isConnecting).toBe(false)
        expect(result.current.isTesting).toBe(false)
        expect(result.current.activeConnectionId).toBe(null)
        expect(result.current.isLoading).toBe(false)
      })
    })

    describe('connect()', () => {
      it('debe llamar a sshConnect y actualizar estado', async () => {
        invoke.mockResolvedValue({ connected: true })
        const onStatusChange = vi.fn()
        const onConnect = vi.fn()

        const { result } = renderHook(() =>
          useConnectionStatus({ onStatusChange, onConnect })
        )

        const connection = {
          id: 'test-id',
          host: '192.168.1.1',
          username: 'admin',
        }

        let connectResult
        await act(async () => {
          connectResult = await result.current.connect(connection)
        })

        expect(connectResult).toBe(true)
        expect(onStatusChange).toHaveBeenCalledWith('test-id', CONNECTION_STATUS.CHECKING)
        expect(onStatusChange).toHaveBeenCalledWith('test-id', CONNECTION_STATUS.ONLINE)
        expect(onConnect).toHaveBeenCalledWith(connection)
      })

      it('debe manejar errores de conexion', async () => {
        invoke.mockRejectedValue(new Error('Connection refused'))
        const onStatusChange = vi.fn()
        const onError = vi.fn()

        const { result } = renderHook(() =>
          useConnectionStatus({ onStatusChange, onError })
        )

        let connectResult
        await act(async () => {
          connectResult = await result.current.connect({ id: 'test-id' })
        })

        expect(connectResult).toBe(false)
        expect(onStatusChange).toHaveBeenCalledWith('test-id', CONNECTION_STATUS.OFFLINE)
        expect(onError).toHaveBeenCalled()
      })

      it('debe retornar false para conexion null', async () => {
        const { result } = renderHook(() => useConnectionStatus())

        let connectResult
        await act(async () => {
          connectResult = await result.current.connect(null)
        })

        expect(connectResult).toBe(false)
      })
    })

    describe('testConnection()', () => {
      it('debe llamar a sshTest con los datos correctos', async () => {
        invoke.mockResolvedValue({ success: true })
        const onStatusChange = vi.fn()

        const { result } = renderHook(() =>
          useConnectionStatus({ onStatusChange })
        )

        const formData = {
          host: '192.168.1.1',
          port: '22',
          username: 'admin',
          authType: 'password',
          password: 'secret',
        }

        await act(async () => {
          await result.current.testConnection(formData, 'existing-id')
        })

        expect(invoke).toHaveBeenCalledWith('ssh_test', expect.objectContaining({
          host: '192.168.1.1',
          port: 22,
          username: 'admin',
        }))
        expect(onStatusChange).toHaveBeenCalledWith('existing-id', CONNECTION_STATUS.ONLINE)
      })

      it('debe generar ID si no existe', async () => {
        invoke.mockResolvedValue({ success: true })

        const { result } = renderHook(() => useConnectionStatus())

        await act(async () => {
          await result.current.testConnection({ host: 'test', username: 'test' })
        })

        expect(invoke).toHaveBeenCalledWith('ssh_test', expect.objectContaining({
          id: expect.any(String),
        }))
      })
    })

    describe('disconnect()', () => {
      it('debe llamar a sshDisconnect', async () => {
        invoke.mockResolvedValue(undefined)
        const onStatusChange = vi.fn()

        const { result } = renderHook(() =>
          useConnectionStatus({ onStatusChange })
        )

        await act(async () => {
          await result.current.disconnect('test-id')
        })

        expect(invoke).toHaveBeenCalledWith('ssh_disconnect', {
          connectionId: 'test-id',
        })
        expect(onStatusChange).toHaveBeenCalledWith('test-id', CONNECTION_STATUS.UNKNOWN)
      })

      it('no debe hacer nada si connectionId es null', async () => {
        const { result } = renderHook(() => useConnectionStatus())

        await act(async () => {
          await result.current.disconnect(null)
        })

        expect(invoke).not.toHaveBeenCalled()
      })
    })

    describe('cancel()', () => {
      it('debe resetear estados de loading', () => {
        const { result } = renderHook(() => useConnectionStatus())

        act(() => {
          result.current.cancel()
        })

        expect(result.current.isConnecting).toBe(false)
        expect(result.current.isTesting).toBe(false)
      })
    })
  })

  describe('CONNECTION_STATUS', () => {
    it('debe exportar todos los estados', () => {
      expect(CONNECTION_STATUS.UNKNOWN).toBe('unknown')
      expect(CONNECTION_STATUS.CHECKING).toBe('checking')
      expect(CONNECTION_STATUS.ONLINE).toBe('online')
      expect(CONNECTION_STATUS.OFFLINE).toBe('offline')
    })
  })
})
