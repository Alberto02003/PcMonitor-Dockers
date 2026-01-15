/**
 * Configuración del formulario de conexiones
 */

export const emptyForm = {
  name: '',
  host: '',
  port: '22',
  username: '',
  authType: 'password',
  password: '',
  keyPath: '',
  notes: '',
  group: 'default',
  tags: [],
  color: '#64ffda',
}

/**
 * Valida los datos del formulario
 * @param {Object} values - Valores del formulario
 * @param {Function} t - Función de traducción
 * @returns {Object} Errores encontrados (objeto vacío si no hay errores)
 */
export function validateForm(values, t) {
  const errors = {}
  if (!values.name.trim()) errors.name = t('common.required')
  if (!values.host.trim()) errors.host = t('common.required')
  if (!values.username.trim()) errors.username = t('common.required')
  const portValue = Number(values.port)
  if (Number.isNaN(portValue) || portValue < 1 || portValue > 65535) {
    errors.port = t('form.invalidPort')
  }
  return errors
}

/**
 * Convierte una conexión a datos de formulario
 * @param {Object|null} connection - Conexión a convertir
 * @returns {Object} Datos del formulario
 */
export function connectionToFormData(connection) {
  if (!connection) return emptyForm
  return {
    name: connection.name,
    host: connection.host,
    port: String(connection.port || 22),
    username: connection.username,
    authType: connection.authType || 'password',
    password: connection.password || '',
    keyPath: connection.keyPath || '',
    notes: connection.notes || '',
    group: connection.group || 'default',
    tags: connection.tags || [],
    color: connection.color || '#64ffda',
  }
}

/**
 * Convierte datos de formulario a payload para guardar
 * @param {Object} formData - Datos del formulario
 * @param {boolean} storeCredentials - Si se deben guardar credenciales
 * @returns {Object} Payload para la API
 */
export function formDataToPayload(formData, storeCredentials) {
  return {
    name: formData.name.trim(),
    host: formData.host.trim(),
    port: Number(formData.port) || 22,
    username: formData.username.trim(),
    authType: formData.authType,
    password:
      storeCredentials && formData.authType === 'password'
        ? formData.password
        : '',
    keyPath:
      storeCredentials && formData.authType === 'key'
        ? formData.keyPath
        : '',
    notes: formData.notes,
    group: formData.group || 'default',
    tags: Array.isArray(formData.tags) ? formData.tags : [],
    color: formData.color || '#64ffda',
  }
}
