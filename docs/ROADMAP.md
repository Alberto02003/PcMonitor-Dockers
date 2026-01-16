# Roadmap - PC Monitoring & Dockers

Este documento define las mejoras futuras organizadas por prioridad y fase de desarrollo.

**Estado Actual**: App funcional con monitoreo SSH, Docker, métricas básicas y avanzadas, alertas, terminal SSH integrada, auto-actualización y **arquitectura 100% local sin dependencias externas**.

**Arquitectura**: **Local-first** - Toda la información se almacena localmente. No requiere API REST ni MySQL. Las conexiones SSH se guardan cifradas con Tauri Stronghold, y el historial de métricas (24h) se almacena en localStorage.

---

## 🚀 SPRINT 0: Performance Crítica (PRIORIDAD MÁXIMA)

> **⚠️ NUEVO - 2026-01-16**: Auditoría de performance completada. Se identificaron **10 problemas críticos** aplicando las **45 reglas de Vercel** para React.

**Próximo Objetivo Inmediato**: Resolver problemas críticos de performance **ANTES** de añadir nuevas funcionalidades.

### Problemas Críticos Detectados

| # | Problema | Regla Violada | Impacto | Esfuerzo |
|---|----------|---------------|---------|----------|
| 1 | 3 hooks de polling descoordinados | `async-parallel` | 🔥 ALTO | 4h |
| 2 | Re-renders por deps inestables | `rerender-dependencies` | 🔥 ALTO | 2h |
| 3 | Cálculos sin memoización | `rerender-memo` | 🔥 MEDIO | 2h |
| 4 | Modals en bundle inicial | `bundle-dynamic-imports` | 📦 MEDIO | 2h |

**Impacto Total Esperado**: 
- ⚡ **-40% CPU usage** en idle
- ⚡ **-50% re-renders** innecesarios  
- 📦 **-20% bundle size** inicial
- 🚀 **-25% Time to Interactive**

**Tiempo Estimado**: 1 día (8 horas)

➡️ **Ver FASE 9 para detalles completos**

---

**Siguiente Objetivo (después de Sprint 0)**: Mejorar la UI de métricas avanzadas con tabs especializados (CPU, Memory, Disk, Network, Processes).

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

## FASE 9: Optimizaciones de Performance (Vercel Rules)

**Objetivo**: Optimizar renders, reducir waterfalls y mejorar el rendimiento general siguiendo las 45 reglas de optimización de React/Vercel.

**Auditoría realizada**: 2026-01-16 - Se identificaron 10 problemas de performance aplicando las reglas de Vercel.

---

### 9.1 Performance Crítica (ALTA PRIORIDAD)

#### 9.1.1 Consolidar Polling de Métricas
**Reglas**: `async-parallel` + `client-swr-dedup`  
**Problema**: 3 hooks de polling independientes causan waterfalls y uso excesivo de CPU  
**Ubicación**: `MonitoringPage.jsx:62-83`

**Tarea**:
- [ ] Crear hook unificado `useRealTimeData` que consolide:
  - `useRealTimeMetrics` (cada 5s)
  - `useRealTimeContainers` (cada 10s)
  - `useAdvancedMetrics` (cada 5s)
- [ ] Usar `Promise.all()` para peticiones SSH paralelas
- [ ] Reducir de 3 timers a 1 timer coordinado
- [ ] Implementar deduplicación de requests

**Impacto esperado**: 
- ⚡ Reducción del 40% en uso de CPU
- ⚡ Eliminación de waterfalls SSH
- ⚡ Mejor sincronización de datos

```js
// ✅ Implementación sugerida
const useRealTimeData = (connectionId, intervals) => {
  // Un único timer que coordina todas las peticiones
  useEffect(() => {
    const tick = async () => {
      const [basic, advanced, containers] = await Promise.all([
        getSystemMetrics(connectionId),
        getAdvancedMetrics(connectionId),
        shouldFetchContainers() ? dockerList(connectionId) : null
      ])
      // Actualizar estados
    }
    const timer = setInterval(tick, calculateGCD(intervals))
    return () => clearInterval(timer)
  }, [connectionId])
}
```

---

#### 9.1.2 Estabilizar Dependencias de useEffect
**Regla**: `rerender-dependencies`  
**Problema**: Callbacks recreados en cada render por dependencias no primitivas  
**Ubicación**: `useRealTimeData.js:27`, `useAdvancedMetrics.js:19`

**Tarea**:
- [ ] Usar `useRef` para `connectionId` en lugar de dependencia directa
- [ ] Extraer callbacks con refs estables
- [ ] Evitar re-inicialización de polling innecesaria

