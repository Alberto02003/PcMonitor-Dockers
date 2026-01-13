# Roadmap - PC Monitoring & Dockers

Este documento define las mejoras futuras organizadas por prioridad y fase de desarrollo.

**Estado Actual**: Fases 1-5 completadas. App funcional con monitoreo SSH, Docker, métricas en tiempo real, alertas y gestión de URLs de contenedores.

---

## 🔥 FASE 6: Alta Prioridad - Quick Wins


### 6.3 Docker Compose Management 🐳
**Objetivo**: Gestionar stacks completos, no solo contenedores individuales

**Tareas**:
- [ ] Backend: Comando `docker_compose_list` - listar stacks
- [ ] Backend: Comando `docker_compose_ps` - estado del stack
- [ ] Backend: Comando `docker_compose_up` - iniciar stack
- [ ] Backend: Comando `docker_compose_down` - detener stack
- [ ] Backend: Comando `docker_compose_restart` - reiniciar stack
- [ ] Backend: Parsear docker-compose.yml
- [ ] Frontend: Vista de stacks en DockersSection
- [ ] Mostrar dependencias entre servicios
- [ ] Logs agregados de todo el stack
- [ ] Variables de entorno editables
- [ ] Rebuild de servicios individuales
- [ ] Ver volúmenes y networks del stack

**Archivos a crear/modificar**:
- `src-tauri/src/docker.rs` (extender)
- `src-tauri/src/lib.rs`
- `src/services/tauri.js`
- `src/pages/MonitoringPage/components/ComposeSection/ComposeSection.jsx` (nuevo)
- `src/pages/MonitoringPage/components/ComposeModal/ComposeModal.jsx` (nuevo)

**Casos de uso**:
- Gestionar aplicaciones multi-contenedor
- Ver el estado completo de un stack
- Reiniciar todos los servicios a la vez

---

### 6.4 Terminal SSH Integrada 💻
**Objetivo**: Ejecutar comandos sin salir de la aplicación

**Tareas**:
- [ ] Instalar xterm.js y xterm-addon-fit
- [ ] Backend: WebSocket para comunicación bidireccional
- [ ] Backend: Comando para crear sesión PTY
- [ ] Frontend: Componente Terminal con xterm.js
- [ ] Múltiples tabs de terminal
- [ ] Historial de comandos (flechas arriba/abajo)
- [ ] Copiar/pegar con click derecho
- [ ] Snippets guardados (comandos frecuentes)
- [ ] Autocompletado básico
- [ ] Themes de terminal (dark, light, solarized)
- [ ] Resize responsivo
- [ ] Buscar en output del terminal

**Archivos a crear/modificar**:
- `src-tauri/src/terminal.rs` (nuevo)
- `src-tauri/src/lib.rs`
- `src/components/Terminal/Terminal.jsx` (nuevo)
- `src/components/Terminal/Terminal.css` (nuevo)
- `src/pages/MonitoringPage/MonitoringPage.jsx`

**Snippets sugeridos**:
- `docker ps -a`
- `docker logs --tail 100 -f [container]`
- `systemctl status [service]`
- `tail -f /var/log/syslog`
- `htop`

---

### 6.5 Dashboard Multi-servidor 📊
**Objetivo**: Vista consolidada de todos los servidores conectados

**Tareas**:
- [ ] Página MultiDashboard con grid de servidores
- [ ] Card compacto por servidor con métricas clave
- [ ] Código de colores por health (verde/amarillo/rojo)
- [ ] Click en card → ir a MonitoringPage de ese servidor
- [ ] Filtros: por grupo, por estado, por carga
- [ ] Ordenar por: nombre, CPU, RAM, disco
- [ ] Vista de mapa (geolocalización opcional)
- [ ] Grupos de servidores (producción, dev, staging)
- [ ] Alertas agregadas (contador total)
- [ ] Comparar métricas entre servidores
- [ ] Dashboard público (solo lectura, sin credenciales)

