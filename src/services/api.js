/**
 * API Service - HTTP client for backend API
 * URL is configured via VITE_API_URL environment variable in .env file
 * Default: http://192.168.1.149:3001/api
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://192.168.1.149:3001/api';

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
// Advanced Metrics API
// ============================================================================

/**
 * Save advanced metrics (CPU detailed, memory detailed, disk I/O, network, TCP, ports, processes)
 * @param {string} connectionId - Connection ID
 * @param {Object} basicMetrics - Basic system metrics for snapshot
 * @param {Object} advancedMetrics - Advanced metrics from Tauri
 */
export async function saveAdvancedMetrics(connectionId, basicMetrics, advancedMetrics) {
  return request('/metrics/advanced', {
    method: 'POST',
    body: {
      connectionId,
      // Basic metrics for snapshot table
      // Structure matches Rust SystemMetrics with camelCase (serde rename_all)
      basic: basicMetrics ? {
        cpu: {
          usage: basicMetrics.cpu?.usagePercent,  // Rust: usage_percent -> usagePercent
          cores: basicMetrics.cpu?.cores,
          loadAvg: [
            basicMetrics.cpu?.loadAvg1m,   // Rust: load_avg_1m -> loadAvg1m
            basicMetrics.cpu?.loadAvg5m,   // Rust: load_avg_5m -> loadAvg5m
            basicMetrics.cpu?.loadAvg15m,  // Rust: load_avg_15m -> loadAvg15m
          ],
        },
        memory: {
          total: basicMetrics.memory?.totalMb ? basicMetrics.memory.totalMb * 1024 * 1024 : null,
          used: basicMetrics.memory?.usedMb ? basicMetrics.memory.usedMb * 1024 * 1024 : null,
          free: basicMetrics.memory?.freeMb ? basicMetrics.memory.freeMb * 1024 * 1024 : null,
          available: basicMetrics.memory?.availableMb ? basicMetrics.memory.availableMb * 1024 * 1024 : null,
          usedPercentage: basicMetrics.memory?.usagePercent,
        },
        swap: {
          total: basicMetrics.memory?.swapTotalMb ? basicMetrics.memory.swapTotalMb * 1024 * 1024 : null,
          used: basicMetrics.memory?.swapUsedMb ? basicMetrics.memory.swapUsedMb * 1024 * 1024 : null,
          usedPercentage: basicMetrics.memory?.swapPercent,
        },
        disk: {
          total: basicMetrics.disks?.[0]?.totalGb ? basicMetrics.disks[0].totalGb * 1024 * 1024 * 1024 : null,
          used: basicMetrics.disks?.[0]?.usedGb ? basicMetrics.disks[0].usedGb * 1024 * 1024 * 1024 : null,
          free: basicMetrics.disks?.[0]?.freeGb ? basicMetrics.disks[0].freeGb * 1024 * 1024 * 1024 : null,
          usedPercentage: basicMetrics.disks?.[0]?.usagePercent,
        },
        network: {
          // Sum all interfaces
          bytesRecv: basicMetrics.network?.reduce((sum, n) => sum + (n.rxBytes || 0), 0),
          bytesSent: basicMetrics.network?.reduce((sum, n) => sum + (n.txBytes || 0), 0),
        },
        temperature: {
          cpu: basicMetrics.temperatures?.cpuTempC,  // Rust: cpu_temp_c -> cpuTempC
        },
        uptime: {
          seconds: basicMetrics.systemInfo?.uptimeSeconds,  // Rust: system_info.uptime_seconds -> systemInfo.uptimeSeconds
        },
      } : null,
      // CPU detailed
      cpuDetailed: advancedMetrics?.cpu ? {
        cores: advancedMetrics.cpu.cores,
        userPercent: advancedMetrics.cpu.userPercent,
        systemPercent: advancedMetrics.cpu.systemPercent,
        idlePercent: advancedMetrics.cpu.idlePercent,
        iowaitPercent: advancedMetrics.cpu.iowaitPercent,
        nicePercent: advancedMetrics.cpu.nicePercent,
        irqPercent: advancedMetrics.cpu.irqPercent,
        softirqPercent: advancedMetrics.cpu.softirqPercent,
        stealPercent: advancedMetrics.cpu.stealPercent,
        contextSwitchesPerSec: advancedMetrics.cpu.contextSwitchesPerSec,
        interruptsPerSec: advancedMetrics.cpu.interruptsPerSec,
        processesRunning: advancedMetrics.cpu.processesRunning,
        processesBlocked: advancedMetrics.cpu.processesBlocked,
      } : null,
      // Memory detailed
      memoryDetailed: advancedMetrics?.memory ? {
        buffers: advancedMetrics.memory.buffers,
        cached: advancedMetrics.memory.cached,
        swapCached: advancedMetrics.memory.swapCached,
        active: advancedMetrics.memory.active,
        inactive: advancedMetrics.memory.inactive,
        dirty: advancedMetrics.memory.dirty,
        writeback: advancedMetrics.memory.writeback,
        mapped: advancedMetrics.memory.mapped,
        shmem: advancedMetrics.memory.shmem,
        slab: advancedMetrics.memory.slab,
        sreclaimable: advancedMetrics.memory.sreclaimable,
        sunreclaim: advancedMetrics.memory.sunreclaim,
        pageTables: advancedMetrics.memory.pageTables,
        hugepagesTotal: advancedMetrics.memory.hugepagesTotal,
        hugepagesFree: advancedMetrics.memory.hugepagesFree,
        hugepagesSizeKb: advancedMetrics.memory.hugepagesSizeKb,
      } : null,
      // Disk I/O (array)
      diskIo: advancedMetrics?.disks?.map(disk => ({
        device: disk.device,
        mountPoint: disk.mountPoint,
        filesystemType: disk.filesystemType,
        readOpsPerSec: disk.readOpsPerSec,
        writeOpsPerSec: disk.writeOpsPerSec,
        readBytesPerSec: disk.readBytesPerSec,
        writeBytesPerSec: disk.writeBytesPerSec,
        ioInProgress: disk.ioInProgress,
        ioTimeMs: disk.ioTimeMs,
        weightedIoTimeMs: disk.weightedIoTimeMs,
        avgQueueSize: disk.avgQueueSize,
        avgWaitMs: disk.avgWaitMs,
        utilizationPercent: disk.utilizationPercent,
        inodesUsed: disk.inodesUsed,
        inodesTotal: disk.inodesTotal,
        inodesPercent: disk.inodesPercent,
      })) || null,
      // Network detailed (array)
      networkDetailed: advancedMetrics?.network?.map(net => ({
        interface: net.interface,
        rxBytesPerSec: net.rxSpeed || net.rxBytesPerSec,
        txBytesPerSec: net.txSpeed || net.txBytesPerSec,
        rxPacketsPerSec: net.rxPacketsPerSec,
        txPacketsPerSec: net.txPacketsPerSec,
        rxBytesTotal: net.rxBytes || net.rxBytesTotal,
        txBytesTotal: net.txBytes || net.txBytesTotal,
        rxErrors: net.rxErrors,
        txErrors: net.txErrors,
        rxDrops: net.rxDropped || net.rxDrops,
        txDrops: net.txDropped || net.txDrops,
        collisions: net.collisions,
      })) || null,
      // TCP connections
      tcpConnections: advancedMetrics?.tcp ? {
        established: advancedMetrics.tcp.established,
        timeWait: advancedMetrics.tcp.timeWait || advancedMetrics.tcp.time_wait,
        closeWait: advancedMetrics.tcp.closeWait || advancedMetrics.tcp.close_wait,
        listen: advancedMetrics.tcp.listen,
        synSent: advancedMetrics.tcp.synSent || advancedMetrics.tcp.syn_sent,
        synRecv: advancedMetrics.tcp.synRecv || advancedMetrics.tcp.syn_recv,
        finWait1: advancedMetrics.tcp.finWait1 || advancedMetrics.tcp.fin_wait1,
        finWait2: advancedMetrics.tcp.finWait2 || advancedMetrics.tcp.fin_wait2,
        lastAck: advancedMetrics.tcp.lastAck || advancedMetrics.tcp.last_ack,
        closing: advancedMetrics.tcp.closing,
        total: advancedMetrics.tcp.total,
      } : null,
      // Listening ports (array)
      listeningPorts: advancedMetrics?.listeningPorts?.map(port => ({
        port: port.port,
        protocol: port.protocol,
        address: port.address,
        processName: port.process || port.processName,
        pid: port.pid,
      })) || null,
      // Processes (array)
      processes: advancedMetrics?.processes?.map(proc => ({
        pid: proc.pid,
        name: proc.name,
        username: proc.user || proc.username,
        state: proc.state,
        cpuPercent: proc.cpuPercent || proc.cpu,
        memoryPercent: proc.memPercent || proc.memoryPercent,
        memoryRssMb: proc.rssMb || proc.memoryRssMb,
        memoryVszMb: proc.vszMb || proc.memoryVszMb,
        threads: proc.threads,
        nice: proc.nice,
        cpuTimeSeconds: proc.cpuTimeSeconds,
        openFiles: proc.openFiles,
        connections: proc.connections,
        command: proc.command,
      })) || null,
    },
  });
}

