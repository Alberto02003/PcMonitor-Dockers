/**
 * API Service - HTTP client for backend API
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

/**
 * Generic fetch wrapper with error handling
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  const response = await fetch(url, config);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  
  return response.json();
}

// ============================================================================
// Health Check
// ============================================================================

export async function checkHealth() {
  return request('/health'.replace('/api', ''));
}

export async function isApiConnected() {
  try {
    const health = await fetch(`${API_BASE_URL.replace('/api', '')}/health`);
    return health.ok;
  } catch {
    return false;
  }
}

// ============================================================================
// Connections API
// ============================================================================

export async function getConnections() {
  return request('/connections');
}

export async function getConnection(id) {
  return request(`/connections/${id}`);
}

export async function createConnection(connection) {
  return request('/connections', {
    method: 'POST',
    body: connection,
  });
}

export async function updateConnection(id, updates) {
  return request(`/connections/${id}`, {
    method: 'PUT',
    body: updates,
  });
}

export async function deleteConnection(id) {
  return request(`/connections/${id}`, {
    method: 'DELETE',
  });
}

export async function updateLastConnected(id) {
  return request(`/connections/${id}/last-connected`, {
    method: 'PATCH',
  });
}

export async function toggleFavorite(id) {
  return request(`/connections/${id}/favorite`, {
    method: 'PATCH',
  });
}

export async function toggleDefault(id) {
  return request(`/connections/${id}/default`, {
    method: 'PATCH',
  });
}

// ============================================================================
// Metrics API
// ============================================================================

export async function saveMetrics(connectionId, metrics) {
  return request('/metrics', {
    method: 'POST',
    body: {
      connectionId,
      ...metrics,
    },
  });
}

export async function getMetricsHistory(connectionId, hours = 24) {
  return request(`/metrics/${connectionId}?hours=${hours}`);
}

export async function getMetricsStats(connectionId, hours = 24) {
  return request(`/metrics/${connectionId}/stats?hours=${hours}`);
}

export async function cleanupMetrics(hours = 168) {
  return request(`/metrics/cleanup?hours=${hours}`, {
    method: 'DELETE',
  });
}

// ============================================================================
// Docker API
// ============================================================================

export async function saveDockerContainer(connectionId, container) {
  return request('/docker/containers', {
    method: 'POST',
    body: {
      connectionId,
      containerId: container.id,
      containerName: container.name,
      image: container.image,
      status: container.status,
      state: container.state,
    },
  });
}

export async function getDockerContainers(connectionId) {
  return request(`/docker/containers/${connectionId}`);
}

export async function saveDockerMetrics(containerRefId, metrics) {
  return request('/docker/metrics', {
    method: 'POST',
    body: {
      containerRefId,
      ...metrics,
    },
  });
}

export async function getDockerMetrics(containerRefId, hours = 24) {
  return request(`/docker/metrics/${containerRefId}?hours=${hours}`);
}

/**
 * Save multiple Docker containers with their metrics in batch
 * @param {string} connectionId - Connection ID
 * @param {Array} containers - Array of containers from Tauri docker_list
 */
export async function saveDockerBatch(connectionId, containers) {
  return request('/docker/batch', {
    method: 'POST',
    body: {
      connectionId,
      containers: containers.map(c => ({
        id: c.id,
        name: c.name,
        image: c.image,
        status: c.status,
        state: c.state,
        // Fields from Tauri use camelCase due to serde rename_all
        cpuPercent: c.cpuPercent,
        memoryUsage: Math.round((c.memoryUsageMb || 0) * 1024 * 1024), // Convert MB to bytes
        memoryLimit: Math.round((c.memoryLimitMb || 0) * 1024 * 1024), // Convert MB to bytes
        memoryPercent: c.memoryPercent,
        netInput: Math.round((c.netIoRxMb || 0) * 1024 * 1024), // Convert MB to bytes
        netOutput: Math.round((c.netIoTxMb || 0) * 1024 * 1024), // Convert MB to bytes
        blockInput: Math.round((c.blockIoReadMb || 0) * 1024 * 1024), // Convert MB to bytes
        blockOutput: Math.round((c.blockIoWriteMb || 0) * 1024 * 1024), // Convert MB to bytes
        pids: c.pids || 0,
      })),
    },
  });
}

// ============================================================================
// Settings API
// ============================================================================

export async function getSettings() {
  return request('/settings');
}

export async function getSetting(key) {
  return request(`/settings/${key}`);
}

export async function setSetting(key, value, type = 'string') {
  return request(`/settings/${key}`, {
    method: 'PUT',
    body: { value, type },
  });
}

export async function deleteSetting(key) {
  return request(`/settings/${key}`, {
    method: 'DELETE',
  });
}
