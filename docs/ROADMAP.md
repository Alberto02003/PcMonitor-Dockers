# Roadmap - PC Monitoring & Dockers

Este documento define las mejoras futuras organizadas por prioridad y fase de desarrollo.

**Estado Actual**: App funcional con monitoreo SSH, Docker, métricas básicas, alertas, terminal SSH integrada y auto-actualización.

**Próximo Objetivo**: Sistema de monitorización avanzado con análisis detallado de todos los componentes del servidor.

---

## FASE 6: Sistema de Monitorización Avanzado (PRIORIDAD MÁXIMA)

### 6.1 Refactor de Arquitectura UI
**Objetivo**: Reorganizar la vista de monitorización con nueva estructura de navegación

**Estructura de navegación principal (Header)**:
```
┌─────────────────────────────────────────────────────────────┐
│  [System ▾] [Network] [Dockers] [Terminal]                  │
└─────────────────────────────────────────────────────────────┘
         │
         └── Sub-tabs: [Overview] [CPU] [Memory] [Disk] [Processes]
```

**Network como tab principal** al mismo nivel que System, Dockers y Terminal.

**Tareas**:
- [ ] Añadir tab "Network" al MonitoringHeader
- [ ] Crear sub-navegación dentro de "System" con tabs secundarios
- [ ] Sub-tabs de System: Overview | CPU | Memory | Disk | Processes
- [ ] Mantener estado del tab/sub-tab seleccionado
- [ ] Transiciones suaves entre vistas

**Estructura de archivos**:
```
src/pages/MonitoringPage/
├── components/
│   ├── MonitoringHeader/          (modificar - añadir Network)
│   ├── SystemSection/             (nuevo - contenedor con sub-tabs)
│   │   ├── SystemSection.jsx
│   │   ├── SystemSection.css
│   │   └── tabs/
│   │       ├── OverviewTab/
│   │       ├── CpuTab/
│   │       ├── MemoryTab/
│   │       ├── DiskTab/
│   │       └── ProcessesTab/
│   ├── NetworkSection/            (nuevo - análisis de red completo)
│   │   ├── NetworkSection.jsx
│   │   └── NetworkSection.css
│   ├── DockersSection/            (existente)
│   └── TerminalSection/           (existente)
```

---

### 6.2 CPU Avanzado
**Objetivo**: Análisis detallado de CPU con métricas por core

**Métricas a recolectar**:
| Métrica | Fuente Linux | Descripción |
|---------|--------------|-------------|
| Per-core usage % | `/proc/stat` | Uso por cada núcleo |
| User % | `/proc/stat` | Tiempo en modo usuario |
| System % | `/proc/stat` | Tiempo en modo kernel |
| IOWait % | `/proc/stat` | Esperando I/O |
| Idle % | `/proc/stat` | Tiempo inactivo |
| Nice % | `/proc/stat` | Procesos con prioridad baja |
| IRQ % | `/proc/stat` | Interrupciones hardware |
| SoftIRQ % | `/proc/stat` | Interrupciones software |
| Steal % | `/proc/stat` | Tiempo robado (VMs) |
| Context switches/s | `/proc/stat` | Cambios de contexto |
| Interrupts/s | `/proc/stat` | Interrupciones por segundo |
| Processes running | `/proc/stat` | Procesos ejecutándose |
| Processes blocked | `/proc/stat` | Procesos bloqueados |
| Frequency per core | `/proc/cpuinfo` | MHz por núcleo |

**Tareas Backend**:
- [ ] Crear `CpuAdvancedMetrics` struct en Rust
- [ ] Parsear `/proc/stat` completo
- [ ] Calcular deltas entre lecturas para rates
- [ ] Comando `get_cpu_advanced_metrics`

**Tareas Frontend**:
- [ ] Componente `CpuTab.jsx`
- [ ] Gráfico de barras horizontales por core
- [ ] Gráfico circular de breakdown (user/system/idle)
- [ ] Sparklines para cada core
- [ ] Gráfico histórico con Chart.js (1h/6h/24h)
- [ ] Tabla de estadísticas

