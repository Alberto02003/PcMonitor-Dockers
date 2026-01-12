/**
 * Store global para conexiones SSH usando Zustand
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { encryptPayload, decryptPayload } from '../utils/encryption.js'

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
    isFavorite: Boolean(raw?.isFavorite),
    isDefault: Boolean(raw?.isDefault),
    status: raw?.status || 'unknown',
    updatedAt: raw?.updatedAt || new Date().toISOString(),
  }
}

/**
 * Store de conexiones
 */
export const useConnectionsStore = create(
  persist(
    (set, get) => ({
      ...initialState,

      // === Selectores ===
      
      getConnection: (id) => get().connections.find(c => c.id === id) || null,
      
      getDefaultConnection: () => get().connections.find(c => c.isDefault) || null,
      
      getFavorites: () => get().connections.filter(c => c.isFavorite),
      
      getSelectedConnection: () => {
        const { connections, selectedId } = get()
        return connections.find(c => c.id === selectedId) || null
      },

      // === Acciones ===

      setConnections: (connections) => set({ connections, isLoading: false }),

      setSelectedId: (selectedId) => set({ selectedId }),

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error }),

      // Agregar conexion
      addConnection: (connectionData, options = {}) => {
        const connection = {
          ...normalizeConnection(connectionData),
          id: crypto.randomUUID(),
          isFavorite: options.isFavorite || false,
          isDefault: options.isDefault || false,
          status: 'unknown',
          updatedAt: new Date().toISOString(),
        }

        set(state => ({
          connections: [...state.connections, connection],
        }))

        return connection
      },

      // Actualizar conexion
      updateConnection: (id, updates) => {
        set(state => ({
          connections: state.connections.map(c =>
            c.id === id
              ? { ...c, ...updates, updatedAt: new Date().toISOString() }
              : c
          ),
        }))
      },

      // Eliminar conexion
      deleteConnection: (id) => {
        const state = get()
        const connection = state.connections.find(c => c.id === id)
        const index = state.connections.findIndex(c => c.id === id)

        set(state => ({
          connections: state.connections.filter(c => c.id !== id),
          selectedId: state.selectedId === id ? null : state.selectedId,
        }))

        return { connection, index }
      },

      // Restaurar conexion (undo)
      restoreConnection: (connection, index) => {
        set(state => {
          const next = [...state.connections]
          const insertIndex = Math.max(0, Math.min(index, next.length))
          next.splice(insertIndex, 0, connection)
          return { connections: next }
        })
      },

      // Duplicar conexion
      duplicateConnection: (id, nameSuffix = 'copy') => {
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

        set(state => ({
          connections: [...state.connections, duplicated],
        }))

        return duplicated
      },

      // Toggle favorito
      toggleFavorite: (id) => {
        let isFavorite = false
        set(state => ({
          connections: state.connections.map(c => {
            if (c.id !== id) return c
            isFavorite = !c.isFavorite
            return { ...c, isFavorite }
          }),
        }))
        return isFavorite
      },

      // Set default
      setDefault: (id) => {
        const state = get()
        const isCurrentlyDefault = state.connections.find(c => c.id === id)?.isDefault

        set(state => ({
          connections: state.connections.map(c => ({
            ...c,
            isDefault: isCurrentlyDefault ? false : c.id === id,
          })),
        }))

        return !isCurrentlyDefault
      },

      // Actualizar estado de conexion
      updateStatus: (id, status) => {
        set(state => ({
          connections: state.connections.map(c =>
            c.id === id ? { ...c, status } : c
          ),
        }))
      },

      // Limpiar credenciales
      clearCredentials: () => {
        set(state => ({
          connections: state.connections.map(c => ({
            ...c,
            password: '',
            keyPath: '',
          })),
        }))
      },

      // Importar conexiones
      importConnections: (imported) => {
        const state = get()
        const existingIds = new Set(state.connections.map(c => c.id))
        let hasDefault = state.connections.some(c => c.isDefault)

        const normalized = imported.map(item => {
          const conn = normalizeConnection(item)
          
          let nextId = conn.id
          if (!nextId || existingIds.has(nextId)) {
            nextId = crypto.randomUUID()
          }
          existingIds.add(nextId)

          const isDefault = !hasDefault && conn.isDefault
          if (isDefault) hasDefault = true

          return {
            ...conn,
            id: nextId,
            isDefault,
            status: 'unknown',
            updatedAt: new Date().toISOString(),
          }
        })

        set(state => ({
          connections: [...state.connections, ...normalized],
        }))

        return normalized.length
      },

      // Exportar conexiones
      exportConnections: () => {
        const state = get()
        return {
          version: 1,
          exportedAt: new Date().toISOString(),
          connections: state.connections,
        }
      },

      // Reset
      reset: () => set(initialState),
    }),
    {
      name: 'pcmd-connections',
      // Custom storage para usar cifrado
      storage: {
        getItem: async (name) => {
          const encrypted = localStorage.getItem(name)
          if (!encrypted) return null
          try {
            const data = await decryptPayload(encrypted)
            return { state: data }
          } catch {
            return null
          }
        },
        setItem: async (name, value) => {
          try {
            const encrypted = await encryptPayload(value.state)
            localStorage.setItem(name, encrypted)
          } catch (error) {
            console.error('Failed to persist connections:', error)
          }
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
      partialize: (state) => ({
        connections: state.connections,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setLoading(false)
        }
      },
    }
  )
)

export default useConnectionsStore
