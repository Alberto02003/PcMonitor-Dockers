/**
 * Store global para metricas en tiempo real usando Zustand
 */

import { create } from 'zustand'

/**
 * Estado inicial
 */
const initialState = {
  // Metricas del sistema
  metrics: null,
  metricsLoading: true,
  metricsError: null,
  metricsLastUpdate: null,

  // Contenedores Docker
  containers: [],
  containersLoading: true,
  containersError: null,
  containersLastUpdate: null,

  // Logs de Docker
  logs: [],
  logsLoading: false,
  logsError: null,
  selectedContainerId: null,

  // Conexion activa
  activeConnectionId: null,
}

/**
 * Store de metricas
 */
export const useMetricsStore = create((set, get) => ({
  ...initialState,

  // === Metricas del Sistema ===

  setMetrics: (metrics) => set({
    metrics,
    metricsLoading: false,
    metricsError: null,
    metricsLastUpdate: new Date(),
  }),

  setMetricsLoading: (loading) => set({ metricsLoading: loading }),

  setMetricsError: (error) => set({
    metricsError: error,
    metricsLoading: false,
  }),

  // === Contenedores Docker ===

  setContainers: (containers) => set({
    containers: containers || [],
    containersLoading: false,
    containersError: null,
    containersLastUpdate: new Date(),
  }),

  setContainersLoading: (loading) => set({ containersLoading: loading }),

  setContainersError: (error) => set({
    containersError: error,
    containersLoading: false,
  }),

  updateContainerStatus: (containerId, status) => {
    set(state => ({
      containers: state.containers.map(c =>
        c.id === containerId ? { ...c, state: status } : c
      ),
    }))
  },

  // === Logs de Docker ===

  setLogs: (logs) => set({
    logs: logs || [],
    logsLoading: false,
    logsError: null,
  }),

  setLogsLoading: (loading) => set({ logsLoading: loading }),

  setLogsError: (error) => set({
    logsError: error,
    logsLoading: false,
  }),

  clearLogs: () => set({ logs: [], logsError: null }),

  setSelectedContainerId: (containerId) => set({
    selectedContainerId: containerId,
    logs: [],
    logsError: null,
  }),

  // === Conexion Activa ===

  setActiveConnectionId: (connectionId) => set({
    activeConnectionId: connectionId,
    // Reset data when connection changes
    metrics: null,
    metricsError: null,
    containers: [],
    containersError: null,
    logs: [],
    logsError: null,
  }),

  // === Selectores ===

  getContainer: (containerId) => {
    return get().containers.find(c => c.id === containerId) || null
  },

  getRunningContainers: () => {
    return get().containers.filter(c => c.state === 'running')
  },

  getStoppedContainers: () => {
    return get().containers.filter(c => c.state !== 'running')
  },

  // === Utilidades ===

  reset: () => set(initialState),

  resetMetrics: () => set({
    metrics: null,
    metricsLoading: true,
    metricsError: null,
    metricsLastUpdate: null,
  }),

  resetContainers: () => set({
    containers: [],
    containersLoading: true,
    containersError: null,
    containersLastUpdate: null,
  }),
}))

export default useMetricsStore