**UI Mockup**:
```
┌─────────────────────────────────────────────────────────────┐
│  CPU Usage: 45%                    Load: 2.34 / 1.89 / 1.45 │
│  ████████████████░░░░░░░░░░░░░░░░                           │
├─────────────────────────────────────────────────────────────┤
│  [Gráfico histórico - selección de rango temporal]          │
├─────────────────────────────────────────────────────────────┤
│  Per-Core Usage:                                            │
│  Core 0: ██████████░░░░░░░░░░ 52%  Core 4: ████████░░░░ 41% │
│  Core 1: ████████████████░░░░ 78%  Core 5: ██████░░░░░░ 32% │
│  Core 2: ████░░░░░░░░░░░░░░░░ 23%  Core 6: ██████████░░ 55% │
│  Core 3: ██████████████░░░░░░ 67%  Core 7: ████████████ 61% │
├─────────────────────────────────────────────────────────────┤
│  Breakdown:                     │  Stats:                   │
│  User:   35%  ████████░░░░     │  Context switches: 45.2k/s│
│  System: 10%  ███░░░░░░░░░     │  Interrupts: 12.8k/s      │
│  IOWait:  2%  █░░░░░░░░░░░     │  Procs running: 3         │
│  Idle:   53%  █████████████    │  Procs blocked: 0         │
└─────────────────────────────────────────────────────────────┘
```

---

### 6.3 Memoria Avanzada
**Objetivo**: Desglose completo del uso de memoria

**Métricas a recolectar**:
| Métrica | Fuente Linux | Descripción |
|---------|--------------|-------------|
| Total | `/proc/meminfo` | RAM total |
| Used | Calculado | RAM en uso |
| Free | `/proc/meminfo` | RAM libre |
| Available | `/proc/meminfo` | RAM disponible |
| Buffers | `/proc/meminfo` | Buffers de kernel |
| Cached | `/proc/meminfo` | Page cache |
| SwapCached | `/proc/meminfo` | Swap en cache |
| Active | `/proc/meminfo` | Memoria activa |
| Inactive | `/proc/meminfo` | Memoria inactiva |
| Dirty | `/proc/meminfo` | Pendiente de escribir |
| Writeback | `/proc/meminfo` | Escribiéndose ahora |
| Mapped | `/proc/meminfo` | Archivos mapeados |
| Shmem | `/proc/meminfo` | Memoria compartida |
| Slab | `/proc/meminfo` | Estructuras kernel |
| SReclaimable | `/proc/meminfo` | Slab recuperable |
| SUnreclaim | `/proc/meminfo` | Slab no recuperable |
| PageTables | `/proc/meminfo` | Tablas de páginas |
| SwapTotal | `/proc/meminfo` | Swap total |
| SwapUsed | Calculado | Swap usado |
| HugePages_Total | `/proc/meminfo` | Huge pages totales |
| HugePages_Free | `/proc/meminfo` | Huge pages libres |

**Tareas Backend**:
- [ ] Crear `MemoryAdvancedMetrics` struct
- [ ] Parsear `/proc/meminfo` completo
- [ ] Calcular memoria por categoría
- [ ] Comando `get_memory_advanced_metrics`

**Tareas Frontend**:
- [ ] Componente `MemoryTab.jsx`
- [ ] Gráfico stacked area (RAM + Swap)
- [ ] Breakdown visual (Used/Buffers/Cached/Free)
- [ ] Top memory consumers (procesos)
- [ ] Gráfico histórico con Chart.js

**UI Mockup**:
```
┌─────────────────────────────────────────────────────────────┐
│  RAM: 12.4 GB / 32 GB (38.8%)   Swap: 0.2 GB / 8 GB (2.5%) │
│  ████████████░░░░░░░░░░░░░░░░░░  █░░░░░░░░░░░░░░░░░░░░░░░░ │
├─────────────────────────────────────────────────────────────┤
│  [Gráfico histórico RAM + Swap - stacked area chart]        │
├─────────────────────────────────────────────────────────────┤
│  Memory Breakdown:              │  Cache Info:              │
│  Used:      8.2 GB ████████    │  Page cache: 3.8 GB       │
│  Buffers:   0.4 GB █           │  Slab: 0.6 GB             │
│  Cached:    3.8 GB ████        │  Dirty: 12 MB             │
│  Available: 19.6 GB            │  Writeback: 0 MB          │
├─────────────────────────────────────────────────────────────┤
│  Top Memory Consumers:                                      │
│  1. java           2.4 GB  ████████████░░░░░░░░             │
│  2. postgres       1.8 GB  █████████░░░░░░░░░░░             │
│  3. node           0.9 GB  ████░░░░░░░░░░░░░░░░             │
└─────────────────────────────────────────────────────────────┘
```

---

