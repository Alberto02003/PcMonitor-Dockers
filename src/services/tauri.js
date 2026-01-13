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
// Database API - MySQL backend
// ============================================================================

/**
 * Connect to the MySQL database
 * @param {Object} config - Optional database configuration
 */
export async function dbConnect(config = {}) {
  return invoke('db_connect', {
    host: config.host || null,
    port: config.port || null,
    user: config.user || null,
    password: config.password || null,
    database: config.database || null,
  })
}

/**
 * Check if database is connected
 */
export async function dbIsConnected() {
  return invoke('db_is_connected')
}

// ============================================================================
// Database Connections CRUD
// ============================================================================

/**
 * Save a connection to the database
 * @param {Object} connection - Connection object
 */
export async function dbSaveConnection(connection) {
  return invoke('db_save_connection', {
    connection: {
      id: connection.id,
      name: connection.name,
      host: connection.host,
      port: connection.port || 22,
      username: connection.username,
      auth_type: connection.authType || 'password',
      encrypted_password: connection.password || null,
      encrypted_private_key: connection.keyPath || null,
      notes: connection.notes || null,
      is_favorite: connection.isFavorite || false,
      is_default: connection.isDefault || false,
    }
  })
}

/**
 * Load all connections from database
 * @returns {Promise<Array>} Array of connection objects
 */
export async function dbLoadConnections() {
  const connections = await invoke('db_load_connections')
  // Transform to frontend format
  return connections.map(conn => ({
    id: conn.id,
    name: conn.name,
    host: conn.host,
    port: conn.port,
    username: conn.username,
    authType: conn.auth_type,
    password: conn.encrypted_password,
    keyPath: conn.encrypted_private_key,
    notes: conn.notes,
    isFavorite: conn.is_favorite,
    isDefault: conn.is_default,
    createdAt: conn.created_at,
    updatedAt: conn.updated_at,
    lastConnectedAt: conn.last_connected_at,
    status: 'unknown',
  }))
}

/**
 * Get a single connection from database
 * @param {string} connectionId - Connection ID
 */
export async function dbGetConnection(connectionId) {
  const conn = await invoke('db_get_connection', { connectionId })
  return {
    id: conn.id,
    name: conn.name,
    host: conn.host,
    port: conn.port,
    username: conn.username,
    authType: conn.auth_type,
    password: conn.encrypted_password,
    keyPath: conn.encrypted_private_key,
    notes: conn.notes,
    isFavorite: conn.is_favorite,
    isDefault: conn.is_default,
    createdAt: conn.created_at,
    updatedAt: conn.updated_at,
    lastConnectedAt: conn.last_connected_at,
    status: 'unknown',
  }
}

/**
 * Delete a connection from database
 * @param {string} connectionId - Connection ID to delete
 */
export async function dbDeleteConnection(connectionId) {
  return invoke('db_delete_connection', { connectionId })
}

/**
 * Update last connected timestamp
 * @param {string} connectionId - Connection ID
 */
export async function dbUpdateLastConnected(connectionId) {
  return invoke('db_update_last_connected', { connectionId })
}

// ============================================================================
// Database Metrics
// ============================================================================

/**
 * Save metrics snapshot to database
 * @param {string} connectionId - Connection ID
 * @param {Object} metrics - Metrics data from system
 */
export async function dbSaveMetrics(connectionId, metrics) {
  return invoke('db_save_metrics', {
    metrics: {
      connection_id: connectionId,
      cpu_usage: metrics.cpu?.usage || null,
      cpu_cores: metrics.cpu?.cores || null,
      load_avg_1: metrics.cpu?.loadAvg?.[0] || null,
      load_avg_5: metrics.cpu?.loadAvg?.[1] || null,
      load_avg_15: metrics.cpu?.loadAvg?.[2] || null,
      memory_total: metrics.memory?.total || null,
      memory_used: metrics.memory?.used || null,
      memory_free: metrics.memory?.free || null,
      memory_usage_percent: metrics.memory?.usedPercentage || null,
      swap_total: metrics.swap?.total || null,
      swap_used: metrics.swap?.used || null,
      swap_usage_percent: metrics.swap?.usedPercentage || null,
      disk_total: metrics.disk?.total || null,
      disk_used: metrics.disk?.used || null,
      disk_free: metrics.disk?.free || null,
      disk_usage_percent: metrics.disk?.usedPercentage || null,
      network_bytes_recv: metrics.network?.bytesRecv || null,
      network_bytes_sent: metrics.network?.bytesSent || null,
      network_packets_recv: metrics.network?.packetsRecv || null,
      network_packets_sent: metrics.network?.packetsSent || null,
      io_read_bytes: metrics.io?.readBytes || null,
      io_write_bytes: metrics.io?.writeBytes || null,
      io_read_ops: null,
      io_write_ops: null,
      cpu_temp: metrics.temperature?.cpu || null,
      gpu_temp: metrics.temperature?.gpu || null,
      gpu_usage: metrics.gpu?.usage || null,
      gpu_memory_used: metrics.gpu?.memoryUsed || null,
      gpu_memory_total: metrics.gpu?.memoryTotal || null,
      uptime_seconds: metrics.uptime?.seconds || null,
    }
  })
}

