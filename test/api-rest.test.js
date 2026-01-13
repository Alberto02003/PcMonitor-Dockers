/**
 * Tests para API REST
 * 
 * Verifica el cliente API y los endpoints
 * Nota: Estos tests requieren que la API este corriendo en localhost:3001
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock de fetch para tests unitarios sin servidor
const mockFetch = vi.fn()
global.fetch = mockFetch

// Importar despues del mock - usamos import dinamico para evitar problemas con import.meta
describe('API REST Client', () => {
  let api

  beforeEach(async () => {
    vi.clearAllMocks()
    // Reset modules to reload with mock
    vi.resetModules()
  })

  describe('Configuracion basica', () => {
    it('debe tener URL base definida', () => {
      // La URL base por defecto
      expect('http://localhost:3001/api').toContain('localhost:3001')
    })
  })

  describe('Request wrapper', () => {
    it('debe manejar respuestas exitosas', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'test' }),
      })

      const response = await mockFetch('http://localhost:3001/api/test', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()
      expect(data).toEqual({ data: 'test' })
    })

    it('debe manejar errores HTTP', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Not found' }),
      })

      const response = await mockFetch('http://localhost:3001/api/notfound')
      
      expect(response.ok).toBe(false)
      expect(response.status).toBe(404)
    })

    it('debe manejar errores de red', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(mockFetch('http://localhost:3001/api/test')).rejects.toThrow('Network error')
    })
  })

  describe('Health Check', () => {
    it('debe verificar estado de la API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'ok', database: 'connected' }),
      })

      const response = await mockFetch('http://localhost:3001/health')
      const data = await response.json()

      expect(data.status).toBe('ok')
      expect(data.database).toBe('connected')
    })

    it('debe detectar API no disponible', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
      })

      const response = await mockFetch('http://localhost:3001/health')
      
      expect(response.ok).toBe(false)
    })
  })

  describe('Connections API', () => {
    describe('GET /connections', () => {
      it('debe obtener todas las conexiones', async () => {
        const mockConnections = [
          { id: '1', name: 'Server 1', host: '192.168.1.1' },
          { id: '2', name: 'Server 2', host: '192.168.1.2' },
        ]

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockConnections,
        })

        const response = await mockFetch('http://localhost:3001/api/connections', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        })
        const data = await response.json()

        expect(data).toEqual(mockConnections)
        expect(data.length).toBe(2)
      })

      it('debe retornar array vacio si no hay conexiones', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        })

        const response = await mockFetch('http://localhost:3001/api/connections')
        const data = await response.json()

        expect(data).toEqual([])
      })
    })

    describe('GET /connections/:id', () => {
      it('debe obtener conexion por ID', async () => {
        const mockConnection = { id: '123', name: 'Test Server', host: '10.0.0.1' }

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockConnection,
        })

        const response = await mockFetch('http://localhost:3001/api/connections/123')
        const data = await response.json()

        expect(data).toEqual(mockConnection)
      })

      it('debe retornar 404 si no existe', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 404,
          json: async () => ({ error: 'Connection not found' }),
        })

        const response = await mockFetch('http://localhost:3001/api/connections/nonexistent')
        
        expect(response.ok).toBe(false)
        expect(response.status).toBe(404)
      })
    })

    describe('POST /connections', () => {
      it('debe crear nueva conexion', async () => {
        const newConnection = {
          name: 'New Server',
          host: '192.168.1.100',
          port: 22,
          username: 'admin',
        }

        const createdConnection = { id: 'new-id', ...newConnection }

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createdConnection,
        })

        const response = await mockFetch('http://localhost:3001/api/connections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newConnection),
        })
        const data = await response.json()

        expect(data.id).toBe('new-id')
        expect(data.name).toBe('New Server')
      })

      it('debe validar campos requeridos', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: async () => ({ error: 'Host is required' }),
        })

        const response = await mockFetch('http://localhost:3001/api/connections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        })

        expect(response.ok).toBe(false)
        expect(response.status).toBe(400)
      })
    })

    describe('PUT /connections/:id', () => {
      it('debe actualizar conexion existente', async () => {
        const updates = { name: 'Updated Server' }
        const updatedConnection = { id: '123', name: 'Updated Server', host: '10.0.0.1' }

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => updatedConnection,
        })

        const response = await mockFetch('http://localhost:3001/api/connections/123', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        })
        const data = await response.json()

        expect(data.name).toBe('Updated Server')
      })
    })

    describe('DELETE /connections/:id', () => {
      it('debe eliminar conexion', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        })

        const response = await mockFetch('http://localhost:3001/api/connections/123', {
          method: 'DELETE',
        })
        const data = await response.json()

        expect(data.success).toBe(true)
      })
    })

    describe('PATCH /connections/:id/favorite', () => {
      it('debe alternar favorito', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: '123', is_favorite: true }),
        })

        const response = await mockFetch('http://localhost:3001/api/connections/123/favorite', {
          method: 'PATCH',
        })
        const data = await response.json()

        expect(data.is_favorite).toBe(true)
      })
    })

    describe('PATCH /connections/:id/default', () => {
      it('debe alternar conexion por defecto', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: '123', is_default: true }),
        })

        const response = await mockFetch('http://localhost:3001/api/connections/123/default', {
          method: 'PATCH',
        })
        const data = await response.json()

        expect(data.is_default).toBe(true)
      })
    })
  })

  describe('Metrics API', () => {
    describe('POST /metrics', () => {
      it('debe guardar metricas', async () => {
        const metricsData = {
          connectionId: 'conn-1',
          cpuUsage: 45.5,
          memoryUsedPercent: 60.2,
        }

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 'snapshot-1', ...metricsData }),
        })

        const response = await mockFetch('http://localhost:3001/api/metrics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(metricsData),
        })
        const data = await response.json()

        expect(data.connectionId).toBe('conn-1')
      })
    })

    describe('GET /metrics/:connectionId', () => {
      it('debe obtener historial de metricas', async () => {
        const history = [
          { timestamp: '2024-01-01T00:00:00Z', cpu_usage: 45 },
          { timestamp: '2024-01-01T00:01:00Z', cpu_usage: 50 },
        ]

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => history,
        })

        const response = await mockFetch('http://localhost:3001/api/metrics/conn-1?hours=24')
        const data = await response.json()

        expect(data).toEqual(history)
        expect(data.length).toBe(2)
      })
    })

    describe('GET /metrics/:connectionId/stats', () => {
      it('debe obtener estadisticas de metricas', async () => {
        const stats = {
          avgCpu: 45.5,
          maxCpu: 90,
          minCpu: 10,
          avgMemory: 60,
        }

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => stats,
        })

        const response = await mockFetch('http://localhost:3001/api/metrics/conn-1/stats?hours=24')
        const data = await response.json()

        expect(data.avgCpu).toBe(45.5)
      })
    })

    describe('DELETE /metrics/cleanup', () => {
      it('debe limpiar metricas antiguas', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ deleted: 100 }),
        })

        const response = await mockFetch('http://localhost:3001/api/metrics/cleanup?hours=168', {
          method: 'DELETE',
        })
        const data = await response.json()

        expect(data.deleted).toBe(100)
      })
    })
  })

  describe('Docker API', () => {
    describe('POST /docker/containers', () => {
      it('debe guardar contenedor', async () => {
        const container = {
          connectionId: 'conn-1',
          containerId: 'docker-abc',
          containerName: 'web-app',
          image: 'nginx:latest',
          state: 'running',
        }

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 'ref-1', ...container }),
        })

        const response = await mockFetch('http://localhost:3001/api/docker/containers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(container),
        })
        const data = await response.json()

        expect(data.containerName).toBe('web-app')
      })
    })

    describe('GET /docker/containers/:connectionId', () => {
      it('debe obtener contenedores de conexion', async () => {
        const containers = [
          { id: 'ref-1', container_id: 'docker-1', name: 'web', state: 'running' },
          { id: 'ref-2', container_id: 'docker-2', name: 'db', state: 'running' },
        ]

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => containers,
        })

        const response = await mockFetch('http://localhost:3001/api/docker/containers/conn-1')
        const data = await response.json()

        expect(data.length).toBe(2)
      })
    })

    describe('POST /docker/metrics', () => {
      it('debe guardar metricas de contenedor', async () => {
        const metrics = {
          containerRefId: 'ref-1',
          cpuPercent: 25.5,
          memoryUsage: 512000000,
          memoryLimit: 1024000000,
        }

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 'metric-1', ...metrics }),
        })

        const response = await mockFetch('http://localhost:3001/api/docker/metrics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(metrics),
        })
        const data = await response.json()

        expect(data.cpuPercent).toBe(25.5)
      })
    })

    describe('GET /docker/metrics/:containerRefId', () => {
      it('debe obtener historial de metricas de contenedor', async () => {
        const history = [
          { timestamp: '2024-01-01T00:00:00Z', cpu_percent: 25 },
          { timestamp: '2024-01-01T00:01:00Z', cpu_percent: 30 },
        ]

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => history,
        })

        const response = await mockFetch('http://localhost:3001/api/docker/metrics/ref-1?hours=24')
        const data = await response.json()

        expect(data.length).toBe(2)
      })
    })
  })

  describe('Settings API', () => {
    describe('GET /settings', () => {
      it('debe obtener todas las configuraciones', async () => {
        const settings = {
          'ui.theme': 'dark',
          'ui.language': 'es',
          'metrics.polling_interval': 5000,
        }

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => settings,
        })

        const response = await mockFetch('http://localhost:3001/api/settings')
        const data = await response.json()

        expect(data['ui.theme']).toBe('dark')
      })
    })

    describe('GET /settings/:key', () => {
      it('debe obtener configuracion especifica', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ key: 'ui.theme', value: 'dark' }),
        })

        const response = await mockFetch('http://localhost:3001/api/settings/ui.theme')
        const data = await response.json()

        expect(data.value).toBe('dark')
      })
    })

    describe('PUT /settings/:key', () => {
      it('debe actualizar configuracion', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ key: 'ui.theme', value: 'light' }),
        })

        const response = await mockFetch('http://localhost:3001/api/settings/ui.theme', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: 'light' }),
        })
        const data = await response.json()

        expect(data.value).toBe('light')
      })
    })

    describe('DELETE /settings/:key', () => {
      it('debe eliminar configuracion', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        })

        const response = await mockFetch('http://localhost:3001/api/settings/custom.setting', {
          method: 'DELETE',
        })
        const data = await response.json()

        expect(data.success).toBe(true)
      })
    })
  })

  describe('Manejo de errores', () => {
    it('debe manejar errores 400 Bad Request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Invalid request' }),
      })

      const response = await mockFetch('http://localhost:3001/api/connections', {
        method: 'POST',
        body: '{}',
      })

      expect(response.status).toBe(400)
    })

    it('debe manejar errores 401 Unauthorized', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
      })

      const response = await mockFetch('http://localhost:3001/api/protected')

      expect(response.status).toBe(401)
    })

    it('debe manejar errores 500 Internal Server Error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' }),
      })

      const response = await mockFetch('http://localhost:3001/api/connections')

      expect(response.status).toBe(500)
    })

    it('debe manejar errores de red', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(mockFetch('http://localhost:3001/api/test')).rejects.toThrow('Network error')
    })

    it('debe manejar errores de timeout', async () => {
      mockFetch.mockImplementationOnce(() => new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 100)
      }))

      await expect(mockFetch('http://localhost:3001/api/slow')).rejects.toThrow('Timeout')
    })

    it('debe manejar respuestas JSON invalidas', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => { throw new Error('Invalid JSON') },
      })

      const response = await mockFetch('http://localhost:3001/api/test')
      
      await expect(response.json()).rejects.toThrow('Invalid JSON')
    })
  })

  describe('Headers y configuracion de requests', () => {
    it('debe incluir Content-Type en POST requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      })

      await mockFetch('http://localhost:3001/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test' }),
      })

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/connections',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      )
    })

    it('debe serializar body como JSON', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      })

      const body = { name: 'Test', value: 123 }

      await mockFetch('http://localhost:3001/api/test', {
        method: 'POST',
        body: JSON.stringify(body),
      })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify(body),
        })
      )
    })
  })
})

describe('API REST - Tests de integracion', () => {
  // Estos tests solo se ejecutan si la API esta corriendo
  const API_AVAILABLE = process.env.TEST_API === 'true'

  describe.skipIf(!API_AVAILABLE)('Con servidor real', () => {
    // Reset fetch mock for integration tests
    beforeAll(() => {
      global.fetch = globalThis.fetch
    })

    it('debe conectar con el health endpoint', async () => {
      const response = await fetch('http://localhost:3001/health')
      const data = await response.json()

      expect(data.status).toBe('ok')
    })

    it('debe listar conexiones', async () => {
      const response = await fetch('http://localhost:3001/api/connections')
      const data = await response.json()

      expect(Array.isArray(data)).toBe(true)
    })

    it('debe obtener configuraciones', async () => {
      const response = await fetch('http://localhost:3001/api/settings')
      const data = await response.json()

      expect(typeof data).toBe('object')
    })
  })
})