### 6.4 Disco I/O Avanzado
**Objetivo**: Métricas de rendimiento de disco en tiempo real

**Métricas a recolectar**:
| Métrica | Fuente Linux | Descripción |
|---------|--------------|-------------|
| Read ops/sec | `/proc/diskstats` | Operaciones de lectura |
| Write ops/sec | `/proc/diskstats` | Operaciones de escritura |
| Read MB/s | `/proc/diskstats` | Throughput lectura |
| Write MB/s | `/proc/diskstats` | Throughput escritura |
| Read merged/s | `/proc/diskstats` | Lecturas fusionadas |
| Write merged/s | `/proc/diskstats` | Escrituras fusionadas |
| IO in progress | `/proc/diskstats` | IOs activos |
| IO time ms | `/proc/diskstats` | Tiempo en IO |
| Weighted IO time | `/proc/diskstats` | Tiempo ponderado |
| Avg queue size | Calculado | Profundidad de cola |
| Avg wait time ms | Calculado | Latencia promedio |
| Utilization % | Calculado | % tiempo ocupado |
| Inodes used | `df -i` | Inodos usados |
| Inodes total | `df -i` | Inodos totales |

**Tareas Backend**:
- [ ] Crear `DiskIOMetrics` struct
- [ ] Parsear `/proc/diskstats`
- [ ] Calcular deltas para rates (ops/s, MB/s)
- [ ] Calcular utilización y latencia
- [ ] Comando `get_disk_io_metrics`

**Tareas Frontend**:
- [ ] Componente `DiskTab.jsx`
- [ ] Selector de disco (dropdown)
- [ ] Gráfico dual-line (Read/Write MB/s)
- [ ] Métricas de IOPS
- [ ] Indicadores de latencia
- [ ] Barra de uso de inodos
- [ ] Gráfico histórico

**UI Mockup**:
```
┌─────────────────────────────────────────────────────────────┐
│  Select Disk: [/dev/sda1 ▾]    [/dev/sdb1]    [/dev/nvme0] │
├─────────────────────────────────────────────────────────────┤
│  /dev/sda1 mounted on /                                     │
│  Usage: 156 GB / 500 GB (31.2%)                             │
│  ██████████░░░░░░░░░░░░░░░░░░░░░                            │
├─────────────────────────────────────────────────────────────┤
│  [Gráfico I/O: Read/Write MB/s - dual line chart]          │
├─────────────────────────────────────────────────────────────┤
│  I/O Performance:               │  Capacity:                │
│  Read:  45.2 MB/s  ████████    │  Inodes: 2.1M / 32M (6%)  │
│  Write: 12.8 MB/s  ███░░░░░    │  Block size: 4096         │
│  IOPS:  1,245 ops/s            │  Type: NVMe SSD           │
│  Queue: 2.3 avg                │  Filesystem: ext4         │
│  Wait:  0.8 ms avg             │                           │
└─────────────────────────────────────────────────────────────┘
```

---

### 6.5 Network Analyzer (TAB PRINCIPAL - NUEVO)
**Objetivo**: Tab principal de análisis avanzado de red (al mismo nivel que System, Dockers, Terminal)

**Ubicación en UI**: Header → [System] [**Network**] [Dockers] [Terminal]

#### 6.5.1 Throughput en Tiempo Real
**Métricas**:
| Métrica | Fuente Linux | Descripción |
|---------|--------------|-------------|
| RX bytes/sec | `/proc/net/dev` delta | Throughput descarga |
| TX bytes/sec | `/proc/net/dev` delta | Throughput subida |
| RX packets/sec | `/proc/net/dev` delta | Paquetes recibidos |
| TX packets/sec | `/proc/net/dev` delta | Paquetes enviados |
| RX errors | `/proc/net/dev` | Errores recepción |
| TX errors | `/proc/net/dev` | Errores transmisión |
| RX drops | `/proc/net/dev` | Paquetes descartados RX |
| TX drops | `/proc/net/dev` | Paquetes descartados TX |
| Collisions | `/proc/net/dev` | Colisiones |
| Multicast | `/proc/net/dev` | Paquetes multicast |

