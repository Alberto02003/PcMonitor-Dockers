import { invoke } from '@tauri-apps/api/core'

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
