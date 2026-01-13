/**
 * Store global para conexiones SSH usando Zustand
 * Usa API HTTP como backend con credenciales cifradas
 */

import { create } from 'zustand'
import * as api from '../services/api.js'
import { encryptCredentials, decryptCredentials, isTauri } from '../services/tauri.js'

/**
 * Estado inicial
 */
const initialState = {
  connections: [],
  selectedId: null,
  isLoading: true,
  error: null,
  apiConnected: false,
}

/**
 * Normaliza una conexion
 */
function normalizeConnection(raw) {
  return {
    id: raw?.id || crypto.randomUUID(),
    name: raw?.name || '',
    host: raw?.host || '',
    port: Number(raw?.port) || 22,
    username: raw?.username || '',
    authType: raw?.authType === 'key' ? 'key' : 'password',
    password: raw?.password || '',
    keyPath: raw?.keyPath || '',
    notes: raw?.notes || '',
    isFavorite: Boolean(raw?.isFavorite),
    isDefault: Boolean(raw?.isDefault),
    status: raw?.status || 'unknown',
    updatedAt: raw?.updatedAt || new Date().toISOString(),
    createdAt: raw?.createdAt || null,
    lastConnectedAt: raw?.lastConnectedAt || null,
  }
}

/**
 * Store de conexiones
 */
