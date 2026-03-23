/**
 * Tests para Fase 1.1 - Conexión SSH
 * 
 * Verifica las funciones de conexión SSH del servicio Tauri
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { invoke } from '@tauri-apps/api/core'
import {
  sshConnect,
  sshDisconnect,
  sshTest,
  sshIsConnected,
  isTauri,
  _resetIsTauriCache
} from '../src/services/tauri.js'

describe('Fase 1.1 - Conexión SSH', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    _resetIsTauriCache()
  })

  describe('isTauri()', () => {
    it('debe retornar true cuando __TAURI_INTERNALS__ existe', () => {
      window.__TAURI_INTERNALS__ = {}
      expect(isTauri()).toBe(true)
    })

    it('debe retornar true cuando __TAURI__ existe', () => {
      const originalInternals = window.__TAURI_INTERNALS__
      window.__TAURI_INTERNALS__ = undefined
      window.__TAURI__ = {}
      _resetIsTauriCache()
      expect(isTauri()).toBe(true)
      // Restore
      window.__TAURI_INTERNALS__ = originalInternals
      window.__TAURI__ = undefined
    })

    it('debe retornar false cuando no hay Tauri', () => {
      const originalInternals = window.__TAURI_INTERNALS__
      const originalTauri = window.__TAURI__
      window.__TAURI_INTERNALS__ = undefined
      window.__TAURI__ = undefined
      _resetIsTauriCache()

      expect(isTauri()).toBe(false)

      // Restore
      window.__TAURI_INTERNALS__ = originalInternals
      window.__TAURI__ = originalTauri
    })
  })

  describe('sshConnect()', () => {
    it('debe llamar a invoke con los parámetros correctos', async () => {
      const mockConnection = {
        id: 'test-id',
        host: '192.168.1.100',
        port: 22,
        username: 'testuser',
        authType: 'password',
        password: 'testpass',
        keyPath: null,
      }

      invoke.mockResolvedValue({ id: 'test-id', connected: true })

      await sshConnect(mockConnection)

      expect(invoke).toHaveBeenCalledWith('ssh_connect', {
        id: 'test-id',
        host: '192.168.1.100',
        port: 22,
        username: 'testuser',
        authType: 'password',
        password: 'testpass',
        keyPath: null,
      })
    })

    it('debe usar puerto 22 por defecto si no se especifica', async () => {
      const mockConnection = {
        id: 'test-id',
        host: '192.168.1.100',
        username: 'testuser',
      }

      invoke.mockResolvedValue({ id: 'test-id', connected: true })

      await sshConnect(mockConnection)

      expect(invoke).toHaveBeenCalledWith('ssh_connect', expect.objectContaining({
        port: 22,
      }))
    })

    it('debe usar authType password por defecto', async () => {
      const mockConnection = {
        id: 'test-id',
        host: '192.168.1.100',
        username: 'testuser',
      }

      invoke.mockResolvedValue({ id: 'test-id', connected: true })

      await sshConnect(mockConnection)

      expect(invoke).toHaveBeenCalledWith('ssh_connect', expect.objectContaining({
        authType: 'password',
      }))
    })

    it('debe manejar errores de conexión', async () => {
      const mockConnection = {
        id: 'test-id',
        host: 'invalid-host',
        username: 'testuser',
      }

      invoke.mockRejectedValue(new Error('Connection failed'))

      await expect(sshConnect(mockConnection)).rejects.toThrow('Connection failed')
    })
  })

  describe('sshDisconnect()', () => {
    it('debe llamar a invoke con connectionId', async () => {
      invoke.mockResolvedValue(undefined)

      await sshDisconnect('test-connection-id')

      expect(invoke).toHaveBeenCalledWith('ssh_disconnect', {
        connectionId: 'test-connection-id',
      })
    })
  })

  describe('sshTest()', () => {
    it('debe llamar a invoke con los parámetros de prueba', async () => {
      const mockConnection = {
        id: 'test-id',
        host: '192.168.1.100',
        port: 22,
        username: 'testuser',
        authType: 'password',
        password: 'testpass',
      }

      invoke.mockResolvedValue({ id: 'test-id', connected: true })

      await sshTest(mockConnection)

      expect(invoke).toHaveBeenCalledWith('ssh_test', expect.objectContaining({
        host: '192.168.1.100',
        username: 'testuser',
      }))
    })

    it('debe generar un ID si no se proporciona', async () => {
      const mockConnection = {
        host: '192.168.1.100',
        username: 'testuser',
      }

      invoke.mockResolvedValue({ connected: true })

      await sshTest(mockConnection)

      expect(invoke).toHaveBeenCalledWith('ssh_test', expect.objectContaining({
        id: expect.any(String),
      }))
    })
  })

  describe('sshIsConnected()', () => {
    it('debe retornar true cuando está conectado', async () => {
      invoke.mockResolvedValue(true)

      const result = await sshIsConnected('test-id')

      expect(result).toBe(true)
      expect(invoke).toHaveBeenCalledWith('ssh_is_connected', {
        connectionId: 'test-id',
      })
    })

    it('debe retornar false cuando no está conectado', async () => {
      invoke.mockResolvedValue(false)

      const result = await sshIsConnected('test-id')

      expect(result).toBe(false)
    })
  })
})