```js
// ✅ Solución
const connectionIdRef = useRef(connectionId)
connectionIdRef.current = connectionId

const fetchMetrics = useCallback(async () => {
  if (!connectionIdRef.current || !isTauri()) return
  // ... lógica de fetch
}, []) // Sin dependencias inestables
```

**Impacto esperado**: 
- ⚡ Eliminar re-inicializaciones de polling al cambiar props
- ⚡ Reducción de 30% en re-renders

---

#### 9.1.3 Memoizar Cálculos Derivados
**Regla**: `rerender-derived-state` + `rerender-memo`  
**Problema**: Cálculos costosos se ejecutan en cada render  
**Ubicación**: `DockersSection.jsx:87-90`, `SelectionPage.jsx:70-88`

**Tarea**:
- [ ] Envolver cálculos de estadísticas Docker en `useMemo`
- [ ] Memoizar filtrado de conexiones en SelectionPage
- [ ] Memoizar configuración de alertas en MonitoringPage

```js
// ✅ Ejemplo Docker stats
const containerStats = useMemo(() => ({
  runningCount: containers.filter(c => c.state === 'running').length,
  stoppedCount: containers.filter(c => c.state !== 'running').length,
  totalCpu: containers.reduce((sum, c) => sum + (c.cpuPercent || 0), 0),
  totalMemory: containers.reduce((sum, c) => sum + (c.memoryUsageMb || 0), 0)
}), [containers])
```

**Impacto esperado**: 
- ⚡ Reducción del 25% en tiempo de render de DockersSection
- ⚡ Evitar re-cálculos en cada actualización de métricas

---

### 9.2 Performance Media (MEDIA PRIORIDAD)

#### 9.2.1 Lazy Load de Modals
**Regla**: `bundle-dynamic-imports`  
**Problema**: Modals cargados en bundle inicial aunque no se usen  
**Ubicación**: `MonitoringPage.jsx:17-18`, `SelectionPage.jsx:16-20`

**Tarea**:
- [ ] Convertir a dynamic imports:
  - `DockerModal`
  - `AlertsModal`
  - `SettingsModal`
  - `UpdaterModal`
- [ ] Envolver en `<Suspense>` con fallback

```js
// ✅ Implementación
import { lazy, Suspense } from 'react'

const DockerModal = lazy(() => import('./components/DockerModal/DockerModal.jsx'))

// En render
<Suspense fallback={null}>
  {dockerModalOpen && <DockerModal {...props} />}
</Suspense>
```

**Impacto esperado**: 
- 📦 Reducción del 15-20% en bundle inicial
- 📦 Mejora en First Contentful Paint

---

#### 9.2.2 Memoizar Componente Sparkline
**Regla**: `rendering-hoist-jsx` + `rerender-memo`  
**Problema**: Sparkline recalcula paths SVG en cada render  
**Ubicación**: `Sparkline.jsx:29-143`

**Tarea**:
- [ ] Envolver Sparkline en `React.memo` con comparador custom
- [ ] Optimizar comparación de props (solo último valor de data)

```js
// ✅ Implementación
export default React.memo(Sparkline, (prev, next) => {
  return (
    prev.width === next.width &&
    prev.height === next.height &&
    prev.data.length === next.data.length &&
    prev.data[prev.data.length - 1] === next.data[next.data.length - 1]
  )
})
```

**Impacto esperado**: 
- ⚡ Reducción del 50% en re-renders de Sparkline
- ⚡ Mejora en smooth scrolling de listas con sparklines

---

#### 9.2.3 Optimizar Hook useTranslation
**Regla**: `rerender-functional-setstate`  
**Problema**: Función `t()` recreada con objeto default `{}`  
**Ubicación**: `useTranslation.jsx:28-30`

**Tarea**:
- [ ] Evitar valor default `{}` en parámetros
- [ ] Usar `||` en lugar de default parameter

```js
// ✅ Solución
const t = useCallback((key, params) => {
  return translate(lang, key, params || {})
}, [lang])
```

**Impacto esperado**: 
- ⚡ Función estable entre renders
- ⚡ Reducción de invalidaciones de memo

---

### 9.3 Performance Baja (OPTIMIZACIONES FUTURAS)

#### 9.3.1 Virtualización de Listas
**Regla**: `rendering-content-visibility`  
**Tarea**:
- [ ] Implementar react-window en ProcessesTab
- [ ] Virtualizar lista de conexiones en SelectionSidebar (si >50)
- [ ] Virtualizar logs de Docker