**Archivos a crear/modificar**:
- `src/pages/MultiDashboard/MultiDashboard.jsx` (nuevo)
- `src/pages/MultiDashboard/MultiDashboard.css` (nuevo)
- `src/components/ServerCard/ServerCard.jsx` (nuevo)
- `src/components/App/App.jsx`
- `src/stores/serversStore.js` (nuevo)

**Layout sugerido**:
```
┌─────────────────────────────────────────┐
│  [Todos] [Prod] [Dev] [Staging]        │
├─────────┬─────────┬─────────┬──────────┤
│ Server1 │ Server2 │ Server3 │ Server4  │
│ 🟢 CPU  │ 🟡 CPU  │ 🟢 CPU  │ 🔴 CPU   │
│ 12%     │ 78%     │ 23%     │ 95%      │
│ RAM 45% │ RAM 82% │ RAM 34% │ RAM 89%  │
└─────────┴─────────┴─────────┴──────────┘
```

---

## 🎯 FASE 7: Media Prioridad - Features Potentes

### 7.1 Logs Centralizados 📜
**Objetivo**: Ver y buscar logs de múltiples fuentes

**Tareas**:
- [ ] Backend: Comando `get_system_logs` (syslog, dmesg, etc.)
- [ ] Backend: Streaming de logs en tiempo real
- [ ] Componente LogViewer con virtualización
- [ ] Buscar en logs (regex support)
- [ ] Filtros por nivel (error, warning, info, debug)
- [ ] Resaltar palabras clave
- [ ] Follow mode (tail -f style)
- [ ] Descargar logs como archivo
- [ ] Ver logs de Docker + Sistema juntos
- [ ] Timestamp con timezone

**Archivos a crear**:
- `src-tauri/src/logs.rs` (nuevo)
- `src/components/LogViewer/LogViewer.jsx` (nuevo)
- `src/pages/MonitoringPage/components/LogsSection/LogsSection.jsx` (nuevo)

---

### 7.2 Gestión de Procesos ⚙️
**Objetivo**: Ver y controlar procesos del sistema

**Tareas**:
- [ ] Backend: Parsear `ps aux` o usar `/proc`
- [ ] Lista de procesos con CPU/RAM por proceso
- [ ] Matar procesos (kill signal)
- [ ] Ver árbol de procesos (parent-child)
- [ ] Buscar por nombre o PID
- [ ] Ordenar por CPU, RAM, tiempo
- [ ] Gestión de servicios systemd
  - `systemctl status`
  - `systemctl start/stop/restart`
  - `systemctl enable/disable`
- [ ] Ver logs de servicio

**Archivos a crear**:
- `src-tauri/src/processes.rs` (nuevo)
- `src/pages/MonitoringPage/components/ProcessesSection/ProcessesSection.jsx` (nuevo)

---

### 7.3 Network Monitoring 🌐
**Objetivo**: Monitoreo de red avanzado

**Tareas**:
- [ ] Backend: Parsear `netstat` o `ss`
- [ ] Puertos abiertos (listening)
- [ ] Conexiones activas (established)
- [ ] Tráfico por interfaz (RX/TX rates)
- [ ] Ping a hosts externos
- [ ] Traceroute integrado
- [ ] Test de velocidad (speedtest-cli)
- [ ] Firewall status (ufw/iptables rules)
- [ ] Ver DNS configurado
- [ ] Gráfico de tráfico en tiempo real

**Archivos a crear**:
- `src-tauri/src/network.rs` (nuevo)
- `src/pages/MonitoringPage/components/NetworkSection/NetworkSection.jsx` (nuevo)

---

### 7.4 Backups & Snapshots 💾
**Objetivo**: Gestión de backups automáticos

