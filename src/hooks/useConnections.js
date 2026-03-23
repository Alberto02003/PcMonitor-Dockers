/**
 * Hook para gestionar conexiones SSH (CRUD)
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { encryptPayload, decryptPayload } from '../utils/encryption.js'

const STORAGE_KEY = 'pcmd.connections.v1'

/**
 * Formulario vacio por defecto
 */
export const emptyConnectionForm = {
  name: '',
  host: '',
  port: '22',
  username: '',
  authType: 'password',
  password: '',
  keyPath: '',
  notes: '',
}

/**
 * Normaliza una conexion raw a formato estandar
 * @param {Object} raw - Conexion sin normalizar
 * @param {Object} options - Opciones de normalizacion
 * @returns {Object} - Conexion normalizada
 */
export function normalizeConnection(raw, options = {}) {
  const authType = raw?.authType === 'key' ? 'key' : 'password'
  const port = Number(raw?.port) || 22

  const normalized = {
    id: raw?.id || crypto.randomUUID(),
    name: raw?.name || '',
    host: raw?.host || '',
    port,
    username: raw?.username || '',
    authType,
    password: raw?.password || '',
    keyPath: raw?.keyPath || '',
    notes: raw?.notes || '',
    isFavorite: Boolean(raw?.isFavorite),
    isDefault: Boolean(raw?.isDefault),
    status: raw?.status || 'unknown',
    updatedAt: raw?.updatedAt || new Date().toISOString(),
  }

  if (options.storeCredentials === false) {
    normalized.password = ''
    normalized.keyPath = ''
  }

  return normalized
}

/**
 * Convierte conexion a datos de formulario
 * @param {Object|null} connection
 * @returns {Object}
 */
export function connectionToFormData(connection) {
  if (!connection) return emptyConnectionForm

  return {
    name: connection.name,
    host: connection.host,
    port: String(connection.port || 22),
    username: connection.username,
    authType: connection.authType || 'password',
    password: connection.password || '',
    keyPath: connection.keyPath || '',
    notes: connection.notes || '',
  }
}

/**
 * Hook para gestionar conexiones
 * @param {Object} options
 * @param {boolean} options.storeCredentials - Si guardar credenciales
 * @param {Function} options.onError - Callback de error
 * @returns {Object}
 */