**Impacto esperado**: 
- ⚡ Mejora dramática con >100 procesos/conexiones
- ⚡ Reducción de DOM nodes de 1000+ a ~20

---

#### 9.3.2 Deduplicar Event Listeners
**Regla**: `client-event-listeners`  
**Tarea**:
- [ ] Auditar listeners globales de `keydown`
- [ ] Crear hook central `useGlobalKeyboard` para deduplicar

---

#### 9.3.3 Optimizar Iteraciones en Store
**Regla**: `js-combine-iterations`  
**Ubicación**: `connectionsStore.js:410-415`

**Tarea**:
- [ ] Combinar operaciones de map + serialize en una sola pasada

---

### 9.4 Storage y UI/UX

#### 9.4.1 Storage
- [ ] Comprimir datos en localStorage (LZ-string)
- [ ] Limpieza automática de métricas antiguas
- [ ] Opción para exportar historial completo

#### 9.4.2 UI/UX
- [ ] Dashboard personalizable (drag & drop widgets)
- [ ] Temas personalizados (color picker)
- [ ] Exportar/importar preferencias completas

---

### Resumen de Impacto Estimado

| Tarea | Impacto | Esfuerzo | Prioridad |
|-------|---------|----------|-----------|
| 9.1.1 Consolidar polling | 🔥 ALTO | 4h | 🔴 CRÍTICO |
| 9.1.2 Estabilizar deps | 🔥 ALTO | 2h | 🔴 CRÍTICO |
| 9.1.3 Memoizar cálculos | 🔥 MEDIO | 2h | 🔴 CRÍTICO |
| 9.2.1 Lazy modals | 📦 MEDIO | 2h | 🟡 MEDIO |
| 9.2.2 Memo Sparkline | ⚡ MEDIO | 1h | 🟡 MEDIO |
| 9.2.3 Fix useTranslation | ⚡ BAJO | 0.5h | 🟡 MEDIO |
| 9.3.1 Virtualización | ⚡ ALTO* | 4h | 🟢 BAJO |
| 9.3.2 Dedup listeners | ⚡ BAJO | 1h | 🟢 BAJO |

*Alto impacto solo con listas >100 items

**Total estimado tareas críticas**: ~8 horas  
**Total estimado tareas completas**: ~16 horas

---

### Reglas de Vercel Aplicadas Correctamente ✅

1. **`rerender-lazy-state-init`** - No hay inicialización costosa de estado
2. **`js-cache-storage`** - Zustand cachea datos correctamente
3. **`js-early-exit`** - Buenos early returns en hooks
4. **`async-defer-await`** - Promise.all usado en algunos lugares
5. **`bundle-conditional`** - Dynamic imports de Tauri APIs

---

### Referencias

- **Vercel React Performance Rules**: 45 reglas priorizadas por impacto
- **Auditoría completa**: Ver análisis detallado en sesión 2026-01-16
- **Categorías**: Waterfalls, Bundle, Server, Client, Re-renders, Rendering, JS, Advanced

---

## Plan de Implementación Recomendado

### Sprint 0: Performance Crítica (1 día) - **NUEVO: Prioridad Máxima**
**Objetivo**: Resolver problemas críticos de performance antes de añadir más funcionalidad

1. **Mañana (4h)**: Consolidar polling de métricas
   - Crear `useRealTimeData` unificado
   - Implementar Promise.all para peticiones paralelas
   - Migrar MonitoringPage al nuevo hook
   - Testing de performance

2. **Tarde (4h)**: Estabilizar dependencias y memoización
   - Usar refs en callbacks de fetch
   - Memoizar cálculos derivados (Docker stats, filtros)
   - Memoizar Sparkline component
   - Fix useTranslation

**Resultado esperado**: 
- ✅ Reducción ~40% en CPU usage
- ✅ Eliminación de waterfalls SSH
- ✅ Reducción ~30% en re-renders

---

### Sprint 1: Frontend - Estructura (3-4 días)
1. Refactor MonitoringHeader con Network tab
2. Crear SystemSection con sub-tabs
3. Crear NetworkSection skeleton
4. Hooks para fetch de métricas avanzadas desde state
5. **NUEVO**: Lazy load de modals (DockerModal, AlertsModal, Settings)

### Sprint 2: Frontend - Componentes de Métricas (4-5 días)
1. CpuTab con gráficos per-core y breakdown
2. MemoryTab con stacked area chart
3. DiskTab con selector y gráfico I/O
4. NetworkSection completo con TCP stats y ports table

### Sprint 3: Frontend - Procesos y Overview (2-3 días)
1. ProcessesTab con tabla virtualizada (react-window)
2. OverviewTab con health score
3. Integración completa de todos los tabs