/**
 * Get advanced CPU history
 */
export async function getAdvancedCpuHistory(connectionId, hours = 24) {
  return request(`/metrics/advanced/cpu/${connectionId}?hours=${hours}`);
}

/**
 * Get advanced memory history
 */
export async function getAdvancedMemoryHistory(connectionId, hours = 24) {
  return request(`/metrics/advanced/memory/${connectionId}?hours=${hours}`);
}

/**
 * Get advanced disk I/O history
 */
export async function getAdvancedDiskHistory(connectionId, hours = 24, device = null) {
  const params = new URLSearchParams({ hours });
  if (device) params.append('device', device);
  return request(`/metrics/advanced/disk/${connectionId}?${params}`);
}

/**
 * Get advanced network history
 */
export async function getAdvancedNetworkHistory(connectionId, hours = 24, iface = null) {
  const params = new URLSearchParams({ hours });
  if (iface) params.append('interface', iface);
  return request(`/metrics/advanced/network/${connectionId}?${params}`);
}

/**
 * Get TCP connection history
 */
export async function getAdvancedTcpHistory(connectionId, hours = 24) {
  return request(`/metrics/advanced/tcp/${connectionId}?hours=${hours}`);
}

/**
 * Get latest listening ports
 */
export async function getListeningPorts(connectionId) {
  return request(`/metrics/advanced/ports/${connectionId}`);
}

