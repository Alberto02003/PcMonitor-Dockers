import { invoke } from '@tauri-apps/api/core'

// ============================================================================
// Window Management API
// ============================================================================

/**
 * Show the main window (used after app initialization)
 */
export async function showWindow() {
  return invoke('show_window')
}

// ============================================================================
// Credential Encryption API - AES-256-GCM encryption for credentials
// ============================================================================

/**
 * Encrypt credentials before storing in database
 * @param {string|null} password - Plain text password
 * @param {string|null} keyPath - Plain text key path
 * @returns {Promise<{password: string|null, keyPath: string|null}>} Encrypted values
 */
export async function encryptCredentials(password, keyPath) {
  const [encryptedPassword, encryptedKeyPath] = await invoke('encrypt_credentials', {
    password: password || null,
    keyPath: keyPath || null,
  })
  return {
    password: encryptedPassword,
    keyPath: encryptedKeyPath,
  }
}

/**
 * Decrypt credentials loaded from database
 * @param {string|null} encryptedPassword - Encrypted password
 * @param {string|null} encryptedKeyPath - Encrypted key path  
 * @returns {Promise<{password: string|null, keyPath: string|null}>} Decrypted values
 */
export async function decryptCredentials(encryptedPassword, encryptedKeyPath) {
  const [password, keyPath] = await invoke('decrypt_credentials', {
    encryptedPassword: encryptedPassword || null,
    encryptedKeyPath: encryptedKeyPath || null,
  })
  return {
    password,
    keyPath,
  }
}

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
// System Metrics API
// ============================================================================

/**
 * Get basic system metrics (CPU, memory, disk, network)
 * @param {string} connectionId - Connection ID
 * @returns {Promise<Object>} System metrics
 */
export async function getSystemMetrics(connectionId) {
  return invoke('get_system_metrics', { connectionId })
}

/**
 * Get advanced system metrics (per-core CPU, detailed memory, disk I/O, network per-interface, TCP states, ports, processes)
 * @param {string} connectionId - Connection ID
 * @returns {Promise<Object>} Advanced metrics with:
 *   - cpu: {cores: [], userPercent, systemPercent, idlePercent, iowaitPercent, ...}
 *   - memory: {buffers, cached, slab, dirty, hugepages, ...}
 *   - disks: [{device, mountPoint, readOpsPerSec, writeBytesPerSec, utilizationPercent, ...}]
 *   - network: [{interface, rxBytesPerSec, txBytesPerSec, rxErrors, ...}]
 *   - tcp: {established, timeWait, closeWait, listen, total, ...}
 *   - ports: [{port, protocol, address, processName, pid}]
 *   - processes: [{pid, name, cpuPercent, memoryPercent, threads, ...}]
 */
export async function getAdvancedMetrics(connectionId) {
  return invoke('get_advanced_metrics', { connectionId })
}

/**
 * Kill a process by PID
 * @param {string} connectionId - Connection ID
 * @param {number} pid - Process ID
 * @param {number} signal - Signal to send (default: 15 for SIGTERM)
 * @returns {Promise<void>}
 */
export async function killProcess(connectionId, pid, signal = 15) {
  return invoke('kill_process', { connectionId, pid, signal })
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

export async function dockerRemove(connectionId, containerId, force = false) {
  return invoke('docker_remove', { connectionId, containerId, force })
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

// ============================================================================
// Auto-Updater API
// ============================================================================

/**
 * Check for available updates
 * @returns {Promise<{available: boolean, version?: string, notes?: string, date?: string} | null>}
 */
export async function checkForUpdates() {
  if (!isTauri()) return null
  
  try {
    const { check } = await import('@tauri-apps/plugin-updater')
    const update = await check()
    
    if (update) {
      return {
        available: true,
        version: update.version,
        notes: update.body,
        date: update.date,
        update, // Keep reference for download
      }
    }
    return { available: false }
  } catch (error) {
    // Handle case where no releases exist yet
    const errorMsg = error?.message || String(error)
    if (errorMsg.includes('Could not fetch') || errorMsg.includes('404')) {
      console.warn('No releases found yet - updater will work after first release is published')
      return { available: false, noReleases: true }
    }
    console.error('Error checking for updates:', error)
    return null
  }
}

/**
 * Download and install an update
 * @param {Object} update - Update object from checkForUpdates
 * @param {Function} onProgress - Progress callback (downloaded, total)
 * @returns {Promise<boolean>}
 */
export async function downloadAndInstallUpdate(update, onProgress) {
  if (!isTauri() || !update?.update) return false
  
  try {
    const { relaunch } = await import('@tauri-apps/plugin-process')
    
    let downloaded = 0
    let contentLength = 0
    
    await update.update.downloadAndInstall((event) => {
      switch (event.event) {
        case 'Started':
          contentLength = event.data.contentLength || 0
          if (onProgress) onProgress(0, contentLength)
          break
        case 'Progress':
          downloaded += event.data.chunkLength
          if (onProgress) onProgress(downloaded, contentLength)
          break
        case 'Finished':
          if (onProgress) onProgress(contentLength, contentLength)
          break
      }
    })
    
    // Restart app after install
    await relaunch()
    return true
  } catch (error) {
    console.error('Error installing update:', error)
    return false
  }
}

/**
 * Get current app version from Tauri
 * @returns {Promise<string>}
 */
export async function getAppVersion() {
  if (!isTauri()) return '0.0.0'
  
  try {
    const { getVersion } = await import('@tauri-apps/api/app')
    return await getVersion()
  } catch (error) {
    console.error('Error getting app version:', error)
    return '0.0.0'
  }
}