export function useConnections({ storeCredentials = true, onError } = {}) {
  const [connections, setConnections] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const hasLoadedRef = useRef(false)

  // Cargar conexiones al montar
  useEffect(() => {
    if (hasLoadedRef.current) return

    async function load() {
      try {
        const encrypted = localStorage.getItem(STORAGE_KEY)
        if (!encrypted) {
          setIsLoading(false)
          hasLoadedRef.current = true
          return
        }

        const parsed = await decryptPayload(encrypted)
        const normalized = Array.isArray(parsed) 
          ? parsed.map(c => normalizeConnection(c))
          : []
        
        setConnections(normalized)
      } catch (error) {
        if (onError) onError(error)
      } finally {
        setIsLoading(false)
        hasLoadedRef.current = true
      }
    }

    load()
  }, [onError])

  // Persistir conexiones
  const persist = useCallback(async (nextConnections) => {
    try {
      const encrypted = await encryptPayload(nextConnections)
      localStorage.setItem(STORAGE_KEY, encrypted)
    } catch (error) {
      if (onError) {
        onError(error)
      } else {
        console.error('Failed to persist connections:', error)
      }
    }
  }, [onError])

  // Guardar conexion (crear o actualizar)
  const saveConnection = useCallback(async (formData, existingId = null, options = {}) => {
    const payload = {
      id: existingId || crypto.randomUUID(),
      name: formData.name.trim(),
      host: formData.host.trim(),
      port: Number(formData.port) || 22,
      username: formData.username.trim(),
      authType: formData.authType,
      password: storeCredentials && formData.authType === 'password' 
        ? formData.password 
        : '',
      keyPath: storeCredentials && formData.authType === 'key'
        ? formData.keyPath
        : '',
      notes: formData.notes,
      isFavorite: options.isFavorite || false,
      isDefault: options.isDefault || false,
      status: options.status || 'unknown',
      updatedAt: new Date().toISOString(),
    }

    let nextConnections
    if (existingId) {
      nextConnections = connections.map(c => c.id === existingId ? payload : c)
    } else {
      nextConnections = [...connections, payload]
    }

    setConnections(nextConnections)
    await persist(nextConnections)

    return payload
  }, [connections, persist, storeCredentials])

  // Eliminar conexion
  const deleteConnection = useCallback(async (id) => {
    const targetIndex = connections.findIndex(c => c.id === id)
    const target = connections[targetIndex]
    
    if (!target) return null

    const nextConnections = connections.filter(c => c.id !== id)
    setConnections(nextConnections)
    await persist(nextConnections)

    return { connection: target, index: targetIndex }
  }, [connections, persist])

  // Restaurar conexion (undo)
  const restoreConnection = useCallback(async (connection, index) => {
    const nextConnections = [...connections]
    const insertIndex = Math.max(0, Math.min(index, nextConnections.length))
    nextConnections.splice(insertIndex, 0, connection)
    
    setConnections(nextConnections)
    await persist(nextConnections)

    return connection
  }, [connections, persist])

  // Duplicar conexion
  const duplicateConnection = useCallback(async (id, nameSuffix = 'copy') => {
    const target = connections.find(c => c.id === id)
    if (!target) return null

    const duplicated = {
      ...target,
      id: crypto.randomUUID(),
      name: `${target.name} (${nameSuffix})`,
      isDefault: false,
      status: 'unknown',
      updatedAt: new Date().toISOString(),
    }

    const nextConnections = [...connections, duplicated]
    setConnections(nextConnections)
    await persist(nextConnections)

    return duplicated
  }, [connections, persist])

  // Toggle favorito
  const toggleFavorite = useCallback(async (id) => {
    let isFavorite = false
    const nextConnections = connections.map(c => {
      if (c.id !== id) return c
      isFavorite = !c.isFavorite
      return { ...c, isFavorite }
    })

    setConnections(nextConnections)
    await persist(nextConnections)

    return isFavorite
  }, [connections, persist])

  // Set default
  const setDefault = useCallback(async (id) => {
    const isCurrentlyDefault = connections.find(c => c.id === id)?.isDefault
    
    const nextConnections = connections.map(c => ({
      ...c,
      isDefault: isCurrentlyDefault ? false : c.id === id,
    }))

    setConnections(nextConnections)
    await persist(nextConnections)

    return !isCurrentlyDefault
  }, [connections, persist])

  // Actualizar estado de conexion
  const updateStatus = useCallback((id, status) => {
    setConnections(prev => prev.map(c => 
      c.id === id ? { ...c, status } : c
    ))
  }, [])

  // Limpiar credenciales
  const clearCredentials = useCallback(async () => {
    const scrubbed = connections.map(c => ({
      ...c,
      password: '',
      keyPath: '',
    }))
    setConnections(scrubbed)
    await persist(scrubbed)
  }, [connections, persist])

  // Importar conexiones
  const importConnections = useCallback(async (imported, options = {}) => {
    const existingIds = new Set(connections.map(c => c.id))
    let hasDefault = connections.some(c => c.isDefault)

    const importedNormalized = imported.map(item => {
      const normalized = normalizeConnection(item, {
        storeCredentials: options.storeCredentials,
      })

      let nextId = normalized.id
      if (!nextId || existingIds.has(nextId)) {
        nextId = crypto.randomUUID()
      }
      existingIds.add(nextId)

      const isDefault = !hasDefault && normalized.isDefault
      if (isDefault) hasDefault = true

      return {
        ...normalized,
        id: nextId,
        isDefault,
        status: 'unknown',
        updatedAt: new Date().toISOString(),
      }
    })

    const nextConnections = [...connections, ...importedNormalized]
    setConnections(nextConnections)
    await persist(nextConnections)

    return importedNormalized.length
  }, [connections, persist])

  // Exportar conexiones
  const exportConnections = useCallback(() => {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      connections,
    }
  }, [connections])

  // Conexiones computadas
  const defaultConnection = useMemo(
    () => connections.find(c => c.isDefault) || null,
    [connections]
  )

  const favoriteConnections = useMemo(
    () => connections.filter(c => c.isFavorite),
    [connections]
  )

  return {
    // Estado
    connections,
    isLoading,
    defaultConnection,
    favoriteConnections,
    
    // Acciones
    saveConnection,
    deleteConnection,
    restoreConnection,
    duplicateConnection,
    toggleFavorite,
    setDefault,
    updateStatus,
    clearCredentials,
    importConnections,
    exportConnections,
    
    // Utilidades
    getConnection: (id) => connections.find(c => c.id === id) || null,
  }
}

export default useConnections