/**
 * Get metrics history from database
 * @param {string} connectionId - Connection ID
 * @param {number} hours - Number of hours to retrieve
 */
export async function dbGetMetricsHistory(connectionId, hours = 24) {
  const snapshots = await invoke('db_get_metrics_history', { connectionId, hours })
  // Transform to frontend format for charts
  return snapshots.map(s => ({
    timestamp: new Date(s.recorded_at).getTime(),
    cpu: { usage: s.cpu_usage },
    memory: { usedPercentage: s.memory_usage_percent },
    network: {
      bytesRecv: s.network_bytes_recv,
      bytesSent: s.network_bytes_sent,
    },
    disk: { usedPercentage: s.disk_usage_percent },
  }))
}

/**
 * Get metrics statistics from database
 * @param {string} connectionId - Connection ID
 * @param {number} hours - Number of hours for statistics
 */
export async function dbGetMetricsStats(connectionId, hours = 24) {
  return invoke('db_get_metrics_stats', { connectionId, hours })
}

/**
 * Cleanup old metrics from database
 * @param {number} retentionHours - Hours to retain
 */
export async function dbCleanupMetrics(retentionHours = 168) {
  return invoke('db_cleanup_metrics', { retentionHours })
}

// ============================================================================
// Database Docker
// ============================================================================

/**
 * Save Docker container to database
 * @param {string} connectionId - Connection ID
 * @param {Object} container - Container data
 */
export async function dbSaveDockerContainer(connectionId, container) {
  return invoke('db_save_docker_container', {
    container: {
      connection_id: connectionId,
      container_id: container.id,
      container_name: container.name,
      image: container.image || null,
      status: container.status || null,
      state: container.state || null,
    }
  })
}

/**
 * Save Docker metrics to database
 * @param {number} containerRefId - Container reference ID from database
 * @param {Object} metrics - Container metrics
 */
export async function dbSaveDockerMetrics(containerRefId, metrics) {
  return invoke('db_save_docker_metrics', {
    metrics: {
      container_ref_id: containerRefId,
      status: metrics.status || null,
      state: metrics.state || null,
      cpu_percent: metrics.cpuPercent || null,
      memory_usage: metrics.memoryUsage || null,
      memory_limit: metrics.memoryLimit || null,
      memory_percent: metrics.memoryPercent || null,
      net_input: metrics.netInput || null,
      net_output: metrics.netOutput || null,
      block_input: metrics.blockInput || null,
      block_output: metrics.blockOutput || null,
      pids: metrics.pids || null,
    }
  })
}

// ============================================================================
// Database Settings
// ============================================================================

/**
 * Get a setting from database
 * @param {string} key - Setting key
 */
export async function dbGetSetting(key) {
  return invoke('db_get_setting', { key })
}

/**
 * Set a setting in database
 * @param {string} key - Setting key
 * @param {string} value - Setting value
 * @param {string} settingType - Type: string, number, boolean, json
 */
export async function dbSetSetting(key, value, settingType = 'string') {
  return invoke('db_set_setting', { key, value, settingType })
}

// ============================================================================
// Utility: Check if running in Tauri
// ============================================================================

export function isTauri() {
  // Tauri v2 uses __TAURI_INTERNALS__ instead of __TAURI__
  return Boolean(window.__TAURI_INTERNALS__ || window.__TAURI__)
}