#### 6.5.2 Conexiones TCP/UDP
**Métricas**:
| Métrica | Fuente Linux | Descripción |
|---------|--------------|-------------|
| ESTABLISHED | `ss -tna` | Conexiones establecidas |
| TIME_WAIT | `ss -tna` | Esperando cierre |
| CLOSE_WAIT | `ss -tna` | Esperando cierre app |
| LISTEN | `ss -tna` | Puertos escuchando |
| SYN_SENT | `ss -tna` | Conexiones iniciando |
| SYN_RECV | `ss -tna` | Conexiones aceptando |
| FIN_WAIT1/2 | `ss -tna` | Finalizando |
| LAST_ACK | `ss -tna` | Último ACK |
| Total connections | Conteo | Total de conexiones |

#### 6.5.3 Puertos y Servicios
**Métricas**:
| Métrica | Fuente Linux | Descripción |
|---------|--------------|-------------|
| Port number | `ss -tlnp` | Puerto escuchando |
| Protocol | `ss -tlnp` | TCP/UDP |
| Process name | `ss -tlnp` | Proceso dueño |
| PID | `ss -tlnp` | ID del proceso |
| Connections count | `ss -tn` | Conexiones por puerto |

#### 6.5.4 Tráfico por Proceso (requiere nethogs o ss)
**Métricas**:
| Métrica | Fuente Linux | Descripción |
|---------|--------------|-------------|
| Process name | `ss -tnp` / `nethogs` | Nombre proceso |
| PID | `ss -tnp` | ID proceso |
| RX bytes | `nethogs` o estimado | Bytes recibidos |
| TX bytes | `nethogs` o estimado | Bytes enviados |
| Connections | `ss -tnp` | Conexiones activas |

**Tareas Backend**:
- [ ] Crear módulo `src-tauri/src/network_analyzer.rs`
- [ ] Struct `NetworkAdvancedMetrics`
- [ ] Struct `TcpConnectionStats`
- [ ] Struct `ListeningPort`
- [ ] Struct `ProcessNetworkUsage`
- [ ] Parsear `/proc/net/dev` con deltas
- [ ] Parsear output de `ss` commands
- [ ] Comando `get_network_advanced_metrics`
- [ ] Comando `get_tcp_connections`
- [ ] Comando `get_listening_ports`
- [ ] Comando `get_network_by_process`

**Tareas Frontend**:
- [ ] Componente `NetworkTab.jsx`
- [ ] Selector de interfaz
- [ ] Gráfico tiempo real RX/TX (live updating)
- [ ] Tabla de estadísticas de interfaz
- [ ] Gráfico pie de estados TCP
- [ ] Lista de puertos escuchando
- [ ] Top conexiones por tráfico
- [ ] Tabla de tráfico por proceso

**UI Mockup**:
```
┌─────────────────────────────────────────────────────────────┐
│  Interface: [eth0 ▾]   [docker0]   [lo]                     │
├─────────────────────────────────────────────────────────────┤
│  Throughput:                                                │
│  ↓ Download: 125.4 Mbps        ↑ Upload: 23.8 Mbps         │
│  [Gráfico tiempo real RX/TX - live updating chart]          │
├─────────────────────────────────────────────────────────────┤
│  Statistics:                    │  Errors:                  │
│  RX Packets: 1.2M/s            │  RX Errors: 0             │
│  TX Packets: 0.8M/s            │  TX Errors: 0             │
│  Total RX: 458.2 GB            │  RX Drops: 12             │
│  Total TX: 89.4 GB             │  TX Drops: 0              │
├─────────────────────────────────────────────────────────────┤
│  TCP Connections:               │  Listening Ports:         │
│  ESTABLISHED: 234              │  :22   ssh    (sshd)      │
│  TIME_WAIT:   45               │  :80   http   (nginx)     │
│  CLOSE_WAIT:  2                │  :443  https  (nginx)     │
│  LISTEN:      12               │  :5432 postgresql         │
│  [Pie chart por estado]        │  :6379 redis              │
├─────────────────────────────────────────────────────────────┤
│  Top Processes by Network:                                  │
│  Process         PID      ↓ Down      ↑ Up      Conns      │
│  nginx           12453    45 MB/s     12 MB/s   234        │
│  postgres        8921     8 MB/s      2 MB/s    45         │
│  sshd            1234     0.5 MB/s    0.1 MB/s  3          │
└─────────────────────────────────────────────────────────────┘
```

---

### 6.6 Procesos Avanzado
**Objetivo**: Vista detallada de procesos con filtros y ordenamiento