**Tareas**:
- [ ] Backend: Comandos para crear backups
- [ ] Programar backups automáticos (cron)
- [ ] Backup de Docker volumes
- [ ] Database dumps (MySQL, PostgreSQL, MongoDB)
- [ ] Restaurar desde backup
- [ ] Ver espacio usado por backups
- [ ] Comprimir/descomprimir archivos
- [ ] Backup incremental vs completo
- [ ] Rotación de backups antiguos
- [ ] Verificar integridad de backups

**Archivos a crear**:
- `src-tauri/src/backups.rs` (nuevo)
- `src/pages/BackupsPage/BackupsPage.jsx` (nuevo)

---

### 7.5 SSL/TLS Certificate Monitor 🔒
**Objetivo**: Monitorear certificados SSL

**Tareas**:
- [ ] Backend: Check SSL de dominios
- [ ] Ver fecha de expiración
- [ ] Alertas 30/15/7 días antes de expirar
- [ ] Ver cadena de certificados
- [ ] Verificar validez del certificado
- [ ] Auto-renovación con Let's Encrypt (opcional)
- [ ] Múltiples dominios monitoreados

**Archivos a crear**:
- `src-tauri/src/ssl.rs` (nuevo)
- `src/pages/MonitoringPage/components/SSLWidget/SSLWidget.jsx` (nuevo)

---

## 💡 FASE 8: Baja Prioridad - Nice to Have

### 8.1 Cron Jobs Manager 📅
**Tareas**:
- [ ] Listar crontabs del usuario
- [ ] Editar/agregar/eliminar crons
- [ ] Ver historial de ejecuciones
- [ ] Logs de cron jobs
- [ ] Templates de tareas comunes
- [ ] Validar sintaxis de cron

---

### 8.2 File Manager Web 📁
**Tareas**:
- [ ] Navegador de archivos SSH (SFTP)
- [ ] Subir/descargar archivos
- [ ] Editor de texto integrado
- [ ] Buscar archivos
- [ ] Permisos y propietarios (chmod/chown)
- [ ] Comprimir/descomprimir

---

### 8.3 Database Management 🗄️
**Tareas**:
- [ ] Conectar a MySQL/PostgreSQL/MongoDB
- [ ] Ver tablas y esquemas
- [ ] Ejecutar queries básicas
- [ ] Exportar/importar datos
- [ ] Ver tamaño de bases de datos
- [ ] Backup de DBs

---

### 8.4 Git Integration 🔀
**Tareas**:
- [ ] Listar repositorios en el servidor
- [ ] Ver branches activos
- [ ] Pull/push desde la UI
- [ ] Ver últimos commits
- [ ] Diff visuales

---

### 8.5 Command Palette 🎯
**Tareas**:
- [ ] Paleta de comandos (Ctrl+P) estilo VSCode
- [ ] Buscar y ejecutar acciones rápidas
- [ ] Buscar servidores
- [ ] Buscar contenedores
- [ ] Buscar en logs
- [ ] Historial de comandos recientes
- [ ] Fuzzy search

---

## 🎨 FASE 9: UI/UX Improvements

### 9.1 Temas y Personalización
**Tareas**:
- [x] Dark mode básico (COMPLETADO - Fase 4)
- [ ] Múltiples temas preconstruidos (Nord, Dracula, Monokai)
- [ ] Editor de temas custom
- [ ] Cambiar colores de acento
- [ ] Fuentes personalizables
- [ ] Tamaño de UI (compact/normal/large)

---

### 9.2 Dashboard Personalizable
**Tareas**:
- [ ] Widgets drag & drop (react-grid-layout)
- [ ] Crear dashboards personalizados por servidor
- [ ] Templates de dashboard (web, database, cache)
- [ ] Compartir dashboards (export/import JSON)
- [ ] Dashboards públicos (embed code)

---

### 9.3 Atajos de Teclado Avanzados
**Tareas**:
- [x] useKeyboardShortcuts básico (COMPLETADO - Fase 4)
- [ ] Panel de shortcuts (Ctrl+?)
- [ ] Shortcuts personalizables por usuario
- [ ] Vim mode para power users
- [ ] Grabar macros de teclado

