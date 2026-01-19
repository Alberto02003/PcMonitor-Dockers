/**
 * Store global para conexiones SSH usando Zustand
 * Usa Tauri Secure Storage (Stronghold) para almacenamiento local encriptado
 * NO usa API REST ni MySQL - todo se guarda localmente
 */

import { create } from 'zustand'
import { 
  secureStorageLoad, 
  secureStorageSave, 
  secureStorageDelete,
  isTauri 
} from '../services/tauri.js'

/**
 * Estado inicial
 */
const initialState = {
  connections: [],
  selectedId: null,
  isLoading: true,
  error: null,
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
    group: raw?.group || 'default',
    tags: Array.isArray(raw?.tags) ? raw.tags : [],
    color: raw?.color || '#64ffda',
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

  getGroups: () => {
    const groups = new Set(get().connections.map(c => c.group || 'default'))
    return Array.from(groups).sort()
  },

  getByGroup: (group) => get().connections.filter(c => (c.group || 'default') === group),

  getAllTags: () => {
    const tags = new Set()
    get().connections.forEach(c => {
      if (Array.isArray(c.tags)) {
        c.tags.forEach(tag => tags.add(tag))
      }
    })
    return Array.from(tags).sort()
  },

  // === Acciones de Almacenamiento Local ===

  /**
   * Cargar conexiones desde Tauri Secure Storage
   */
  loadConnections: async () => {
    if (!isTauri()) {
      set({ isLoading: false, connections: [] })
      return []
    }

    try {
      set({ isLoading: true, error: null })
      const connections = await secureStorageLoad()
      
      set({ connections, isLoading: false })
      return connections
    } catch (error) {
      console.error('Failed to load connections:', error)
      set({ error: error.message, isLoading: false })
      return []
    }
  },

  // === Acciones CRUD ===

  setConnections: (connections) => set({ connections, isLoading: false }),

  setSelectedId: (selectedId) => set({ selectedId }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  /**
   * Agregar conexion
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
      if (isTauri()) {
        await secureStorageSave(connection)
      }
      
      // Guardar en estado local
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
   * Actualizar conexion
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
      if (isTauri()) {
        await secureStorageSave(updated)
      }
      
      // Guardar en estado local
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
      if (isTauri()) {
        await secureStorageDelete(id)
      }
      
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
   * Restaurar conexion (undo)
   */
  restoreConnection: async (connection, index) => {
    if (!connection) return

    try {
      if (isTauri()) {
        await secureStorageSave(connection)
      }
      
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
   * Duplicar conexion
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
      if (isTauri()) {
        await secureStorageSave(duplicated)
      }
      
      // Guardar en estado local
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

    const updated = { ...target, isFavorite: !target.isFavorite }

    try {
      if (isTauri()) {
        await secureStorageSave(updated)
      }
      
      set(state => ({
        connections: state.connections.map(c =>
          c.id === id ? updated : c
        ),
      }))
      
      return updated.isFavorite
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
      // Quitar default de todas las demas
      const updates = state.connections.map(c => ({
        ...c,
        isDefault: c.id === id,
      }))

      if (isTauri()) {
        // Guardar todas las conexiones actualizadas
        await Promise.all(updates.map(conn => secureStorageSave(conn)))
      }
      
      set({ connections: updates })

      return true
    } catch (error) {
      console.error('Failed to set default:', error)
      return false
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
    const state = get()
    const target = state.connections.find(c => c.id === id)
    if (!target) return

    const updated = {
      ...target,
      lastConnectedAt: new Date().toISOString(),
    }

    try {
      if (isTauri()) {
        await secureStorageSave(updated)
      }
      
      set(state => ({
        connections: state.connections.map(c =>
          c.id === id ? updated : c
        ),
      }))
    } catch (error) {
      console.error('Failed to update last connected:', error)
    }
  },

  /**
   * Importar conexiones
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
        if (isTauri()) {
          await secureStorageSave(normalized)
        }
        count++
      } catch (error) {
        console.error('Failed to import connection:', error)
      }
    }

    // Recargar desde storage
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
   * Renombrar grupo
   */
  renameGroup: async (oldName, newName) => {
    const state = get()
    const connectionsInGroup = state.connections.filter(c => (c.group || 'default') === oldName)
    
    if (connectionsInGroup.length === 0) return

    try {
      // Actualizar todas las conexiones del grupo
      const updates = connectionsInGroup.map(c => ({ ...c, group: newName }))

      if (isTauri()) {
        await Promise.all(updates.map(conn => secureStorageSave(conn)))
      }

      set(state => ({
        connections: state.connections.map(c =>
          (c.group || 'default') === oldName ? { ...c, group: newName } : c
        )
      }))
    } catch (error) {
      console.error('Failed to rename group:', error)
      set({ error: error.message })
    }
  },

  /**
   * Eliminar grupo (mover conexiones a 'default')
   */
  deleteGroup: async (groupName) => {
    const state = get()
    const connectionsInGroup = state.connections.filter(c => (c.group || 'default') === groupName)
    
    if (connectionsInGroup.length === 0) return

    try {
      // Mover todas las conexiones a 'default'
      const updates = connectionsInGroup.map(c => ({ ...c, group: 'default' }))

      if (isTauri()) {
        await Promise.all(updates.map(conn => secureStorageSave(conn)))
      }

      set(state => ({
        connections: state.connections.map(c =>
          (c.group || 'default') === groupName ? { ...c, group: 'default' } : c
        )
      }))
    } catch (error) {
      console.error('Failed to delete group:', error)
      set({ error: error.message })
    }
  },

  /**
   * Reset
   */
  reset: () => set(initialState),
}))

export default useConnectionsStore