**Métricas por proceso**:
| Métrica | Fuente Linux | Descripción |
|---------|--------------|-------------|
| PID | `ps` / `/proc` | ID del proceso |
| Name | `ps` / `/proc` | Nombre del proceso |
| User | `ps` | Usuario propietario |
| State | `/proc/[pid]/status` | R/S/D/Z/T |
| CPU % | `ps` / top | Uso de CPU |
| MEM % | `ps` | Uso de memoria % |
| MEM MB | Calculado | Memoria en MB |
| VSZ | `ps` | Memoria virtual |
| RSS | `ps` | Memoria residente |
| Threads | `/proc/[pid]/status` | Número de threads |
| Nice | `ps` | Valor de prioridad |
| Start time | `ps` | Hora de inicio |
| CPU time | `ps` | Tiempo de CPU usado |
| Command | `ps` | Comando completo |
| Open files | `/proc/[pid]/fd` count | Archivos abiertos |
| Connections | `ss -tnp` | Conexiones de red |

**Tareas Backend**:
- [ ] Crear `ProcessAdvancedMetrics` struct
- [ ] Parsear `ps aux` o `/proc/[pid]/*`
- [ ] Obtener threads, open files
- [ ] Comando `get_processes_advanced`
- [ ] Comando `kill_process(pid, signal)`

**Tareas Frontend**:
- [ ] Componente `ProcessesTab.jsx`
- [ ] Tabla ordenable por cualquier columna
- [ ] Filtro por nombre
- [ ] Paginación o virtualización
- [ ] Click en proceso para detalles
- [ ] Botón kill con confirmación
- [ ] Resumen: Running/Sleeping/Zombie counts

**UI Mockup**:
```
┌─────────────────────────────────────────────────────────────┐
│  Running: 245   Sleeping: 890   Zombie: 0   Total: 1,135   │
├─────────────────────────────────────────────────────────────┤
│  Sort by: [CPU ▾]  Filter: [___________]  Show: [20 ▾]     │
├─────────────────────────────────────────────────────────────┤
│  PID     Name          CPU%   MEM%   MEM MB   Threads  St  │
│  12453   java          45.2   7.5    2,400    89       R   │
│  8921    postgres      12.8   5.6    1,792    24       S   │
│  15678   node          8.4    2.8    896      12       S   │
│  1       systemd       0.1    0.2    64       1        S   │
│  ...                                                        │
├─────────────────────────────────────────────────────────────┤
│  [Selected process details panel with kill button]          │
└─────────────────────────────────────────────────────────────┘
```

---

### 6.7 Overview Tab (Dashboard Mejorado)
**Objetivo**: Vista resumen con los KPIs más importantes

**Componentes**:
- Health score general (0-100)
- KPI cards: CPU, RAM, Disk, Network
- Sparklines en cada card
- Alertas activas
- Uptime y load average
- Quick actions

**Tareas**:
- [ ] Componente `OverviewTab.jsx`
- [ ] Calcular health score
- [ ] Mostrar alertas activas inline
- [ ] Links rápidos a cada tab detallado

---

### 6.8 Gráficos Históricos con Chart.js
**Objetivo**: Visualización de histórico de métricas

**Funcionalidades**:
- [ ] Selector de rango: 1h, 6h, 24h, 7d, custom
- [ ] Zoom y pan interactivo
- [ ] Tooltips con valores exactos
- [ ] Múltiples series en un gráfico
- [ ] Exportar gráfico como imagen
- [ ] Min/Max/Avg en leyenda

**Tareas**:
- [ ] Componente `MetricChart.jsx` (wrapper Chart.js)
- [ ] Hook `useMetricHistory(metricName, range)`
- [ ] Almacenar histórico en memoria (últimas 24h)
- [ ] Agregación por minuto/hora según rango

---

## FASE 7: Persistencia y Almacenamiento

### 7.1 Histórico Persistente (SQLite)
**Objetivo**: Guardar métricas para análisis posterior

**Tareas**:
- [ ] Crear base de datos SQLite local
- [ ] Tabla `metrics_history`
- [ ] Insertar métricas cada minuto
- [ ] Retención: 24h detallado, 7d por hora, 30d por día
- [ ] Comando `get_metrics_history(range)`
- [ ] Exportar a CSV/JSON

---

## FASE 8: Funcionalidades Adicionales

### 8.1 SSL/TLS Certificate Monitor
**Tareas**:
- [ ] Check SSL de dominios
- [ ] Ver fecha de expiración
- [ ] Alertas antes de expirar
- [ ] Ver cadena de certificados

