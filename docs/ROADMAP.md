# Roadmap - PC Monitoring & Dockers

Este documento define las mejoras futuras organizadas por prioridad y fase de desarrollo.

**Estado Actual**: App funcional con monitoreo SSH, Docker, métricas básicas y avanzadas, alertas, terminal SSH integrada, auto-actualización y **arquitectura 100% local sin dependencias externas**.

**Arquitectura**: **Local-first** - Toda la información se almacena localmente. No requiere API REST ni MySQL. Las conexiones SSH se guardan cifradas con Tauri Stronghold, y el historial de métricas (24h) se almacena en localStorage.

**Próximo Objetivo**: Mejorar la UI de métricas avanzadas con tabs especializados (CPU, Memory, Disk, Network, Processes).

---

## Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────────┐
│                        SERVIDOR LINUX (SSH)                         │
│  Fuentes: /proc/stat, /proc/meminfo, /proc/diskstats,              │
│           /proc/net/dev, ss, ps aux, docker                         │
└───────────────────────────────┬─────────────────────────────────────┘
                                │ SSH Connection
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   TAURI APP (Rust + React)                          │
│  Backend (Rust):                                                    │
│    - SSH connection management                                      │
│    - System metrics collection (basic + advanced)                   │
│    - Docker operations                                              │
│    - Tauri Stronghold (encrypted storage for credentials)           │
│                                                                     │
│  Frontend (React):                                                  │
│    - Real-time monitoring dashboard                                 │
│    - Charts visualization (Chart.js)                                │
│    - Docker management UI                                           │
│    - SSH terminal (integrated + pop-out)                            │
│    - Alerts system (local thresholds)                               │
│                                                                     │
│  Data Storage:                                                      │
│    - SSH Connections: Tauri Stronghold (encrypted)                  │
│    - Metrics History: localStorage (24h retention, max 1000 points) │
│    - User Preferences: localStorage                                 │
│    - Real-time Data: React State (ephemeral)                        │
└─────────────────────────────────────────────────────────────────────┘
```

**Características de la arquitectura local-first:**
- ✅ Sin servidor backend necesario
- ✅ Sin base de datos externa (MySQL/PostgreSQL)
- ✅ Credenciales cifradas localmente con Stronghold
- ✅ Historial de métricas en localStorage (24 horas)
- ✅ Funciona completamente offline (excepto conexiones SSH a servidores)
- ✅ Portátil: exportar/importar conexiones en JSON
- ✅ Privacidad: datos nunca salen de tu máquina

---

## Estado Actual (v0.1.1)

### ✅ Completado

#### Core Funcionalidad
- [x] Gestión de conexiones SSH (crear, editar, eliminar, importar, exportar)
- [x] Autenticación SSH con password o clave privada
- [x] Cifrado de credenciales con Tauri Stronghold (AES-256-GCM internamente)
- [x] Métricas básicas en tiempo real (cada 5s):
  - CPU total %
  - Memoria RAM (usado/total)
  - Swap (usado/total)
  - Disco (usado/total por partición)
  - Red (RX/TX throughput)
  - Uptime, Load Average
  - Temperaturas (si disponible)
- [x] Métricas avanzadas (recolección completa):
  - CPU: per-core usage, user/system/iowait/idle breakdown, context switches, interrupts
  - Memory: buffers, cached, slab, dirty, writeback, mapped, huge pages
  - Disk I/O: read/write ops/s, bytes/s, utilization%, queue size, latency
  - Network: per-interface throughput, packets, errors, drops, collisions
  - TCP: conexiones por estado (established, time_wait, etc.)
  - Listening ports: puerto, protocolo, proceso
  - Processes: top 20 por CPU/MEM con estado detallado

#### Docker
- [x] Listar contenedores
- [x] Iniciar/parar/reiniciar contenedores
- [x] Ver logs en tiempo real
- [x] Estadísticas de recursos por contenedor
- [x] Eliminar contenedores

#### Terminal SSH
- [x] Terminal integrada en tab
- [x] Ejecución de comandos remotos
- [x] Historial de comandos (localStorage)
- [x] Ventana externa (pop-out) independiente

#### Alertas y Notificaciones
- [x] Sistema de alertas configurable por tipo:
  - CPU, RAM, Disco, Temperatura, Swap
  - Umbrales personalizables
  - Cooldown configurable (evitar spam)
- [x] Notificaciones desktop nativas (Tauri)
- [x] Preferencias de notificaciones por tipo

#### UI/UX
- [x] Dark/Light theme con toggle
- [x] i18n: Español e Inglés
- [x] Keyboard shortcuts (Ctrl+K command palette, etc.)
- [x] Gráficos de métricas con Chart.js
- [x] Historial de métricas (24h en localStorage)
- [x] Exportar/importar configuración de conexiones

#### DevOps
- [x] Auto-updater con GitHub Releases
- [x] Tests con Vitest (271 tests passing)
- [x] CI/CD con GitHub Actions (Windows build)

---

## FASE 7: Sistema de Monitorización Avanzado (UI)

**Objetivo**: Mejorar la visualización de métricas avanzadas con tabs especializados y gráficos detallados.

### 7.1 Refactor de Arquitectura UI

**Estructura de navegación principal**:
```
┌─────────────────────────────────────────────────────────────────────┐
│  [System ▾] [Network] [Dockers] [Terminal]                          │
└─────────────────────────────────────────────────────────────────────┘
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

