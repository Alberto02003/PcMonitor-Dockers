/**
 * @deprecated Legacy module — the hook is removed, use connectionsStore instead.
 * Only kept for utility function exports used by tests.
 */

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