export const useConnectionsStore = create((set, get) => ({
  ...initialState,

  // === Selectores ===
  
  getConnection: (id) => get().connections.find(c => c.id === id) || null,
  
  getDefaultConnection: () => get().connections.find(c => c.isDefault) || null,
  
  getFavorites: () => get().connections.filter(c => c.isFavorite),
  
  getSelectedConnection: () => {
    const { connections, selectedId } = get()
    return connections.find(c => c.id === selectedId) || null
  },

  // === Acciones de API ===

  /**
   * Verificar conexion a la API
   */
  checkApiConnection: async () => {
    try {
      const connected = await api.isApiConnected()
      set({ apiConnected: connected })
      return connected
    } catch {
      set({ apiConnected: false })
      return false
    }
  },

  /**
   * Cargar conexiones desde la API y descifrar credenciales
   */
  loadConnections: async () => {
    try {
      set({ isLoading: true, error: null })
      const rawConnections = await api.getConnections()
      
      // Descifrar credenciales si estamos en Tauri
      let connections = rawConnections
      if (isTauri()) {
        connections = await Promise.all(rawConnections.map(async (conn) => {
          try {
            const decrypted = await decryptCredentials(conn.password, conn.keyPath)
            return {
              ...conn,
              password: decrypted.password || '',
              keyPath: decrypted.keyPath || '',
            }
          } catch (err) {
            console.warn(`Failed to decrypt credentials for ${conn.name}:`, err)
            return { ...conn, password: '', keyPath: '' }
          }
        }))
      }
      
      set({ connections, isLoading: false, apiConnected: true })
      return connections
    } catch (error) {
      console.error('Failed to load connections:', error)
      set({ error: error.message, isLoading: false, apiConnected: false })
      return []
    }
  },

  // === Acciones CRUD ===

  setConnections: (connections) => set({ connections, isLoading: false }),

  setSelectedId: (selectedId) => set({ selectedId }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  /**
   * Agregar conexion con credenciales cifradas
   */
  addConnection: async (connectionData, options = {}) => {
    const connection = {
      ...normalizeConnection(connectionData),
      id: crypto.randomUUID(),
      isFavorite: options.isFavorite || false,
      isDefault: options.isDefault || false,
      status: 'unknown',
      updatedAt: new Date().toISOString(),
    }

    try {
      // Cifrar credenciales antes de enviar a la API
      let connectionToSave = connection
      if (isTauri()) {
        const encrypted = await encryptCredentials(connection.password, connection.keyPath)
        connectionToSave = {
          ...connection,
          password: encrypted.password || '',
          keyPath: encrypted.keyPath || '',
        }
      }
      
      await api.createConnection(connectionToSave)
      
      // Guardar en estado local con credenciales en claro (para uso en memoria)
      set(state => ({
        connections: [...state.connections, connection],
      }))

      return connection
    } catch (error) {
      console.error('Failed to add connection:', error)
      set({ error: error.message })
      return null
    }
  },

  /**
   * Actualizar conexion con credenciales cifradas
   */
  updateConnection: async (id, updates) => {
    const state = get()
    const existing = state.connections.find(c => c.id === id)
    if (!existing) return

    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    }

    try {
      // Cifrar credenciales si se actualizan
      let updatesToSave = updates
      if (isTauri() && (updates.password !== undefined || updates.keyPath !== undefined)) {
        const encrypted = await encryptCredentials(
          updates.password ?? existing.password,
          updates.keyPath ?? existing.keyPath
        )
        updatesToSave = {
          ...updates,
          password: encrypted.password || '',
          keyPath: encrypted.keyPath || '',
        }
      }
      
      await api.updateConnection(id, updatesToSave)
      
      // Guardar en estado local con credenciales en claro
      set(state => ({
        connections: state.connections.map(c => c.id === id ? updated : c),
      }))
    } catch (error) {
      console.error('Failed to update connection:', error)
      set({ error: error.message })
    }
  },

  /**
   * Eliminar conexion
   */
  deleteConnection: async (id) => {
    const state = get()
    const connection = state.connections.find(c => c.id === id)
    const index = state.connections.findIndex(c => c.id === id)

    try {
      await api.deleteConnection(id)
      
      set(state => ({
        connections: state.connections.filter(c => c.id !== id),
        selectedId: state.selectedId === id ? null : state.selectedId,
      }))

      return { connection, index }
    } catch (error) {
      console.error('Failed to delete connection:', error)
      set({ error: error.message })
      return { connection: null, index: -1 }
    }
  },

  /**
   * Restaurar conexion (undo) con credenciales cifradas
   */
  restoreConnection: async (connection, index) => {
    if (!connection) return

    try {
      // Cifrar credenciales antes de guardar
      let connectionToSave = connection
      if (isTauri()) {
        const encrypted = await encryptCredentials(connection.password, connection.keyPath)
        connectionToSave = {
          ...connection,
          password: encrypted.password || '',
          keyPath: encrypted.keyPath || '',
        }
      }
      
      await api.createConnection(connectionToSave)
      
      set(state => {
        const next = [...state.connections]
        const insertIndex = Math.max(0, Math.min(index, next.length))
        next.splice(insertIndex, 0, connection)
        return { connections: next }
      })
    } catch (error) {
      console.error('Failed to restore connection:', error)
      set({ error: error.message })
    }
  },

  /**
   * Duplicar conexion con credenciales cifradas
   */
  duplicateConnection: async (id, nameSuffix = 'copy') => {
    const state = get()
    const target = state.connections.find(c => c.id === id)
    if (!target) return null

    const duplicated = {
      ...target,
      id: crypto.randomUUID(),
      name: `${target.name} (${nameSuffix})`,
      isDefault: false,
      status: 'unknown',
      updatedAt: new Date().toISOString(),
    }

    try {
      // Cifrar credenciales antes de guardar
      let connectionToSave = duplicated
      if (isTauri()) {
        const encrypted = await encryptCredentials(duplicated.password, duplicated.keyPath)
        connectionToSave = {
          ...duplicated,
          password: encrypted.password || '',
          keyPath: encrypted.keyPath || '',
        }
      }
      
      await api.createConnection(connectionToSave)
      
      // Guardar en estado local con credenciales en claro
      set(state => ({
        connections: [...state.connections, duplicated],
      }))

      return duplicated
    } catch (error) {
      console.error('Failed to duplicate connection:', error)
      set({ error: error.message })
      return null
    }
  },

  /**
   * Toggle favorito
   */
  toggleFavorite: async (id) => {
    const state = get()
    const target = state.connections.find(c => c.id === id)
    if (!target) return false

    try {
      const result = await api.toggleFavorite(id)
      
      set(state => ({
        connections: state.connections.map(c =>
          c.id === id ? { ...c, isFavorite: result.isFavorite } : c
        ),
      }))
      
      return result.isFavorite
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
      return target.isFavorite
    }
  },

  /**
   * Set default
   */
  setDefault: async (id) => {
    const state = get()
    const target = state.connections.find(c => c.id === id)
    if (!target) return false

    try {
      const result = await api.toggleDefault(id)
      
      set(state => ({
        connections: state.connections.map(c => ({
          ...c,
          isDefault: c.id === id ? result.isDefault : false,
        })),
      }))

      return result.isDefault
    } catch (error) {
      console.error('Failed to set default:', error)
      return target.isDefault
    }
  },

  /**
   * Actualizar estado de conexion (solo local, no persiste)
   */
  updateStatus: (id, status) => {
    set(state => ({
      connections: state.connections.map(c =>
        c.id === id ? { ...c, status } : c
      ),
    }))
  },

  /**
   * Actualizar timestamp de ultima conexion
   */
  updateLastConnected: async (id) => {
    try {
      await api.updateLastConnected(id)
      
      set(state => ({
        connections: state.connections.map(c =>
          c.id === id ? { ...c, lastConnectedAt: new Date().toISOString() } : c
        ),
      }))
    } catch (error) {
      console.error('Failed to update last connected:', error)
    }
  },

  /**
   * Importar conexiones con credenciales cifradas
   */
  importConnections: async (imported) => {
    const state = get()
    const existingIds = new Set(state.connections.map(c => c.id))
    let hasDefault = state.connections.some(c => c.isDefault)
    let count = 0

    for (const item of imported) {
      const conn = normalizeConnection(item)
      
      let nextId = conn.id
      if (!nextId || existingIds.has(nextId)) {
        nextId = crypto.randomUUID()
      }
      existingIds.add(nextId)

      const isDefault = !hasDefault && conn.isDefault
      if (isDefault) hasDefault = true

      const normalized = {
        ...conn,
        id: nextId,
        isDefault,
        status: 'unknown',
        updatedAt: new Date().toISOString(),
      }

      try {
        // Cifrar credenciales si vienen en el import
        let connectionToSave = normalized
        if (isTauri() && (normalized.password || normalized.keyPath)) {
          const encrypted = await encryptCredentials(normalized.password, normalized.keyPath)
          connectionToSave = {
            ...normalized,
            password: encrypted.password || '',
            keyPath: encrypted.keyPath || '',
          }
        }
        
        await api.createConnection(connectionToSave)
        count++
      } catch (error) {
        console.error('Failed to import connection:', error)
      }
    }

    // Recargar desde API
    await get().loadConnections()
    return count
  },

  /**
   * Exportar conexiones
   */
  exportConnections: () => {
    const state = get()
    // Excluir contrasenas por seguridad
    const safeConnections = state.connections.map(c => ({
      ...c,
      password: '',
      keyPath: '',
    }))
    
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      connections: safeConnections,
    }
  },

  /**
   * Reset
   */
  reset: () => set(initialState),
}))

export default useConnectionsStore
