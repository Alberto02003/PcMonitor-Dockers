/**
 * Funciones de validacion de inputs
 * Equivalentes a las funciones en src-tauri/src/security.rs
 */

/**
 * Caracteres prohibidos para inyeccion shell
 */
const FORBIDDEN_CHARS = ['`', '$', '(', ')', ';', '&', '|', '<', '>', '\n', '\r', '\t', '"', "'", '\\']
const FORBIDDEN_CHARS_USERNAME = [...FORBIDDEN_CHARS, ' ']

/**
 * Valida hostname o direccion IP
 * @param {string} host - Hostname o IP a validar
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateHost(host) {
  if (!host || typeof host !== 'string') {
    return { valid: false, error: 'Host cannot be empty' }
  }

  const trimmed = host.trim()

  if (trimmed.length === 0) {
    return { valid: false, error: 'Host cannot be empty' }
  }

  if (trimmed.length > 253) {
    return { valid: false, error: 'Host too long' }
  }

  // Check for shell injection characters
  if (FORBIDDEN_CHARS.some(char => trimmed.includes(char))) {
    return { valid: false, error: 'Host contains invalid characters' }
  }

  // Basic validation: alphanumeric, dots, hyphens, underscores
  const validCharsRegex = /^[a-zA-Z0-9.\-_]+$/
  if (!validCharsRegex.test(trimmed)) {
    return { valid: false, error: 'Host contains invalid characters' }
  }

  return { valid: true }
}

/**
 * Valida numero de puerto
 * @param {number|string} port - Puerto a validar
 * @returns {{ valid: boolean, error?: string }}
 */
export function validatePort(port) {
  if (port === undefined || port === null) {
    return { valid: false, error: 'Port is required' }
  }

  const portNum = Number(port)

  if (!Number.isInteger(portNum)) {
    return { valid: false, error: 'Port must be an integer' }
  }

  if (portNum < 1 || portNum > 65535) {
    return { valid: false, error: 'Port must be between 1 and 65535' }
  }

  return { valid: true }
}

/**
 * Valida nombre de usuario
 * @param {string} username - Username a validar
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateUsername(username) {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: 'Username cannot be empty' }
  }

  const trimmed = username.trim()

  if (trimmed.length === 0) {
    return { valid: false, error: 'Username cannot be empty' }
  }

  if (trimmed.length > 32) {
    return { valid: false, error: 'Username too long' }
  }

  // Check for shell injection characters and spaces
  if (FORBIDDEN_CHARS_USERNAME.some(char => trimmed.includes(char))) {
    return { valid: false, error: 'Username contains invalid characters' }
  }

  return { valid: true }
}

/**
 * Sanitiza argumento de comando para prevenir inyeccion
 * @param {string} arg - Argumento a sanitizar
 * @returns {string}
 */
export function sanitizeCommandArg(arg) {
  if (!arg || typeof arg !== 'string') {
    return ''
  }

  const dangerousChars = ['`', '$', '(', ')', ';', '&', '|', '<', '>', '\n', '\r']
  let sanitized = arg

  for (const char of dangerousChars) {
    sanitized = sanitized.replaceAll(char, '')
  }

  // Escape single quotes
  sanitized = sanitized.replaceAll("'", "'\\''")

  return sanitized
}

/**
 * Valida formulario de conexion completo
 * @param {Object} values - Valores del formulario
 * @param {Object} translations - Objeto con textos traducidos
 * @returns {Object} - Objeto con errores por campo
 */
export function validateConnectionForm(values, translations = {}) {
  const t = {
    required: translations.required || 'Required',
    invalidPort: translations.invalidPort || 'Invalid port',
  }

  const errors = {}

  if (!values.name?.trim()) {
    errors.name = t.required
  }

  const hostValidation = validateHost(values.host)
  if (!hostValidation.valid) {
    errors.host = t.required
  }

  const usernameValidation = validateUsername(values.username)
  if (!usernameValidation.valid) {
    errors.username = t.required
  }

  const portValidation = validatePort(values.port)
  if (!portValidation.valid) {
    errors.port = t.invalidPort
  }

  return errors
}

/**
 * Verifica si el formulario es valido
 * @param {Object} values - Valores del formulario
 * @returns {boolean}
 */
export function isFormValid(values) {
  const errors = validateConnectionForm(values)
  return Object.keys(errors).length === 0
}