---

### 9.4 Búsqueda Global
**Tareas**:
- [ ] Buscar en toda la app (Ctrl+K)
- [ ] Buscar servidores por nombre/IP
- [ ] Buscar contenedores
- [ ] Buscar en logs históricos
- [ ] Buscar comandos ejecutados
- [ ] Fuzzy search con scoring

---

## 🔐 FASE 10: Seguridad y Compliance

### 10.1 Audit Log
**Tareas**:
- [ ] Backend: Registrar todas las acciones
- [ ] Quién hizo qué y cuándo
- [ ] Comandos SSH ejecutados
- [ ] Cambios en configuración
- [ ] Logins/logouts
- [ ] Exportar audit logs a JSON/CSV
- [ ] Buscar en audit log
- [ ] Retención configurable

---

### 10.2 Roles y Permisos (Multi-usuario)
**Tareas**:
- [ ] Sistema de usuarios y roles
- [ ] Admin vs Viewer vs Operator
- [ ] Permisos por servidor
- [ ] Solo lectura vs escritura
- [ ] 2FA para acciones críticas
- [ ] Sesiones con timeout
- [ ] Login con OAuth (Google, GitHub)

---

### 10.3 Secrets Manager
**Tareas**:
- [ ] Vault para passwords y API keys
- [ ] Integración con HashiCorp Vault
- [ ] Rotación automática de credenciales
- [ ] Compartir secrets entre equipo
- [ ] Audit trail de acceso a secrets

---

## 📊 FASE 11: Analytics y Reportes

### 11.1 Reportes Automáticos
**Tareas**:
- [ ] Backend: Generador de reportes
- [ ] Reporte diario/semanal/mensual por email
- [ ] Uptime report
- [ ] Uso de recursos promedio
- [ ] Incidentes y alertas del período
- [ ] PDF/HTML export
- [ ] Gráficos incluidos en reportes

---

### 11.2 Capacity Planning
**Tareas**:
- [ ] Predecir cuándo se llenará el disco
- [ ] Predecir cuándo se necesitará más RAM
- [ ] Análisis de tendencias de crecimiento
- [ ] Recomendaciones de upgrade
- [ ] Machine Learning básico para predicciones

---

### 11.3 Cost Tracking (Cloud)
**Tareas**:
- [ ] Integración con AWS/Azure/GCP APIs
- [ ] Estimar costos por servidor
- [ ] Recursos infrautilizados
- [ ] Recomendaciones de rightsizing
- [ ] Alertas de presupuesto

---

## 🔧 FASE 12: DevOps & CI/CD

### 12.1 Integration con CI/CD
**Tareas**:
- [ ] Integración con GitHub Actions API
- [ ] Ver status de workflows
- [ ] Triggers de deploy desde la app
- [ ] Ver últimos deploys
- [ ] Rollback rápido
- [ ] Integración con GitLab CI
- [ ] Integración con Jenkins

---

### 12.2 Webhooks
**Tareas**:
- [ ] Sistema de webhooks configurable
- [ ] Webhook cuando hay alerta
- [ ] Webhook al cambiar estado de container
- [ ] Integración con Zapier/IFTTT
- [ ] Custom HTTP requests con templating

---

## 🌐 FASE 13: Networking Avanzado

### 13.1 VPN/Proxy Management
**Tareas**:
- [ ] Status de VPN (WireGuard, OpenVPN)
- [ ] Conectar/desconectar VPN
- [ ] Ver túneles activos
- [ ] Gestionar configuración de proxies

---

### 13.2 Load Balancer Monitor
**Tareas**:
- [ ] Integración con nginx/haproxy
- [ ] Ver backends y su estado
- [ ] Health checks
- [ ] Distribuir tráfico manualmente
- [ ] Stats en tiempo real

