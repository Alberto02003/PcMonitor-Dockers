import { invoke } from '@tauri-apps/api/core'

// ============================================================================
// Secure Storage API - Encrypted credential storage using Rust backend
// ============================================================================

/**
 * Save a connection with encrypted credentials to secure storage
 * @param {Object} connection - Full connection object with credentials
 */
export async function secureStorageSave(connection) {
  return invoke('secure_save_connection', {
    connection: {
      id: connection.id,
      name: connection.name,
      host: connection.host,
      port: connection.port || 22,
      username: connection.username,
      authType: connection.authType || 'password',
      password: connection.password || null,
      keyPath: connection.keyPath || null,
      notes: connection.notes || '',
      isFavorite: connection.isFavorite || false,
      isDefault: connection.isDefault || false,
      status: connection.status || 'unknown',
      updatedAt: connection.updatedAt || new Date().toISOString(),
    }
  })
}

/**
 * Load all connections with decrypted credentials from secure storage
 * @returns {Promise<Array>} Array of connection objects
 */
export async function secureStorageLoad() {
  return invoke('secure_load_connections')
}

/**
 * Delete a connection from secure storage
 * @param {string} connectionId - Connection ID to delete
 */
export async function secureStorageDelete(connectionId) {
  return invoke('secure_delete_connection', { connectionId })
}

/**
 * Get a single connection with credentials from secure storage
 * @param {string} connectionId - Connection ID to retrieve
 */
export async function secureStorageGet(connectionId) {
  return invoke('secure_get_connection', { connectionId })
}

// ============================================================================
// SSH API
// ============================================================================

export async function sshConnect(connection) {
  return invoke('ssh_connect', {
    id: connection.id,
    host: connection.host,
    port: connection.port || 22,
    username: connection.username,
    authType: connection.authType || 'password',
    password: connection.password || null,
    keyPath: connection.keyPath || null,
  })
}

export async function sshDisconnect(connectionId) {
  return invoke('ssh_disconnect', { connectionId })
}

export async function sshTest(connection) {
  return invoke('ssh_test', {
    id: connection.id || crypto.randomUUID(),
    host: connection.host,
    port: connection.port || 22,
    username: connection.username,
    authType: connection.authType || 'password',
    password: connection.password || null,
    keyPath: connection.keyPath || null,
  })
}

export async function sshIsConnected(connectionId) {
  return invoke('ssh_is_connected', { connectionId })
}

// ============================================================================
// WebSocket API
// ============================================================================

export async function wsStart() {
  return invoke('ws_start')
}

export async function wsStop() {
  return invoke('ws_stop')
}

export async function wsPort() {
  return invoke('ws_port')
}

// ============================================================================
// System Metrics API (fallback)
// ============================================================================

export async function getSystemMetrics(connectionId) {
  return invoke('get_system_metrics', { connectionId })
}

// ============================================================================
// Docker API
// ============================================================================

export async function dockerList(connectionId, all = false) {
  return invoke('docker_list', { connectionId, all })
}

export async function dockerStart(connectionId, containerId) {
  return invoke('docker_start', { connectionId, containerId })
}

export async function dockerStop(connectionId, containerId) {
  return invoke('docker_stop', { connectionId, containerId })
}

export async function dockerRestart(connectionId, containerId) {
  return invoke('docker_restart', { connectionId, containerId })
}

export async function dockerLogs(connectionId, containerId, tail = 100) {
  return invoke('docker_logs', { connectionId, containerId, tail })
}

export async function dockerImages(connectionId) {
  return invoke('docker_images', { connectionId })
}

export async function dockerVolumes(connectionId) {
  return invoke('docker_volumes', { connectionId })
}

export async function dockerInfo(connectionId) {
  return invoke('docker_info', { connectionId })
}

// ============================================================================
// Utility: Check if running in Tauri
// ============================================================================

export function isTauri() {
  // Tauri v2 uses __TAURI_INTERNALS__ instead of __TAURI__
  return Boolean(window.__TAURI_INTERNALS__ || window.__TAURI__)
}