| Componente | Descripción |
|------------|-------------|
| Barra principal | CPU % agregado con color coding |
| Gráfico histórico | Chart.js con selector 1h/6h/24h |
| Grid per-core | Barras horizontales por núcleo |
| Breakdown pie | User/System/IOWait/Idle |
| Stats cards | Context switches, interrupts, procs running/blocked |

**Datos**: Ya disponibles desde `get_advanced_metrics` Tauri command (CPU per-core, breakdown)

**Tareas Frontend**:
- [ ] Componente `CpuTab.jsx`
- [ ] Gráfico de barras por core
- [ ] Pie chart de breakdown
- [ ] Sparklines para cada core
- [ ] Leer datos desde React state (useRealTimeData hook)

---

### 7.3 Memory Tab

| Componente | Descripción |
|------------|-------------|
| Barras RAM/Swap | Uso actual con porcentaje |
| Gráfico histórico | Stacked area chart (Used/Buffers/Cached) |
| Breakdown cards | Used/Buffers/Cached/Available |
| Cache info | Slab, dirty, writeback |

**Datos**: Ya disponibles desde `get_advanced_metrics` (memory_detailed)

**Tareas Frontend**:
- [ ] Componente `MemoryTab.jsx`
- [ ] Stacked area chart RAM + Swap
- [ ] Cards de breakdown

---

### 7.4 Disk Tab

| Componente | Descripción |
|------------|-------------|
| Selector | Dropdown de discos/particiones |
| Barra uso | Espacio usado/total |
| Gráfico I/O | Dual line Read/Write MB/s |
| IOPS card | Operaciones por segundo |
| Latencia | Queue size, wait time |
| Inodos | Barra de uso de inodos |

**Datos**: Ya disponibles desde `get_advanced_metrics` (disk_io)

**Tareas Frontend**:
- [ ] Componente `DiskTab.jsx`
- [ ] Selector de disco
- [ ] Gráfico dual-line I/O

---

### 7.5 Network Section (Tab Principal)

| Componente | Descripción |
|------------|-------------|
| Selector interfaz | Tabs o dropdown eth0/docker0/lo |
| Throughput cards | RX/TX Mbps en tiempo real |
| Gráfico live | Actualización cada 5s |
| Stats table | Packets, errors, drops |
| TCP pie chart | Conexiones por estado |
| Ports table | Puertos escuchando con proceso |

**Datos**: Ya disponibles desde `get_advanced_metrics` (network_detailed, tcp_connections, listening_ports)

**Tareas Frontend**:
- [ ] Componente `NetworkSection.jsx`
- [ ] Gráfico tiempo real con actualización
- [ ] Pie chart de conexiones TCP
- [ ] Tabla de puertos escuchando

---

### 7.6 Processes Tab

| Componente | Descripción |
|------------|-------------|
| Summary bar | Running/Sleeping/Zombie counts |
| Filters | Sort by, filter by name, limit |
| Table | PID, Name, CPU%, MEM%, Threads, State |
| Detail panel | Info expandida del proceso |

**Datos**: Ya disponibles desde `get_advanced_metrics` (processes - top 20)

**Tareas Frontend**:
- [ ] Componente `ProcessesTab.jsx`
- [ ] Tabla ordenable/filtrable
- [ ] Panel de detalles
- [ ] Virtualización para listas largas (react-window)

---

### 7.7 Overview Tab

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

