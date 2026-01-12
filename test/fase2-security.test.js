/**
 * Tests para Fase 2.1 - Almacenamiento Seguro
 * 
 * Verifica las funciones de almacenamiento seguro de credenciales
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { invoke } from '@tauri-apps/api/core'
import { 
  secureStorageSave,
  secureStorageLoad,
  secureStorageDelete,
  secureStorageGet,
} from '../src/services/tauri.js'

describe('Fase 2.1 - Almacenamiento Seguro', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('secureStorageSave()', () => {
    it('debe llamar a invoke con todos los campos de conexion', async () => {
      const connection = {
        id: 'conn-123',
        name: 'Production Server',
        host: '192.168.1.100',
        port: 22,
        username: 'admin',
        authType: 'password',
        password: 'secret123',
        keyPath: null,
        notes: 'Main production server',
        isFavorite: true,
        isDefault: false,
        status: 'connected',
        updatedAt: '2024-01-01T00:00:00.000Z',
      }

      invoke.mockResolvedValue({ success: true })

      await secureStorageSave(connection)

      expect(invoke).toHaveBeenCalledWith('secure_save_connection', {
        connection: {
          id: 'conn-123',
          name: 'Production Server',
          host: '192.168.1.100',
          port: 22,
          username: 'admin',
          authType: 'password',
          password: 'secret123',
          keyPath: null,
          notes: 'Main production server',
          isFavorite: true,
          isDefault: false,
          status: 'connected',
          updatedAt: '2024-01-01T00:00:00.000Z',
        }
      })
    })

    it('debe usar valores por defecto para campos opcionales', async () => {
      const connection = {
        id: 'conn-123',
        name: 'Test Server',
        host: '192.168.1.100',
        username: 'admin',
      }

      invoke.mockResolvedValue({ success: true })

      await secureStorageSave(connection)

      expect(invoke).toHaveBeenCalledWith('secure_save_connection', {
        connection: expect.objectContaining({
          port: 22,
          authType: 'password',
          password: null,
          keyPath: null,
          notes: '',
          isFavorite: false,
          isDefault: false,
          status: 'unknown',
        })
      })
    })

    it('debe generar updatedAt si no se proporciona', async () => {
      const connection = {
        id: 'conn-123',
        name: 'Test Server',
        host: '192.168.1.100',
        username: 'admin',
      }

      invoke.mockResolvedValue({ success: true })

      await secureStorageSave(connection)

      const callArgs = invoke.mock.calls[0][1]
      expect(callArgs.connection.updatedAt).toBeDefined()
      expect(typeof callArgs.connection.updatedAt).toBe('string')
      // Should be a valid ISO date string
      expect(new Date(callArgs.connection.updatedAt).toISOString()).toBe(callArgs.connection.updatedAt)
    })

    it('debe soportar autenticacion por clave', async () => {
      const connection = {
        id: 'conn-123',
        name: 'SSH Key Server',
        host: '192.168.1.100',
        username: 'admin',
        authType: 'key',
        keyPath: '/home/user/.ssh/id_rsa',
      }

      invoke.mockResolvedValue({ success: true })

      await secureStorageSave(connection)

      expect(invoke).toHaveBeenCalledWith('secure_save_connection', {
        connection: expect.objectContaining({
          authType: 'key',
          keyPath: '/home/user/.ssh/id_rsa',
        })
      })
    })

    it('debe propagar errores del backend', async () => {
      invoke.mockRejectedValue(new Error('Encryption failed'))

      await expect(secureStorageSave({ id: '1', name: 'Test', host: 'test', username: 'test' }))
        .rejects.toThrow('Encryption failed')
    })
  })

  describe('secureStorageLoad()', () => {
    it('debe llamar a invoke sin parametros', async () => {
      const mockConnections = [
        { id: 'conn-1', name: 'Server 1', host: '192.168.1.1', username: 'admin' },
        { id: 'conn-2', name: 'Server 2', host: '192.168.1.2', username: 'root' },
      ]
      invoke.mockResolvedValue(mockConnections)

      const result = await secureStorageLoad()

      expect(invoke).toHaveBeenCalledWith('secure_load_connections')
      expect(result).toEqual(mockConnections)
    })

    it('debe retornar array vacio si no hay conexiones', async () => {
      invoke.mockResolvedValue([])

      const result = await secureStorageLoad()

      expect(result).toEqual([])
    })

    it('debe propagar errores del backend', async () => {
      invoke.mockRejectedValue(new Error('Decryption failed'))

      await expect(secureStorageLoad()).rejects.toThrow('Decryption failed')
    })
  })

  describe('secureStorageDelete()', () => {
    it('debe llamar a invoke con connectionId', async () => {
      invoke.mockResolvedValue({ success: true })

      await secureStorageDelete('conn-123')

      expect(invoke).toHaveBeenCalledWith('secure_delete_connection', {
        connectionId: 'conn-123',
      })
    })

    it('debe propagar errores del backend', async () => {
      invoke.mockRejectedValue(new Error('Connection not found'))

      await expect(secureStorageDelete('invalid-id')).rejects.toThrow('Connection not found')
    })
  })

  describe('secureStorageGet()', () => {
    it('debe llamar a invoke con connectionId', async () => {
      const mockConnection = {
        id: 'conn-123',
        name: 'Server 1',
        host: '192.168.1.1',
        username: 'admin',
        password: 'decrypted-password',
      }
      invoke.mockResolvedValue(mockConnection)

      const result = await secureStorageGet('conn-123')

      expect(invoke).toHaveBeenCalledWith('secure_get_connection', {
        connectionId: 'conn-123',
      })
      expect(result).toEqual(mockConnection)
    })

    it('debe retornar null si conexion no existe', async () => {
      invoke.mockResolvedValue(null)

      const result = await secureStorageGet('non-existent')

      expect(result).toBeNull()
    })

    it('debe propagar errores del backend', async () => {
      invoke.mockRejectedValue(new Error('Decryption failed'))

      await expect(secureStorageGet('conn-123')).rejects.toThrow('Decryption failed')
    })
  })

  describe('Secure Storage Flow', () => {
    it('debe poder guardar, obtener y eliminar una conexion', async () => {
      const connection = {
        id: 'flow-test-123',
        name: 'Flow Test Server',
        host: '10.0.0.1',
        username: 'testuser',
        password: 'testpass123',
      }

      // Save
      invoke.mockResolvedValue({ success: true })
      await secureStorageSave(connection)
      expect(invoke).toHaveBeenCalledWith('secure_save_connection', expect.any(Object))

      // Get
      invoke.mockResolvedValue({ ...connection, password: 'testpass123' })
      const retrieved = await secureStorageGet('flow-test-123')
      expect(retrieved.password).toBe('testpass123')

      // Delete
      invoke.mockResolvedValue({ success: true })
      await secureStorageDelete('flow-test-123')
      expect(invoke).toHaveBeenCalledWith('secure_delete_connection', { connectionId: 'flow-test-123' })
    })

    it('debe poder cargar multiples conexiones', async () => {
      const mockConnections = [
        { id: '1', name: 'Server 1', host: '192.168.1.1', username: 'user1' },
        { id: '2', name: 'Server 2', host: '192.168.1.2', username: 'user2' },
        { id: '3', name: 'Server 3', host: '192.168.1.3', username: 'user3' },
      ]
      invoke.mockResolvedValue(mockConnections)

      const result = await secureStorageLoad()

      expect(result).toHaveLength(3)
      expect(result[0].name).toBe('Server 1')
      expect(result[2].name).toBe('Server 3')
    })
  })
})