### Sprint 4: Docker Compose + Systemd (3 días)
1. Docker Compose detection y management
2. Systemd services manager

### Sprint 5: Polish y Testing (2 días)
1. Traducciones completas
2. Testing de flujo completo
3. Auditoría final de performance
4. Documentación actualizada

**Total estimado: 16-19 días** (incluye Sprint 0 de performance)

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
| **2026-01-16** | **9.0** | **Auditoría de Performance (Vercel Rules)** | ✅ |
| **2026-01-16** | **9.0** | **Identificación de 10 problemas críticos** | ✅ |
| Pendiente | 9.1.1 | Consolidar polling de métricas | ⏳ |
| Pendiente | 9.1.2 | Estabilizar dependencias useEffect | ⏳ |
| Pendiente | 9.1.3 | Memoizar cálculos derivados | ⏳ |
| Pendiente | 9.2.1 | Lazy load de modals | ⏳ |
| Pendiente | 7.1 | Refactor UI con Tabs | ⏳ |
| Pendiente | 7.2-7.7 | Componentes de tabs | ⏳ |

---

## Notas Técnicas

### Intervalos de Actualización
- Métricas básicas: cada 5 segundos
- Métricas avanzadas: cada 5 segundos (mismo poll)
- Contenedores Docker: cada 10 segundos
- Gráficos: actualizados en tiempo real con nuevos datos

**⚠️ Optimización pendiente**: Consolidar en un único hook con Promise.all (Sprint 0)

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

---

### Reglas de Performance (Vercel React Guidelines)

Esta aplicación sigue las **45 reglas de optimización de React** de Vercel, organizadas en 8 categorías por prioridad:

#### Categorías de Reglas

| Prioridad | Categoría | Prefijo | Estado |
|-----------|-----------|---------|---------|
| 1 - CRÍTICO | Eliminating Waterfalls | `async-` | ⚠️ **En progreso** |
| 2 - CRÍTICO | Bundle Size Optimization | `bundle-` | ⚠️ **En progreso** |
| 3 - HIGH | Server-Side Performance | `server-` | ✅ N/A (Tauri app) |
| 4 - MEDIUM-HIGH | Client-Side Data Fetching | `client-` | ⚠️ **En progreso** |
| 5 - MEDIUM | Re-render Optimization | `rerender-` | ⚠️ **En progreso** |
| 6 - MEDIUM | Rendering Performance | `rendering-` | ⚠️ **En progreso** |
| 7 - LOW-MEDIUM | JavaScript Performance | `js-` | ✅ Mayormente aplicado |
| 8 - LOW | Advanced Patterns | `advanced-` | 🔜 Planeado |

#### Reglas Aplicadas Actualmente ✅

- ✅ `js-early-exit` - Early returns en hooks de datos
- ✅ `js-cache-storage` - Zustand para estado global
- ✅ `bundle-conditional` - Dynamic imports de Tauri APIs
- ✅ `async-defer-await` - Promise.all en algunos lugares
- ✅ `rerender-lazy-state-init` - No hay init costoso de estado

#### Reglas en Sprint 0 (Prioridad Inmediata) 🔴

- 🔴 `async-parallel` - Consolidar polling con Promise.all
- 🔴 `client-swr-dedup` - Deduplicar requests SSH
- 🔴 `rerender-dependencies` - Estabilizar deps con refs
- 🔴 `rerender-memo` - Memoizar componentes pesados
- 🔴 `rerender-derived-state` - Memoizar cálculos derivados

#### Reglas Planeadas para Sprints Futuros 🟡

- 🟡 `bundle-dynamic-imports` - Lazy load de modals
- 🟡 `rendering-content-visibility` - Virtualización de listas
- 🟡 `js-combine-iterations` - Optimizar loops en stores
- 🟡 `client-event-listeners` - Deduplicar listeners globales

#### Métricas de Performance Objetivo

| Métrica | Actual | Objetivo Post-Sprint 0 | Mejora |
|---------|--------|------------------------|--------|
| CPU Usage (idle) | ~5-8% | ~3-5% | -40% |
| Re-renders/sec | ~15-20 | ~8-10 | -50% |
| Bundle Size (inicial) | ~280KB | ~220KB | -20% |
| Time to Interactive | ~800ms | ~600ms | -25% |
| Waterfalls SSH | 3 paralelos | 1 consolidado | -66% |

**Herramientas de medición**:
- React DevTools Profiler
- Chrome Performance tab
- Bundle analyzer (vite-plugin-visualizer)
- Lighthouse (si se hace PWA en futuro)
