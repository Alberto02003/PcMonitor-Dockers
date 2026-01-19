# PC Monitor-Dockers - Roadmap de Features

**Fecha**: 16 Enero 2026  
**Versión Actual**: v0.1.5  
**Análisis basado en**: Feedback de usuarios, mejores prácticas de DevOps, y competidores

---

## Tabla de Contenidos

1. [Features Críticas (Must-Have)](#features-críticas-must-have)
2. [Features de Alto Valor (High Priority)](#features-de-alto-valor-high-priority)
3. [Features de Medio Valor (Medium Priority)](#features-de-medio-valor-medium-priority)
4. [Features Nice-to-Have (Low Priority)](#features-nice-to-have-low-priority)
5. [Features Avanzadas (Future)](#features-avanzadas-future)
6. [Comparación con Competidores](#comparación-con-competidores)
7. [Estimaciones de Tiempo](#estimaciones-de-tiempo)

---

## Features Críticas (Must-Have)

### 1. 📊 **Gráficos de Métricas Históricas** - CRÍTICO

**Problema Actual**: Solo se ven métricas en tiempo real, no hay histórico.

**Solución Propuesta**:
- Gráficos de línea para CPU, RAM, Disco, Red (últimas 24 horas)
- Almacenamiento local con límite de retención (24h/7d/30d)
- Zoom y pan en gráficos
- Comparación multi-servidor

**Impacto**: ⭐⭐⭐⭐⭐
**Esfuerzo**: 🔨🔨🔨 (5-7 días)

**Implementación**:
```javascript
// Nueva estructura de datos
{
  connectionId: string,
  metrics: {
    cpu: [{ timestamp: number, value: number }],
    memory: [{ timestamp: number, value: number }],
    // ... max 24h de datos
  }
}

// Usar Chart.js con time scale
import { Line } from 'react-chartjs-2'
```

**Beneficios**:
- Identificar tendencias y patrones
- Diagnosticar problemas pasados
- Planificación de capacidad
- Comparar rendimiento entre periodos

---

### 2. 🔔 **Sistema de Alertas Mejorado** - CRÍTICO

**Problema Actual**: Alertas básicas sin routing ni snooze.

**Mejoras Necesarias**:
- ✅ **Alert Snooze**: Silenciar temporalmente (15m, 1h, 24h)
- ✅ **Alert Routing**: Email, Webhook, Slack, Discord
- ✅ **Alert Escalation**: Severidad progresiva
- ✅ **Alert Correlation**: Agrupar alertas relacionadas
- ✅ **Alert History**: Ver histórico de alertas disparadas

**Impacto**: ⭐⭐⭐⭐⭐
**Esfuerzo**: 🔨🔨🔨🔨 (7-10 días)

**Ejemplos de Routing**:
```javascript
// Configuración de alerta
{
  threshold: 80,
  severity: 'warning',
  routes: [
    { type: 'desktop', enabled: true },
    { type: 'email', to: 'admin@example.com', enabled: true },
    { type: 'webhook', url: 'https://hooks.slack.com/...', enabled: true }
  ],
  escalation: {
    warning: 'desktop',
    critical: 'email+webhook'
  }
}
```

---

### 3. 📁 **Connection Groups UI** - CRÍTICO

**Problema Actual**: Grupos existen en el modelo de datos pero no hay UI.

**Solución**:
- Folders/carpetas visibles en SelectionPage
- Drag & drop para organizar
- Collapse/expand grupos
- Colores personalizados por grupo

**Impacto**: ⭐⭐⭐⭐⭐
**Esfuerzo**: 🔨🔨 (3-5 días)

**Mock UI**:
```
📁 Production (5)
  ├─ 🖥️ Web Server 01
  ├─ 🖥️ Web Server 02
  └─ 🗄️ Database Master
📁 Development (2)
  ├─ 🖥️ Dev Server
  └─ 🧪 Test Server
```

---

### 4. 🐳 **Docker Compose Management** - CRÍTICO

**Problema Actual**: No se puede gestionar stacks de Docker Compose desde UI.

**Features Necesarias**:
- Ver compose stacks activos
- `docker-compose up/down/restart`
- Ver servicios dentro del stack
- Editar compose files desde la app
- Variables de entorno configurables

**Impacto**: ⭐⭐⭐⭐⭐
**Esfuerzo**: 🔨🔨🔨🔨 (7-10 días)

**Backend ya tiene soporte parcial** (`src-tauri/src/docker.rs` líneas 520-700):
```rust
pub fn compose_up(...)
pub fn compose_down(...)
pub fn compose_restart(...)
pub fn list_compose_projects(...)
```

Solo falta **UI completa**.

---

### 5. 🔍 **Búsqueda Avanzada & Filtros** - ALTA

**Mejoras Necesarias**:
- Búsqueda global (connections + containers + logs)
- Filtros por: estado, grupo, tags, CPU/RAM usage
- Búsqueda con operadores: `cpu>80`, `state:running`, `tag:production`
- Guardar búsquedas frecuentes
- Búsqueda en logs con regex

**Impacto**: ⭐⭐⭐⭐
**Esfuerzo**: 🔨🔨🔨 (5-7 días)

---

## Features de Alto Valor (High Priority)

### 6. 📊 **Dashboard Personalizable** - ALTA

**Concepto**: Widgets arrastrables, layout personalizable.

**Widgets Disponibles**:
- 📈 CPU Graph (multi-server)
- 💾 Memory Usage
- 🐳 Docker Containers Status
- 🔔 Recent Alerts
- 📊 Top Processes
- 🌐 Network Traffic
- 💽 Disk Space
- 🔥 CPU Temperature

**Implementación**:
```javascript
// Usar react-grid-layout
import GridLayout from 'react-grid-layout'

const layout = [
  { i: 'cpu', x: 0, y: 0, w: 6, h: 4 },
  { i: 'memory', x: 6, y: 0, w: 6, h: 4 },
  { i: 'containers', x: 0, y: 4, w: 12, h: 6 },
]
```

**Impacto**: ⭐⭐⭐⭐⭐
**Esfuerzo**: 🔨🔨🔨🔨 (8-12 días)

---

### 7. 📦 **Bulk Operations** - ALTA

**Operaciones en Lote**:
- Multi-select connections
- Start/Stop/Restart múltiples containers
- Delete múltiples connections
- Export múltiples configuraciones
- Apply alerts to multiple servers

**Impacto**: ⭐⭐⭐⭐
**Esfuerzo**: 🔨🔨 (3-5 días)

---

### 8. 📊 **Metric Export (CSV/JSON)** - ALTA

**Casos de Uso**:
- Reportes para management
- Análisis en Excel/Google Sheets
- Integración con otras herramientas
- Backup de métricas históricas

**Formato Export**:
```csv
timestamp,server,cpu,memory,disk,network_rx,network_tx
2026-01-16T10:00:00Z,web-server-01,45.2,62.1,78.3,125.4,89.7
2026-01-16T10:05:00Z,web-server-01,48.1,63.5,78.3,132.1,95.3
```

**Impacto**: ⭐⭐⭐⭐
**Esfuerzo**: 🔨🔨 (2-3 días)

---

### 9. 🔐 **Multi-User Support** - ALTA

**Concepto**: Múltiples perfiles de usuario en la misma máquina.

**Features**:
- User login/logout
- Separate connection profiles
- User preferences (theme, language, alerts)
- Permission levels (admin, viewer)

**Almacenamiento**:
```
~/.pc-monitor/
  ├─ users/
  │   ├─ admin/
  │   │   ├─ connections.json
  │   │   └─ preferences.json
  │   └─ viewer/
  │       ├─ connections.json
  │       └─ preferences.json
```

**Impacto**: ⭐⭐⭐⭐
**Esfuerzo**: 🔨🔨🔨🔨 (8-10 días)

---

### 10. 📱 **Terminal Tabs & Sessions** - ALTA

**Mejoras al Terminal Actual**:
- ✅ Múltiples tabs (como VS Code terminal)
- ✅ Session persistence (reconectar automáticamente)
- ✅ Split panes (horizontal/vertical)
- ✅ Command history persistente
- ✅ Auto-complete de comandos
- ✅ Syntax highlighting

**Impacto**: ⭐⭐⭐⭐
**Esfuerzo**: 🔨🔨🔨🔨 (8-12 días)

---

### 11. 📂 **SFTP / File Browser** - ALTA

**Problema**: No hay forma de transferir archivos sin salir de la app.

**Solución**: Integrar explorador de archivos con SFTP.

**Features**:
- Browse remote filesystem
- Upload/Download files
- Drag & drop support
- File editor integrado
- Permisos y ownership visible
- Search in files

**Impacto**: ⭐⭐⭐⭐⭐
**Esfuerzo**: 🔨🔨🔨🔨🔨 (12-15 días)

**Competidores que lo tienen**: WinSCP, FileZilla, VS Code Remote

---

## Features de Medio Valor (Medium Priority)

### 12. 📝 **Command Snippets Library** - MEDIA

**Concepto**: Biblioteca de comandos frecuentes con variables.

**Ejemplos**:
```javascript
{
  name: "Check disk usage",
  command: "df -h | grep -v tmpfs",
  tags: ["disk", "diagnostic"],
  favorite: true
}

{
  name: "Restart service",
  command: "sudo systemctl restart {{service}}",
  variables: ["service"],
  tags: ["systemd"]
}
```

**Impacto**: ⭐⭐⭐
**Esfuerzo**: 🔨🔨 (3-4 días)

---

### 13. 🔄 **Auto-Reconnect & Connection Pooling** - MEDIA

**Problema**: Si se pierde conexión SSH, no reconecta automáticamente.

**Solución**:
- Auto-reconnect con exponential backoff
- Connection pooling (reusar conexiones)
- Keep-alive pings
- Fallback to secondary servers

**Impacto**: ⭐⭐⭐⭐
**Esfuerzo**: 🔨🔨🔨 (5-7 días)

---

### 14. 🎨 **Themes & Customization** - MEDIA

**Mejoras Visuales**:
- Más temas (no solo light/dark)
- Custom color schemes
- Layout density (compact/comfortable/spacious)
- Font size adjustment
- Custom accent colors

**Temas Propuestos**:
- 🌙 Dark (current)
- ☀️ Light (current)
- 🌆 Solarized Dark
- 🌸 Rosé Pine
- 💎 Dracula
- 🌊 Nord
- 🎨 Custom (user-defined)

**Impacto**: ⭐⭐⭐
**Esfuerzo**: 🔨🔨 (3-5 días)

---

### 15. 📊 **Process Manager** - MEDIA

**Concepto**: Ver y gestionar procesos como `htop` pero con UI.

**Features**:
- Lista de procesos con CPU/RAM/PID
- Sort by CPU, RAM, Name
- Kill/Signal processes
- Search processes
- Process tree view
- Resource graphs per process

**Impacto**: ⭐⭐⭐⭐
**Esfuerzo**: 🔨🔨🔨 (5-7 días)

---

### 16. 🔔 **Desktop Widgets / System Tray** - MEDIA

**Concepto**: Mostrar métricas sin abrir la app completa.

**Features**:
- System tray con CPU/RAM de servidores favoritos
- Mini-window flotante con métricas clave
- Notifications en system tray
- Quick actions desde tray

**Impacto**: ⭐⭐⭐
**Esfuerzo**: 🔨🔨🔨 (5-6 días)

---

### 17. 🔐 **SSH Key Manager** - MEDIA

**Problema**: Gestionar múltiples SSH keys es tedioso.

**Solución**:
- UI para generar SSH keys
- Store keys in Secure Storage
- Auto-add to ssh-agent
- Copy public key to clipboard
- Deploy key to server (ssh-copy-id)

**Impacto**: ⭐⭐⭐
**Esfuerzo**: 🔨🔨🔨 (4-6 días)

---

### 18. 📋 **Scheduled Tasks / Cron Jobs Manager** - MEDIA

**Concepto**: Gestionar cron jobs desde UI.

**Features**:
- Ver cron jobs actuales
- Crear/editar/eliminar cron jobs
- Preview de próxima ejecución
- Log de ejecuciones pasadas
- Templates de tareas comunes

**Impacto**: ⭐⭐⭐
**Esfuerzo**: 🔨🔨🔨 (5-7 días)

---

## Features Nice-to-Have (Low Priority)

### 19. 🤖 **AI-Powered Insights** - BAJA

**Concepto**: Machine learning para detectar anomalías.

**Features**:
- Anomaly detection en métricas
- Predictive alerts ("CPU will hit 90% in 2 hours")
- Smart suggestions ("Container X crashing frequently")
- Auto-tuning de alertas (reduce false positives)

**Impacto**: ⭐⭐⭐⭐⭐ (si funciona bien)
**Esfuerzo**: 🔨🔨🔨🔨🔨🔨 (20-30 días + ML expertise)

---

### 20. 📊 **Baseline & Comparison Mode** - BAJA

**Concepto**: Comparar estado actual vs baseline histórico.

**Features**:
- Establecer baseline (ej: "lunes a las 10am")
- Comparar métricas actuales vs baseline
- Highlight deviations
- "This is normal for this time" indicator

**Impacto**: ⭐⭐⭐
**Esfuerzo**: 🔨🔨🔨🔨 (7-10 días)

---

### 21. 🌐 **Cloud Provider Integration** - BAJA

**Concepto**: Gestionar VMs de AWS/Azure/GCP desde la app.

**Features**:
- Start/Stop cloud VMs
- View cloud costs
- Auto-scaling groups management
- Integrate with cloud metrics

**Impacto**: ⭐⭐⭐⭐ (para empresas)
**Esfuerzo**: 🔨🔨🔨🔨🔨🔨 (20-25 días)

---

### 22. 📱 **Mobile Companion App** - BAJA

**Concepto**: App móvil (React Native) con features básicas.

**Features Móviles**:
- Ver estado de servidores
- Ver alertas
- Start/Stop containers
- SSH terminal básico
- Push notifications

**Impacto**: ⭐⭐⭐⭐
**Esfuerzo**: 🔨🔨🔨🔨🔨🔨🔨 (30-40 días)

---

### 23. 🔗 **API REST / GraphQL** - BAJA

**Concepto**: Exponer API para integración con otras herramientas.

**Use Cases**:
- Integración con Grafana
- Scripts de automation
- Third-party integrations
- Custom dashboards

**Impacto**: ⭐⭐⭐
**Esfuerzo**: 🔨🔨🔨🔨 (8-12 días)

---

## Features Avanzadas (Future)

### 24. 🔐 **Secrets Manager** - FUTURA

**Concepto**: Gestionar secrets/passwords de forma segura.

**Features**:
- Store API keys, tokens, passwords
- Encrypted vault
- Share secrets between team
- Audit log de accesos
- Integration with HashiCorp Vault

---

### 25. 📊 **Service Dependency Graph** - FUTURA

**Concepto**: Visualizar dependencias entre servicios.

**Features**:
- Auto-detect service dependencies
- Graph visualization
- Impact analysis (what breaks if X fails)
- Service health propagation

---

### 26. 🔄 **GitOps Integration** - FUTURA

**Concepto**: Deploy containers desde Git repos.

**Features**:
- Connect to Git repo
- Auto-deploy on push
- Rollback to previous versions
- Preview deployments

---

### 27. 🧪 **Load Testing Tool** - FUTURA

**Concepto**: Stress test integrado.

**Features**:
- HTTP load testing
- CPU/RAM stress test
- Network bandwidth test
- Report generation

---

## Comparación con Competidores

### Portainer (Docker Management)

**Ventajas de Portainer**:
- ✅ Docker Swarm support
- ✅ Kubernetes support
- ✅ RBAC (Role-Based Access Control)
- ✅ Templates de aplicaciones

**Nuestras Ventajas**:
- ✅ Desktop app (no necesita servidor)
- ✅ SSH nativo a múltiples servidores
- ✅ Métricas de sistema (no solo Docker)
- ✅ Offline-first

**Features a Copiar**:
- Docker Compose UI (Portainer tiene excelente UI)
- Templates de stacks
- Endpoint management

---

### Cockpit (System Management)

**Ventajas de Cockpit**:
- ✅ Web-based
- ✅ Service management (systemd)
- ✅ Storage management
- ✅ Network configuration

**Nuestras Ventajas**:
- ✅ Multi-server desde una sola app
- ✅ Desktop app (mejor performance)
- ✅ Alertas más robustas

**Features a Copiar**:
- Service manager (systemctl UI)
- Storage/disk management UI
- Network configuration UI

---

### Netdata (Monitoring)

**Ventajas de Netdata**:
- ✅ Real-time metrics con alta resolución
- ✅ Auto-detection de servicios
- ✅ Alarm templates

**Nuestras Ventajas**:
- ✅ Desktop app (no instalar agente en servidor)
- ✅ SSH-based (más simple)
- ✅ Docker management integrado

**Features a Copiar**:
- High-resolution metrics (1s interval)
- Auto-detection de servicios
- Alarm templates

---

## Estimaciones de Tiempo

### Sprint 1 - Foundation (4 semanas)

**Semana 1-2**: Security Fixes (del análisis anterior)
- Command injection fix
- Encryption improvements
- Error boundaries
- Testing

**Semana 3-4**: Core Features
- Connection Groups UI
- Metric History (24h)
- Alert Snooze
- Bulk Operations

**Total**: ~160 horas

---

### Sprint 2 - Docker & Terminal (3 semanas)

**Semana 5-6**: Docker Compose
- UI completa para Compose
- Variables de entorno
- Testing con stacks reales

**Semana 7**: Terminal Improvements
- Multiple tabs
- Session persistence
- Command snippets

**Total**: ~120 horas

---

### Sprint 3 - Dashboard & Export (3 semanas)

**Semana 8-9**: Custom Dashboard
- Grid layout
- Widgets system
- Save/load layouts

**Semana 10**: Export & Reporting
- CSV/JSON export
- Scheduled reports
- Email integration

**Total**: ~120 horas

---

### Sprint 4 - SFTP & Advanced (4 semanas)

**Semana 11-13**: SFTP Integration
- File browser
- Upload/Download
- File editor
- Testing

**Semana 14**: Polish & Testing
- Bug fixes
- Performance optimization
- Documentation

**Total**: ~160 horas

---

## Priorización Recomendada (Próximos 3 Meses)

### Mes 1 - Estabilidad y Seguridad
1. ✅ **Security Fixes** (CRÍTICO) - del CODE_ANALYSIS.md
2. ✅ **Connection Groups UI** (CRÍTICO) - ya está el modelo
3. ✅ **Metric History 24h** (CRÍTICO) - feature más pedida
4. ✅ **Alert Snooze** (ALTA) - UX importante

### Mes 2 - Docker & Productivity
5. ✅ **Docker Compose UI** (CRÍTICO) - backend ya está
6. ✅ **Terminal Tabs** (ALTA) - muy útil para usuarios avanzados
7. ✅ **Command Snippets** (MEDIA) - ahorra tiempo
8. ✅ **Bulk Operations** (ALTA) - scaling importante

### Mes 3 - Analytics & Reporting
9. ✅ **Custom Dashboard** (ALTA) - diferenciador clave
10. ✅ **Export CSV/JSON** (ALTA) - reportes para management
11. ✅ **SFTP Browser** (ALTA) - feature killer
12. ✅ **Alert Routing** (ALTA) - para equipos

---

## Métricas de Éxito

**KPIs a Medir**:
- ⏱️ Tiempo promedio de conexión a servidor
- 📊 Número de métricas históricas almacenadas
- 🔔 Alertas disparadas vs false positives
- 🐳 Contenedores gestionados por usuario
- 📁 Archivos transferidos via SFTP
- ⭐ User satisfaction score (encuestas)

---

## Conclusión

**Top 5 Features Recomendadas (Máximo ROI)**:

1. 📊 **Metric History & Graphs** - Diferenciador clave, muy solicitado
2. 🐳 **Docker Compose UI** - Backend ya listo, solo falta UI
3. 📁 **Connection Groups UI** - Modelo ya existe, quick win
4. 📂 **SFTP Browser** - Feature killer, competidor de WinSCP
5. 🎨 **Custom Dashboard** - Personalización, power users

**Tiempo Total Estimado**: 14 semanas (~560 horas)

**Recomendación Final**: Enfocarse en los **Top 5** antes de añadir features avanzadas.

---

**Documento creado**: 16 Enero 2026  
**Próxima revisión**: Después de implementar Sprint 1
