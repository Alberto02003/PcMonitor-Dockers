# Roadmap - PC Monitoring & Dockers

Este documento define las mejoras futuras organizadas por prioridad y fase de desarrollo.

**Estado Actual**: App funcional con monitoreo SSH, Docker, métricas básicas, alertas, terminal SSH integrada y auto-actualización.

**Próximo Objetivo**: Sistema de monitorización avanzado con análisis detallado de todos los componentes del servidor, persistencia en MySQL.

---

## Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────────┐
│                        SERVIDOR LINUX (SSH)                         │
│  Fuentes: /proc/stat, /proc/meminfo, /proc/diskstats,              │
│           /proc/net/dev, ss, ps aux                                 │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      TAURI APP (Rust + React)                       │
│  - Recolección de métricas via SSH                                 │
│  - Cálculo de deltas para throughput                               │
│  - UI con tabs: System | Network | Dockers | Terminal              │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      API REST (Express.js)                          │
│  Puerto: 3001                                                       │
│  Endpoints: /api/metrics/*, /api/connections/*, /api/docker/*      │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      MYSQL Database                                 │
│  Retención: 24h detallado, 7d agregado, 30d resumen                │
│  Tablas: metrics_snapshots, metrics_cpu_detailed, ...              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## FASE 6: Base de Datos - Nuevas Tablas para Métricas Avanzadas

### 6.0 Schema de Base de Datos (MySQL)

**Ubicación**: `Api-Bd-Md/init/06-advanced-metrics-schema.sql`

#### 6.0.1 Tabla `metrics_cpu_detailed`
```sql
CREATE TABLE metrics_cpu_detailed (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  snapshot_id BIGINT NOT NULL,
  -- Per-core (JSON array)
  cores_usage JSON,  -- [{"core": 0, "usage": 45.2, "freq_mhz": 3200}, ...]
  -- Breakdown agregado
  user_percent DECIMAL(5,2),
  system_percent DECIMAL(5,2),
  idle_percent DECIMAL(5,2),
  iowait_percent DECIMAL(5,2),
  nice_percent DECIMAL(5,2),
  irq_percent DECIMAL(5,2),
  softirq_percent DECIMAL(5,2),
  steal_percent DECIMAL(5,2),
  -- Stats
  context_switches_per_sec BIGINT,
  interrupts_per_sec BIGINT,
  processes_running INT,
  processes_blocked INT,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (snapshot_id) REFERENCES metrics_snapshots(id) ON DELETE CASCADE,
  INDEX idx_snapshot (snapshot_id),
  INDEX idx_recorded (recorded_at)
);
```

#### 6.0.2 Tabla `metrics_memory_detailed`
```sql
CREATE TABLE metrics_memory_detailed (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  snapshot_id BIGINT NOT NULL,
  -- Desglose en bytes
  buffers BIGINT,
  cached BIGINT,
  swap_cached BIGINT,
  active BIGINT,
  inactive BIGINT,
  dirty BIGINT,
  writeback BIGINT,
  mapped BIGINT,
  shmem BIGINT,
  slab BIGINT,
  sreclaimable BIGINT,
  sunreclaim BIGINT,
  page_tables BIGINT,
  -- Huge pages
  hugepages_total INT,
  hugepages_free INT,
  hugepages_size_kb INT,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (snapshot_id) REFERENCES metrics_snapshots(id) ON DELETE CASCADE,
  INDEX idx_snapshot (snapshot_id),
  INDEX idx_recorded (recorded_at)
);
```

#### 6.0.3 Tabla `metrics_disk_io`
```sql
CREATE TABLE metrics_disk_io (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  snapshot_id BIGINT NOT NULL,
  device VARCHAR(50),
  mount_point VARCHAR(255),
  filesystem_type VARCHAR(50),
  -- Throughput (calculado como delta/segundo)
  read_ops_per_sec DECIMAL(12,2),
  write_ops_per_sec DECIMAL(12,2),
  read_bytes_per_sec BIGINT,
  write_bytes_per_sec BIGINT,
  -- I/O stats
  io_in_progress INT,
  io_time_ms BIGINT,
  weighted_io_time_ms BIGINT,
  avg_queue_size DECIMAL(8,2),
  avg_wait_ms DECIMAL(8,2),
  utilization_percent DECIMAL(5,2),
  -- Inodes
  inodes_used BIGINT,
  inodes_total BIGINT,
  inodes_percent DECIMAL(5,2),
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (snapshot_id) REFERENCES metrics_snapshots(id) ON DELETE CASCADE,
  INDEX idx_snapshot (snapshot_id),
  INDEX idx_device (device),
  INDEX idx_recorded (recorded_at)
);
```

#### 6.0.4 Tabla `metrics_network_detailed`
```sql
CREATE TABLE metrics_network_detailed (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  snapshot_id BIGINT NOT NULL,
  interface VARCHAR(50),
  -- Throughput (delta/segundo)
  rx_bytes_per_sec BIGINT,
  tx_bytes_per_sec BIGINT,
  rx_packets_per_sec BIGINT,
  tx_packets_per_sec BIGINT,
  -- Totales acumulados
  rx_bytes_total BIGINT,
  tx_bytes_total BIGINT,
  -- Errores
  rx_errors BIGINT,
  tx_errors BIGINT,
  rx_drops BIGINT,
  tx_drops BIGINT,
  collisions BIGINT,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (snapshot_id) REFERENCES metrics_snapshots(id) ON DELETE CASCADE,
  INDEX idx_snapshot (snapshot_id),
  INDEX idx_interface (interface),
  INDEX idx_recorded (recorded_at)
);
```

#### 6.0.5 Tabla `metrics_tcp_connections`
```sql
CREATE TABLE metrics_tcp_connections (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  snapshot_id BIGINT NOT NULL,
  established INT DEFAULT 0,
  time_wait INT DEFAULT 0,
  close_wait INT DEFAULT 0,
  listen INT DEFAULT 0,
  syn_sent INT DEFAULT 0,
  syn_recv INT DEFAULT 0,
  fin_wait1 INT DEFAULT 0,
  fin_wait2 INT DEFAULT 0,
  last_ack INT DEFAULT 0,
  closing INT DEFAULT 0,
  total_connections INT DEFAULT 0,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (snapshot_id) REFERENCES metrics_snapshots(id) ON DELETE CASCADE,
  INDEX idx_snapshot (snapshot_id),
  INDEX idx_recorded (recorded_at)
);
```

#### 6.0.6 Tabla `metrics_listening_ports`
```sql
CREATE TABLE metrics_listening_ports (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  snapshot_id BIGINT NOT NULL,
  port INT,
  protocol VARCHAR(10),
  address VARCHAR(50),
  process_name VARCHAR(100),
  pid INT,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (snapshot_id) REFERENCES metrics_snapshots(id) ON DELETE CASCADE,
  INDEX idx_snapshot (snapshot_id),
  INDEX idx_port (port)
);
```

#### 6.0.7 Tabla `metrics_processes`
```sql
CREATE TABLE metrics_processes (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  snapshot_id BIGINT NOT NULL,
  pid INT,
  name VARCHAR(255),
  username VARCHAR(100),
  state CHAR(1),
  cpu_percent DECIMAL(6,2),
  memory_percent DECIMAL(5,2),
  memory_rss_mb DECIMAL(12,2),
  memory_vsz_mb DECIMAL(12,2),
  threads INT,
  nice INT,
  cpu_time_seconds BIGINT,
  open_files INT,
  connections INT,
  command TEXT,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (snapshot_id) REFERENCES metrics_snapshots(id) ON DELETE CASCADE,
  INDEX idx_snapshot (snapshot_id),
  INDEX idx_pid (pid),
  INDEX idx_cpu (cpu_percent DESC),
  INDEX idx_recorded (recorded_at)
);
```

**Tareas**:
- [x] Crear archivo `06-advanced-metrics-schema.sql`
- [x] Crear stored procedures para cleanup de tablas nuevas
- [ ] Crear stored procedures para agregación horaria/diaria
- [x] Actualizar `cleanup_old_metrics()` para incluir nuevas tablas

---

### 6.1 API REST - Nuevos Endpoints

**Ubicación**: `Api-Bd-Md/api/src/routes/metrics-advanced.js`

#### Endpoints a crear:

```
# Guardar métricas avanzadas (batch - todo en un request)
POST /api/metrics/advanced
Body: {
  connectionId: "uuid",
  basic: { cpu, memory, disk, network, ... },  // metrics_snapshots
  cpuDetailed: { cores: [...], user, system, ... },
  memoryDetailed: { buffers, cached, slab, ... },
  diskIo: [{ device, readOps, writeOps, ... }],
  networkDetailed: [{ interface, rxBytesPerSec, ... }],
  tcpConnections: { established, timeWait, ... },
  listeningPorts: [{ port, protocol, process, ... }],
  processes: [{ pid, name, cpu, memory, ... }]
}

# Obtener métricas CPU detalladas
GET /api/metrics/cpu-detailed/:connectionId
Query: ?hours=24&interval=minute

# Obtener métricas memoria detalladas
GET /api/metrics/memory-detailed/:connectionId
Query: ?hours=24

# Obtener métricas disco I/O
GET /api/metrics/disk-io/:connectionId
Query: ?hours=24&device=sda

# Obtener métricas red detalladas
GET /api/metrics/network-detailed/:connectionId
Query: ?hours=24&interface=eth0

# Obtener conexiones TCP
GET /api/metrics/tcp-connections/:connectionId
Query: ?hours=24

# Obtener puertos escuchando (último snapshot)
GET /api/metrics/listening-ports/:connectionId

# Obtener procesos (último snapshot o histórico)
GET /api/metrics/processes/:connectionId
Query: ?hours=1&top=20&sortBy=cpu
```

**Tareas**:
- [x] Crear `routes/metrics-advanced.js`
- [x] Endpoint POST batch para guardar todas las métricas
- [x] Endpoints GET para cada tipo de métrica
- [x] Registrar rutas en `index.js`
- [ ] Añadir validación de datos (opcional, básica implementada)

---

## FASE 7: Sistema de Monitorización Avanzado (UI)

### 7.1 Refactor de Arquitectura UI

**Estructura de navegación principal**:
```
┌─────────────────────────────────────────────────────────────┐
│  [System ▾] [Network] [Dockers] [Terminal]                  │
└─────────────────────────────────────────────────────────────┘
         │
         └── Sub-tabs: [Overview] [CPU] [Memory] [Disk] [Processes]
```

**Tareas**:
- [ ] Añadir tab "Network" al MonitoringHeader
- [ ] Crear sub-navegación dentro de "System"
- [ ] Mantener estado del tab/sub-tab seleccionado

**Estructura de archivos**:
```
src/pages/MonitoringPage/
├── components/
│   ├── MonitoringHeader/          (modificar)
│   ├── SystemSection/             (nuevo)
│   │   ├── SystemSection.jsx
│   │   ├── SystemSection.css
│   │   └── tabs/
│   │       ├── OverviewTab/
│   │       ├── CpuTab/
│   │       ├── MemoryTab/
│   │       ├── DiskTab/
│   │       └── ProcessesTab/
│   ├── NetworkSection/            (nuevo)
│   │   ├── NetworkSection.jsx
│   │   └── NetworkSection.css
│   ├── DockersSection/            (existente)
│   └── TerminalSection/           (existente)
```

---

### 7.2 CPU Tab
**Métricas desde**: `metrics_cpu_detailed`

| Componente | Descripción |
|------------|-------------|
| Barra principal | CPU % agregado con color coding |
| Gráfico histórico | Chart.js con selector 1h/6h/24h/7d |
| Grid per-core | Barras horizontales por núcleo |
| Breakdown pie | User/System/IOWait/Idle |
| Stats cards | Context switches, interrupts, procs |

**Tareas Frontend**:
- [ ] Componente `CpuTab.jsx`
- [ ] Hook `useCpuMetrics(connectionId, range)`
- [ ] Gráfico de barras por core
- [ ] Pie chart de breakdown
- [ ] Sparklines para cada core

---

### 7.3 Memory Tab
**Métricas desde**: `metrics_memory_detailed`

| Componente | Descripción |
|------------|-------------|
| Barras RAM/Swap | Uso actual con porcentaje |
| Gráfico histórico | Stacked area chart |
| Breakdown cards | Used/Buffers/Cached/Available |
| Cache info | Slab, dirty, writeback |
| Top consumers | Top 5 procesos por memoria |

**Tareas Frontend**:
- [ ] Componente `MemoryTab.jsx`
- [ ] Hook `useMemoryMetrics(connectionId, range)`
- [ ] Stacked area chart RAM + Swap
- [ ] Cards de breakdown

---

### 7.4 Disk Tab
**Métricas desde**: `metrics_disk_io`

| Componente | Descripción |
|------------|-------------|
| Selector | Dropdown de discos/particiones |
| Barra uso | Espacio usado/total |
| Gráfico I/O | Dual line Read/Write MB/s |
| IOPS card | Operaciones por segundo |
| Latencia | Queue size, wait time |
| Inodos | Barra de uso de inodos |

**Tareas Frontend**:
- [ ] Componente `DiskTab.jsx`
- [ ] Hook `useDiskMetrics(connectionId, device, range)`
- [ ] Selector de disco
- [ ] Gráfico dual-line I/O

---

### 7.5 Network Section (Tab Principal)
**Métricas desde**: `metrics_network_detailed`, `metrics_tcp_connections`, `metrics_listening_ports`

| Componente | Descripción |
|------------|-------------|
| Selector interfaz | Tabs o dropdown eth0/docker0/lo |
| Throughput cards | RX/TX Mbps en tiempo real |
| Gráfico live | Actualización cada 2s |
| Stats table | Packets, errors, drops |
| TCP pie chart | Conexiones por estado |
| Ports table | Puertos escuchando con proceso |
| Top processes | Tráfico por proceso |

**Tareas Frontend**:
- [ ] Componente `NetworkSection.jsx`
- [ ] Hook `useNetworkMetrics(connectionId, interface)`
- [ ] Gráfico tiempo real con actualización
- [ ] Pie chart de conexiones TCP
- [ ] Tabla de puertos escuchando

---

### 7.6 Processes Tab
**Métricas desde**: `metrics_processes`

| Componente | Descripción |
|------------|-------------|
| Summary bar | Running/Sleeping/Zombie counts |
| Filters | Sort by, filter by name, limit |
| Table | PID, Name, CPU%, MEM%, Threads, State |
| Detail panel | Info expandida del proceso |
| Actions | Kill process button |

**Tareas Frontend**:
- [ ] Componente `ProcessesTab.jsx`
- [ ] Hook `useProcesses(connectionId, options)`
- [ ] Tabla ordenable/filtrable
- [ ] Panel de detalles
- [ ] Virtualización para listas largas

---

### 7.7 Overview Tab
**Métricas desde**: Todas las tablas (resumen)

| Componente | Descripción |
|------------|-------------|
| Health score | Puntuación 0-100 del servidor |
| KPI cards | CPU, RAM, Disk, Network con sparklines |
| Alertas | Alertas activas inline |
| Quick stats | Uptime, load, containers |

**Tareas Frontend**:
- [ ] Componente `OverviewTab.jsx`
- [ ] Calcular health score
- [ ] Cards con sparklines

---

## FASE 8: Backend Tauri - Recolección de Métricas

### 8.1 Nuevo Módulo de Métricas Avanzadas

**Ubicación**: `src-tauri/src/metrics_advanced.rs`

**Structs a crear**:
```rust
pub struct AdvancedMetrics {
    pub cpu: CpuDetailedMetrics,
    pub memory: MemoryDetailedMetrics,
    pub disks: Vec<DiskIOMetrics>,
    pub network: Vec<NetworkDetailedMetrics>,
    pub tcp: TcpConnectionStats,
    pub ports: Vec<ListeningPort>,
    pub processes: Vec<ProcessMetrics>,
}

pub struct CpuDetailedMetrics {
    pub cores: Vec<CoreUsage>,
    pub user_percent: f64,
    pub system_percent: f64,
    pub idle_percent: f64,
    pub iowait_percent: f64,
    // ...
}
// ... más structs
```

**Tareas Backend Rust**:
- [x] Crear `metrics_advanced.rs`
- [x] Parsear `/proc/stat` para CPU per-core
- [x] Parsear `/proc/meminfo` completo
- [x] Parsear `/proc/diskstats` con deltas
- [x] Parsear `/proc/net/dev` con deltas
- [x] Ejecutar `ss -tna` y parsear conexiones
- [x] Ejecutar `ss -tlnp` y parsear puertos
- [x] Parsear `ps aux` para procesos
- [x] Comando Tauri `get_advanced_metrics`
- [x] Guardar estado anterior para cálculo de deltas

---

### 8.2 Integración con API

**Ubicación**: `src/services/tauri.js` y `src/services/api.js`

**Flujo de datos**:
```
1. Tauri recolecta métricas via SSH
2. Frontend llama a saveAdvancedMetrics()
3. Se envía POST /api/metrics/advanced
4. MySQL guarda en todas las tablas
5. Frontend consulta GET /api/metrics/* para gráficos
```

**Tareas**:
- [ ] Función `saveAdvancedMetrics(connectionId, data)` en tauri.js
- [ ] Función `fetchCpuHistory(connectionId, range)` en api.js
- [ ] Función `fetchNetworkHistory(connectionId, range)` en api.js
- [ ] Hook `useAdvancedMetrics` para polling
- [ ] Intervalo de guardado: cada 5 segundos

---

## FASE 9: Funcionalidades Adicionales

### 9.1 SSL/TLS Certificate Monitor
- [ ] Check SSL de dominios
- [ ] Alertas antes de expirar

### 9.2 Systemd Services Manager
- [ ] Listar/gestionar servicios

### 9.3 Webhooks para Alertas
- [ ] Integración Slack/Discord/Telegram

---

## Registro de Progreso

| Fecha | Fase | Tarea | Estado |
|-------|------|-------|--------|
| 2025-01 | Core | SSH, Docker, Métricas básicas | ✅ |
| 2025-01 | Seguridad | Cifrado AES-256-GCM | ✅ |
| 2025-01 | UI | Terminal SSH integrada | ✅ |
| 2025-01 | DevOps | Auto-updater con GitHub Releases | ✅ |
| 2026-01-14 | 6.0 | Schema BD - Nuevas tablas (7 tablas + procedures + views) | ✅ |
| 2026-01-14 | 6.1 | API REST - Nuevos endpoints (metrics-advanced.js) | ✅ |
| 2026-01-14 | 8.1 | Backend Rust métricas avanzadas (metrics_advanced.rs) | ✅ |
| Pendiente | 7.1 | Refactor UI con Tabs | ⏳ |
| Pendiente | 7.2-7.7 | Componentes de tabs | ⏳ |

---

## Plan de Implementación

### Sprint 1: Base de Datos y API (3-4 días)
1. Crear `06-advanced-metrics-schema.sql` con todas las tablas
2. Crear stored procedures de cleanup y agregación
3. Crear `routes/metrics-advanced.js` con endpoints
4. Probar con datos de ejemplo via Postman/curl

### Sprint 2: Backend Tauri (3-4 días)
1. Crear `metrics_advanced.rs` con structs
2. Implementar parsers para /proc/*
3. Implementar parsers para ss commands
4. Crear comando `get_advanced_metrics`
5. Gestionar deltas para throughput

### Sprint 3: Frontend - Estructura (2-3 días)
1. Refactor MonitoringHeader con Network tab
2. Crear SystemSection con sub-tabs
3. Crear NetworkSection skeleton
4. Hooks para fetch de métricas

### Sprint 4: Frontend - Componentes (4-5 días)
1. CpuTab con gráficos
2. MemoryTab con gráficos
3. DiskTab con selector
4. NetworkSection completo
5. ProcessesTab con tabla

### Sprint 5: Polish y Testing (2 días)
1. Traducciones completas
2. Testing de flujo completo
3. Optimización de renders
4. Documentación

**Total estimado: 15-18 días**

---

## Comandos Linux de Referencia

```bash
# CPU detallado (per-core + breakdown)
cat /proc/stat

# Memoria detallada
cat /proc/meminfo

# Disk I/O (necesita delta entre lecturas)
cat /proc/diskstats

# Network throughput (necesita delta)
cat /proc/net/dev

# TCP connections por estado
ss -tna | awk 'NR>1 {print $1}' | sort | uniq -c

# Puertos escuchando con proceso
ss -tlnp

# Procesos detallados
ps aux --sort=-%cpu | head -20

# Threads por proceso
cat /proc/[pid]/status | grep Threads
```

---

## Notas Técnicas

- **Deltas**: Para rates (ops/s, MB/s) guardar lectura anterior y calcular diferencia
- **Intervalos**: 
  - Métricas básicas: cada 5 segundos
  - Guardado en BD: cada 5 segundos
  - Métricas avanzadas: cada 5 segundos
- **Retención MySQL**:
  - Detallado: 24 horas
  - Agregado por hora: 7 días
  - Agregado por día: 30 días
- **Cleanup**: Stored procedure ejecutado cada hora
- **Performance**: Virtualización para listas largas de procesos