---

## 📱 FASE 14: Mobile & Remote

### 14.1 API REST
**Tareas**:
- [ ] Backend: API REST completa
- [ ] Documentación Swagger/OpenAPI
- [ ] Rate limiting
- [ ] API keys management
- [ ] Webhooks para integraciones

---

### 14.2 Progressive Web App (PWA)
**Tareas**:
- [ ] Service Worker
- [ ] Modo offline
- [ ] Datos en cache
- [ ] Notificaciones push web
- [ ] Instalar como app

---

## 🚀 FASE 15: Performance

### 15.1 Optimización de Renders
**Tareas**:
- [ ] Agregar React.memo a widgets
- [ ] Revisar useEffect sin dependencias
- [ ] Implementar useMemo para cálculos
- [ ] Implementar useCallback para handlers
- [ ] React DevTools Profiler

---

### 15.2 Lazy Loading
**Tareas**:
- [ ] Code splitting por rutas
- [ ] Lazy load de modales
- [ ] Lazy load de gráficos
- [ ] Virtualization para listas largas

---

## 📝 Registro de Progreso Reciente

| Fecha | Fase | Tarea | Estado |
|-------|------|-------|--------|
| 2026-01-12 | Fase 1-3 | Core, Seguridad, Refactoring | ✅ Completado |
| 2026-01-12 | Fase 4 | Testing (208 tests) | ✅ Completado |
| 2026-01-12 | Fase 5 | Mejoras UX, Alertas | ✅ Completado |
| 2026-01-12 | Fase 4 | Dark Mode, Métricas History, Notificaciones, Shortcuts | ✅ Completado |
| 2026-01-12 | Feature | Docker URLs y acceso rápido | ✅ Completado |
| 2026-01-12 | Build | Instaladores MSI y NSIS con logo personalizado | ✅ Completado |

---

## 🎯 Top 5 Recomendado para Próxima Sprint

Si tuviera que elegir 5 features para implementar ahora mismo:

1. **📊 Gráficos de Métricas Históricas** (Fase 6.1)
   - Ya tienes el hook useMetricsHistory
   - Solo falta visualizar con Chart.js
   - Alto impacto visual

2. **🔔 Sistema de Alertas Avanzado** (Fase 6.2)
   - Telegram/Discord/Email
   - Crítico para producción
   - Los usuarios lo necesitan

3. **🐳 Docker Compose Management** (Fase 6.3)
   - Gestionar stacks completos
   - Muy solicitado
   - Complementa Docker actual

4. **💻 Terminal SSH Integrada** (Fase 6.4)
   - xterm.js + WebSocket
   - No salir de la app
   - Super útil para dev

5. **📊 Dashboard Multi-servidor** (Fase 6.5)
   - Ver todos los servidores a la vez
   - Detectar problemas rápido
   - Vista panorámica

---

## 📌 Notas

- **Priorizar estabilidad** sobre nuevas features
- **Tests obligatorios** para cada feature nueva
- **Commits frecuentes** con mensajes descriptivos
- **Actualizar roadmap** al completar tareas
- **Documentar** en FASE4.md, DOCKER_URLS.md, etc.
- **Performance first**: medir antes de optimizar

---

## 🏆 Estado Actual del Proyecto

```
✅ Core funcional (SSH, Docker, Métricas)
✅ Seguridad implementada (cifrado, validación)
✅ 208 tests unitarios passing
✅ Sistema de alertas funcional
✅ Dark mode y themes
✅ Métricas históricas (backend)
✅ Notificaciones desktop
✅ Keyboard shortcuts
✅ Docker URLs de acceso
✅ Instaladores generados

📊 Líneas de código: ~10,000+
📦 Tamaño instalador: ~3-5 MB
⚡ Tests: 208/208 passing
🎨 Componentes: 50+
```

**La app está lista para producción. Las fases 6+ son mejoras opcionales.**