## FASE 8: Funcionalidades Adicionales

### 8.1 Docker Compose Support
- [ ] Detectar docker-compose.yml en servidor
- [ ] Ejecutar docker-compose up/down
- [ ] Ver servicios y su estado

### 8.2 Systemd Services Manager
- [ ] Listar servicios systemctl
- [ ] Iniciar/parar/reiniciar servicios
- [ ] Ver logs de servicios

### 8.3 SSL/TLS Certificate Monitor
- [ ] Check SSL de dominios
- [ ] Alertas antes de expirar

### 8.4 Scheduled Commands
- [ ] Ejecutar comandos SSH programados (cron-like)
- [ ] Guardar output en localStorage

---

## FASE 9: Optimizaciones

### 9.1 Performance
- [ ] React.memo para componentes pesados
- [ ] Virtualización para listas largas (react-window)
- [ ] Debouncing de actualizaciones de gráficos
- [ ] Web Workers para procesamiento de datos pesados

### 9.2 Storage
- [ ] Comprimir datos en localStorage (LZ-string)
- [ ] Limpieza automática de métricas antiguas
- [ ] Opción para exportar historial completo

### 9.3 UI/UX
- [ ] Dashboard personalizable (drag & drop widgets)
- [ ] Temas personalizados (color picker)
- [ ] Exportar/importar preferencias completas

---

## Plan de Implementación Recomendado

### Sprint 1: Frontend - Estructura (3-4 días)
1. Refactor MonitoringHeader con Network tab
2. Crear SystemSection con sub-tabs
3. Crear NetworkSection skeleton
4. Hooks para fetch de métricas avanzadas desde state

### Sprint 2: Frontend - Componentes de Métricas (4-5 días)
1. CpuTab con gráficos per-core y breakdown
2. MemoryTab con stacked area chart
3. DiskTab con selector y gráfico I/O
4. NetworkSection completo con TCP stats y ports table

### Sprint 3: Frontend - Procesos y Overview (2-3 días)
1. ProcessesTab con tabla virtualizada
2. OverviewTab con health score
3. Integración completa de todos los tabs

### Sprint 4: Docker Compose + Systemd (3 días)
1. Docker Compose detection y management
2. Systemd services manager

### Sprint 5: Polish y Testing (2 días)
1. Traducciones completas
2. Testing de flujo completo
3. Optimización de renders
4. Documentación actualizada

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

## Registro de Progreso

| Fecha | Fase | Tarea | Estado |
|-------|------|-------|--------|
| 2025-01 | Core | SSH, Docker, Métricas básicas | ✅ |
| 2025-01 | Seguridad | Cifrado AES-256-GCM (Stronghold) | ✅ |
| 2025-01 | UI | Terminal SSH integrada | ✅ |
| 2025-01 | DevOps | Auto-updater con GitHub Releases | ✅ |
| 2026-01-15 | Refactor | Eliminación completa de API/MySQL | ✅ |
| 2026-01-15 | Refactor | Migración a arquitectura local-first | ✅ |
| 2026-01-15 | Backend | Métricas avanzadas (metrics_advanced.rs) | ✅ |
| Pendiente | 7.1 | Refactor UI con Tabs | ⏳ |
| Pendiente | 7.2-7.7 | Componentes de tabs | ⏳ |

---

## Notas Técnicas

### Intervalos de Actualización
- Métricas básicas: cada 5 segundos
- Métricas avanzadas: cada 5 segundos (mismo poll)
- Gráficos: actualizados en tiempo real con nuevos datos

### Retención de Datos
- **localStorage**: 24 horas máximo, 1000 puntos máximo
- **React State**: Datos efímeros (mientras la app esté abierta)
- **Stronghold**: Credenciales permanentes hasta eliminación manual

### Limitaciones de localStorage
- Capacidad: ~10MB por dominio
- Actual: ~100KB por servidor (24h de métricas)
- Estimado: Soporta hasta ~100 servidores con 24h de historial

### Alternativas Futuras para Persistencia (Opcionales)
1. **SQLite local** (via Tauri)
   - Pros: Queries avanzadas, sin límite de tamaño
   - Contras: Más complejo
2. **IndexedDB** (via Dexie.js)
   - Pros: Mayor capacidad que localStorage
   - Contras: API más compleja
3. **Archivos JSON** (via Tauri fs)
   - Pros: Fácil de respaldar manualmente
   - Contras: Peor performance con archivos grandes