/**
 * Get latest processes
 */
export async function getLatestProcesses(connectionId, sortBy = 'cpu', limit = 50) {
  return request(`/metrics/advanced/processes/${connectionId}?sortBy=${sortBy}&limit=${limit}`);
}

/**
 * Get full advanced metrics summary
 */
export async function getAdvancedSummary(connectionId) {
  return request(`/metrics/advanced/summary/${connectionId}`);
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
 * @param {Object} extras - Optional: { images, volumes, networks }
 */
export async function saveDockerBatch(connectionId, containers, extras = {}) {
  return request('/docker/batch', {
    method: 'POST',
    body: {
      connectionId,
      containers: containers?.map(c => ({
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
      })) || [],
      // Images from Tauri docker_images
      images: extras.images?.map(img => ({
        id: img.id,
        repoTags: img.repoTags,
        size: img.size,
        created: img.created,
      })) || null,
      // Volumes from Tauri docker_volumes
      volumes: extras.volumes?.map(vol => ({
        name: vol.name,
        driver: vol.driver,
        mountpoint: vol.mountpoint,
        scope: vol.scope,
        labels: vol.labels,
      })) || null,
      // Networks from Tauri (if available)
      networks: extras.networks?.map(net => ({
        id: net.id,
        name: net.name,
        driver: net.driver,
        scope: net.scope,
        internal: net.internal,
        attachable: net.attachable,
        ipam: net.ipam,
        containers: net.containers,
      })) || null,
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
