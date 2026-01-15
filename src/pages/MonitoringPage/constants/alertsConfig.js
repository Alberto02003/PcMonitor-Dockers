/**
 * Configuración de alertas por defecto y campos
 */

export const ALERTS_KEY_PREFIX = 'pcmd.alerts.v1'
export const WIDGETS_KEY_PREFIX = 'pcmd.widgets.v1'

export const defaultAlerts = {
  cpuUsage: { enabled: true, value: 85 },
  gpuUsage: { enabled: true, value: 85 },
  ramUsage: { enabled: true, value: 85 },
  diskUsage: { enabled: true, value: 90 },
  swapUsage: { enabled: false, value: 70 },
  cpuTemp: { enabled: true, value: 80 },
  gpuTemp: { enabled: false, value: 85 },
  loadAvg: { enabled: true, value: 1.5 },
  netIn: { enabled: false, value: 50 },
  netOut: { enabled: false, value: 50 },
  ioRead: { enabled: false, value: 120 },
  ioWrite: { enabled: false, value: 120 },
  latency: { enabled: false, value: 150 },
  dockerDown: { enabled: true },
  restarts: { enabled: false, value: 3 },
  // NEW: Advanced alerts
  cpuTrend: { enabled: false },
  ramTrend: { enabled: false },
  cpuRamCombined: { enabled: false },
}

export const alertFields = [
  { key: 'cpuUsage', label: 'CPU (%)', unit: '%' },
  { key: 'gpuUsage', label: 'GPU (%)', unit: '%' },
  { key: 'ramUsage', label: 'RAM (%)', unit: '%' },
  { key: 'diskUsage', label: 'Disco (%)', unit: '%' },
  { key: 'swapUsage', label: 'Swap (%)', unit: '%' },
  { key: 'cpuTemp', label: 'Temp CPU (C)', unit: 'C' },
  { key: 'gpuTemp', label: 'Temp GPU (C)', unit: 'C' },
  { key: 'loadAvg', label: 'Carga promedio', unit: '' },
  { key: 'netIn', label: 'Red entrada (Mb/s)', unit: 'Mb/s' },
  { key: 'netOut', label: 'Red salida (Mb/s)', unit: 'Mb/s' },
  { key: 'ioRead', label: 'IO lectura (MB/s)', unit: 'MB/s' },
  { key: 'ioWrite', label: 'IO escritura (MB/s)', unit: 'MB/s' },
  { key: 'latency', label: 'Latencia (ms)', unit: 'ms' },
  { key: 'dockerDown', label: 'Contenedor caido', unit: '', noValue: true },
  { key: 'restarts', label: 'Reinicios (>=)', unit: '' },
  // NEW: Advanced alerts
  { key: 'cpuTrend', label: 'CPU Tendencia (+5%/min)', unit: '', noValue: true },
  { key: 'ramTrend', label: 'RAM Tendencia (+5%/min)', unit: '', noValue: true },
  { key: 'cpuRamCombined', label: 'CPU + RAM Alto (80%)', unit: '', noValue: true },
]

export const defaultWidgetOrder = [
  'hero',
  'core-grid',
  'extended-grid',
  'details',
  'specs',
]