### 8.2 Systemd Services Manager
**Tareas**:
- [ ] Listar servicios systemd
- [ ] Start/Stop/Restart servicios
- [ ] Ver logs de servicio
- [ ] Enable/Disable servicios

### 8.3 Cron Jobs Manager
**Tareas**:
- [ ] Listar crontabs
- [ ] Editar/agregar/eliminar crons
- [ ] Ver historial de ejecuciones

---

## FASE 9: DevOps & Integraciones

### 9.1 Webhooks para Alertas
**Tareas**:
- [ ] Webhook cuando hay alerta
- [ ] Integración Slack/Discord/Telegram
- [ ] Custom HTTP requests

### 9.2 API REST
**Tareas**:
- [ ] Exponer métricas via API
- [ ] Documentación OpenAPI
- [ ] API keys management

---

## Registro de Progreso

| Fecha | Fase | Tarea | Estado |
|-------|------|-------|--------|
| 2025-01 | Core | SSH, Docker, Métricas básicas | ✅ |
| 2025-01 | Seguridad | Cifrado AES-256-GCM | ✅ |
| 2025-01 | UI | Terminal SSH integrada | ✅ |
| 2025-01 | DevOps | Auto-updater con GitHub Releases | ✅ |
| Pendiente | 6.1 | Refactor UI con Tabs | ⏳ |
| Pendiente | 6.2 | CPU Avanzado | ⏳ |
| Pendiente | 6.3 | Memoria Avanzada | ⏳ |
| Pendiente | 6.4 | Disco I/O | ⏳ |
| Pendiente | 6.5 | Network Analyzer | ⏳ |
| Pendiente | 6.6 | Procesos Avanzado | ⏳ |

---

## Prioridad de Implementación

### Sprint 1 (Backend - Métricas Avanzadas)
1. CPU Avanzado (6.2) - Métricas per-core, breakdown, context switches
2. Memoria Avanzada (6.3) - Buffers, cached, slab, desglose completo
3. Disco I/O (6.4) - Read/write ops, throughput, latencia
4. Network Analyzer (6.5) - Throughput real, conexiones TCP, puertos
5. Procesos Avanzado (6.6) - Threads, open files, métricas extendidas

### Sprint 2 (Frontend - Estructura UI)
1. Refactor Header (6.1) - Añadir tab Network principal
2. SystemSection con sub-tabs internos
3. NetworkSection como panel completo
4. Sub-tabs: OverviewTab, CpuTab, MemoryTab, DiskTab, ProcessesTab

### Sprint 3 (Visualización)
1. MetricChart con Chart.js (6.8)
2. Gráficos tiempo real para Network
3. Histórico en memoria (24h)
4. Traducciones completas

### Estructura Final de Navegación
```
Header Principal:
┌──────────────────────────────────────────────────────────────┐
│  [System ▾]     [Network]     [Dockers]     [Terminal]       │
└──────────────────────────────────────────────────────────────┘
       │               │
       │               └── Panel completo de análisis de red
       │                   - Throughput tiempo real
       │                   - Conexiones TCP por estado
       │                   - Puertos escuchando
       │                   - Tráfico por proceso
       │
       └── Sub-tabs internos:
           ┌─────────────────────────────────────────────────┐
           │ [Overview] [CPU] [Memory] [Disk] [Processes]    │
           └─────────────────────────────────────────────────┘
```

---

## Comandos Linux de Referencia

```bash
# CPU detallado
cat /proc/stat

# Memoria detallada
cat /proc/meminfo

# Disk I/O
cat /proc/diskstats

# Network throughput
cat /proc/net/dev

# TCP connections por estado
ss -tna | awk 'NR>1 {print $1}' | sort | uniq -c

# Puertos escuchando
ss -tlnp

# Conexiones por proceso
ss -tnp

# Procesos detallados
ps aux --sort=-%cpu | head -20

# Threads por proceso
cat /proc/[pid]/status | grep Threads

# Open files por proceso
ls /proc/[pid]/fd | wc -l
```

---

## Notas Técnicas

- **Deltas**: Para rates (ops/s, MB/s) guardar lectura anterior y calcular diferencia
- **Intervalos**: Métricas avanzadas cada 2-3 segundos (más pesadas que básicas)
- **Caching**: Specs del sistema cacheados 1 hora
- **Errores**: Manejar comandos que requieren sudo gracefully
- **Performance**: Usar virtualización para tablas largas de procesos
