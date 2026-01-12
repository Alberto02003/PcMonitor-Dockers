# Roadmap de Mejoras - PC Monitoring Dockers

Este documento define las mejoras pendientes organizadas por prioridad y fase de desarrollo.

---

## Fase 1: Funcionalidad Core (Prioridad Alta) - COMPLETADA

### 1.1 Implementar conexion SSH real
- [x] Agregar crate `ssh2` en `Cargo.toml`
- [x] Crear comando Tauri `ssh_connect` para establecer conexion
- [x] Crear comando Tauri `ssh_disconnect` para cerrar conexion
- [x] Crear comando Tauri `ssh_execute` para ejecutar comandos remotos
- [x] Manejar errores de conexion (timeout, auth failed, host unreachable)
- [x] Implementar pool de conexiones para reutilizacion

**Archivos creados/modificados**:
- `src-tauri/Cargo.toml`
- `src-tauri/src/lib.rs`
- `src-tauri/src/ssh.rs` (nuevo)
- `src/services/tauri.js` (nuevo)

### 1.2 Metricas del sistema en tiempo real
- [x] Comando Tauri `get_system_metrics` que ejecute comandos remotos:
  - `top -bn1` para CPU y procesos
  - `free -m` para memoria RAM y Swap
  - `df -h` para disco
  - `cat /proc/loadavg` para carga del sistema
  - `uptime` para tiempo activo
  - `sensors` para temperaturas (si disponible)
- [x] Implementar polling configurable (intervalo en settings)
- [x] Parsear y estructurar respuestas en Rust
- [x] Enviar metricas al frontend via comandos Tauri

**Archivos creados/modificados**:
- `src-tauri/src/metrics.rs` (nuevo)
- `src-tauri/src/lib.rs`
- `src/hooks/useMetrics.js` (nuevo)
- `src/pages/MonitoringPage/MonitoringPage.jsx`
- `src/pages/MonitoringPage/components/SystemWidgets/SystemWidgets.jsx`
- `src/pages/MonitoringPage/components/HeroWidget/HeroWidget.jsx`
- `src/pages/MonitoringPage/components/CoreGridWidget/CoreGridWidget.jsx`
- `src/pages/MonitoringPage/components/ExtendedGridWidget/ExtendedGridWidget.jsx`
- `src/pages/MonitoringPage/components/DetailsWidget/DetailsWidget.jsx`
- `src/pages/MonitoringPage/components/SpecsWidget/SpecsWidget.jsx`

### 1.3 Control real de Docker
- [x] Comando Tauri `docker_list` - listar contenedores
- [x] Comando Tauri `docker_stats` - metricas de contenedores
- [x] Comando Tauri `docker_start` - iniciar contenedor
- [x] Comando Tauri `docker_stop` - detener contenedor
- [x] Comando Tauri `docker_restart` - reiniciar contenedor
- [x] Comando Tauri `docker_logs` - obtener logs

**Archivos creados/modificados**:
- `src-tauri/src/docker.rs` (nuevo)
- `src-tauri/src/lib.rs`
- `src/pages/MonitoringPage/components/DockersSection/DockersSection.jsx`
- `src/pages/MonitoringPage/components/DockerModal/DockerModal.jsx`

---

## Fase 2: Seguridad (Prioridad Alta) - COMPLETADA

### 2.1 Almacenamiento seguro de credenciales
- [x] Agregar módulo de seguridad en Rust
- [x] Implementar cifrado de credenciales en el backend (Rust)
- [x] Crear API de almacenamiento seguro (secure_save_connection, secure_load_connections, etc.)
- [x] Separar credenciales sensibles de datos públicos

**Archivos creados/modificados**:
- `src-tauri/Cargo.toml` - Agregadas dependencias base64, rand
- `src-tauri/src/lib.rs` - Agregados comandos de secure storage
- `src-tauri/src/security.rs` (nuevo) - Módulo de seguridad completo
- `src/services/tauri.js` - Agregadas funciones secureStorage*

### 2.2 Configurar CSP
- [x] Definir Content Security Policy restrictiva en `tauri.conf.json`
- [x] CSP configurada: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'

**Archivos modificados**:
- `src-tauri/tauri.conf.json`

### 2.3 Validacion de inputs
- [x] Validar formato de IP/hostname (validate_host)
- [x] Validar rango de puertos (validate_port)
- [x] Validar username (validate_username)
- [x] Función sanitize_command_arg disponible para comandos SSH
- [x] Validación integrada en comandos ssh_connect y ssh_test

**Archivos modificados**:
- `src-tauri/src/security.rs` - Funciones de validación
- `src-tauri/src/lib.rs` - Validación en comandos SSH

---

## Fase 3: Refactorizacion (Prioridad Media) - COMPLETADA

### 3.1 Extraer logica de SelectionPage
- [x] Crear hook `useConnections` para CRUD de conexiones
- [x] Crear utils `encryption.js` para funciones de cifrado
- [x] Crear hook `useConnectionStatus` para estados de conexion
- [x] Mover validacion a `utils/validation.js`

**Archivos creados**:
- `src/hooks/useConnections.js`
- `src/hooks/useConnectionStatus.js`
- `src/utils/validation.js`
- `src/utils/encryption.js`

### 3.2 Sistema de internacionalizacion
- [x] Crear estructura de archivos de traduccion
- [x] Extraer textos de SelectionPage a JSON
- [x] Extraer textos de MonitoringPage a JSON
- [x] Crear hook `useTranslation`

**Archivos creados**:
- `src/i18n/es.json`
- `src/i18n/en.json`
- `src/i18n/index.js`
- `src/hooks/useTranslation.js`

### 3.3 Estado global con Zustand
- [x] Instalar Zustand como gestor de estado
- [x] Crear store para conexiones (con persistencia cifrada)
- [x] Crear store para metricas en tiempo real
- [x] Crear store para configuracion de alertas

**Archivos creados**:
- `src/stores/connectionsStore.js`
- `src/stores/metricsStore.js`
- `src/stores/alertsStore.js`
- `src/stores/index.js`

---

## Fase 4: Testing (Prioridad Media) - COMPLETADA

### 4.1 Configurar entorno de testing
- [x] Instalar Vitest
- [x] Configurar `vitest.config.js`
- [x] Agregar scripts en `package.json`

### 4.2 Tests unitarios - Fases 1 y 2
- [x] Tests para conexion SSH (fase1-ssh.test.js)
- [x] Tests para metricas del sistema (fase1-metrics.test.js)
- [x] Tests para Docker (fase1-docker.test.js)
- [x] Tests para almacenamiento seguro (fase2-security.test.js)
- [x] Tests para validacion de inputs (fase2-validation.test.js)

### 4.3 Tests unitarios - Fase 3
- [x] Tests para utils/validation.js (fase3-validation.test.js)
- [x] Tests para utils/encryption.js (fase3-encryption.test.js)
- [x] Tests para hooks useConnections y useConnectionStatus (fase3-hooks.test.js)
- [x] Tests para stores Zustand (fase3-stores.test.js)
- [x] Tests para sistema i18n (fase3-i18n.test.js)

**Archivos creados**:
- `test/fase1-ssh.test.js` - 12 tests
- `test/fase1-metrics.test.js` - 10 tests
- `test/fase1-docker.test.js` - 22 tests
- `test/fase2-security.test.js` - 15 tests
- `test/fase2-validation.test.js` - 33 tests
- `test/fase3-validation.test.js` - 33 tests
- `test/fase3-encryption.test.js` - 16 tests
- `test/fase3-hooks.test.js` - 19 tests
- `test/fase3-stores.test.js` - 27 tests
- `test/fase3-i18n.test.js` - 21 tests

**Total: 208 tests (207 passing, 1 skipped)**

### 4.4 Tests de componentes (Pendiente)
- [ ] Tests para ConnectionForm
- [ ] Tests para SelectionSidebar
- [ ] Tests para widgets de monitoreo

### 4.5 Tests E2E (Pendiente para futuro)
- [ ] Instalar Playwright o Cypress
- [ ] Test de flujo completo

---

## Fase 5: Mejoras de UX (Prioridad Media) - COMPLETADA

### 5.1 Feedback de errores
- [x] Mostrar errores de conexion SSH detallados
- [x] Indicador visual de conexion perdida (ConnectionStatus component)
- [x] Reintentos automaticos con backoff (useRetry hook)
- [x] Soporte para reconexion manual/automatica

### 5.2 Confirmaciones para acciones destructivas
- [x] Modal de confirmacion generico (ConfirmModal component)
- [x] Soporte para variantes: danger, warning, info
- [x] Estados de loading y animaciones

**Archivos creados**:
- `src/components/ConfirmModal/ConfirmModal.jsx`
- `src/components/ConfirmModal/ConfirmModal.css`
- `src/components/ConnectionStatus/ConnectionStatus.jsx`
- `src/components/ConnectionStatus/ConnectionStatus.css`

### 5.3 Mejoras en widgets
- [x] Indicador de ultima actualizacion (LastUpdate component)
- [x] Tiempo relativo actualizado en tiempo real
- [x] Boton de refresh integrado

**Archivos creados**:
- `src/components/LastUpdate/LastUpdate.jsx`
- `src/components/LastUpdate/LastUpdate.css`

### 5.4 Sistema de alertas funcional
- [x] AlertBadge para mostrar contador de alertas
- [x] AlertList para listar alertas activas
- [x] AlertWidget para dashboard
- [x] useAlerts hook para integracion
- [x] useAlertMonitor para monitoreo automatico
- [x] Comparacion con umbrales configurados
- [x] Historial de alertas persistente

**Archivos creados**:
- `src/components/AlertBadge/AlertBadge.jsx`
- `src/components/AlertBadge/AlertBadge.css`
- `src/hooks/useRetry.js`
- `src/hooks/useAlerts.js`
- `src/components/index.js` (exportaciones centralizadas)

---

## Fase 6: Performance (Prioridad Media)

### 6.1 Optimizacion de renders
- [ ] Agregar `React.memo` a widgets
- [ ] Revisar y corregir useEffect sin dependencias
- [ ] Implementar `useMemo` para calculos costosos
- [ ] Implementar `useCallback` para handlers

**Archivos a modificar**:
- `src/pages/MonitoringPage/MonitoringPage.jsx` (linea 171-177)
- `src/pages/MonitoringPage/components/SystemWidgets/SystemWidgets.jsx`
- Todos los widgets

### 6.2 Lazy loading
- [ ] Implementar lazy loading para MonitoringPage
- [ ] Implementar lazy loading para modales

---

## Fase 7: Accesibilidad (Prioridad Baja)

### 7.1 Navegacion por teclado
- [ ] Focus trap en modales
- [ ] Navegacion con flechas en lista de conexiones
- [ ] Shortcuts de teclado (Ctrl+N nueva conexion, etc.)

### 7.2 Screen readers
- [ ] Revisar aria-labels en iconos
- [ ] Agregar aria-live para actualizaciones de metricas
- [ ] Roles ARIA correctos en componentes interactivos

### 7.3 Contraste y visuales
- [ ] Verificar contraste WCAG AA
- [ ] Agregar indicadores no solo basados en color
- [ ] Soporte para modo de alto contraste

---

## Fase 8: Features Adicionales (Prioridad Baja)

### 8.1 Tema claro
- [ ] Definir variables CSS para tema claro
- [ ] Implementar toggle de tema funcional
- [ ] Persistir preferencia de tema

### 8.2 Exportacion de datos
- [ ] Exportar metricas a CSV
- [ ] Exportar reportes en PDF
- [ ] Programar exportaciones automaticas

### 8.3 Multiples conexiones simultaneas
- [ ] Permitir monitorear varias maquinas a la vez
- [ ] Vista de dashboard con todas las conexiones
- [ ] Comparativa de metricas entre maquinas

### 8.4 Graficos avanzados
- [ ] Integrar libreria de graficos (Chart.js, Recharts)
- [ ] Historico de metricas (ultimas 24h)
- [ ] Graficos de tendencia

---

## Registro de Progreso

| Fecha | Fase | Tarea | Estado |
|-------|------|-------|--------|
| 2026-01-12 | 1.1 | Implementar conexion SSH real | Completado |
| 2026-01-12 | 1.2 | Metricas del sistema en tiempo real | Completado |
| 2026-01-12 | 1.3 | Control real de Docker | Completado |
| 2026-01-12 | 2.1 | Almacenamiento seguro de credenciales | Completado |
| 2026-01-12 | 2.2 | Configurar CSP | Completado |
| 2026-01-12 | 2.3 | Validacion de inputs | Completado |
| 2026-01-12 | 3.1 | Extraer logica de SelectionPage | Completado |
| 2026-01-12 | 3.2 | Sistema de internacionalizacion | Completado |
| 2026-01-12 | 3.3 | Estado global con Zustand | Completado |
| 2026-01-12 | 4.1 | Configurar entorno de testing | Completado |
| 2026-01-12 | 4.2 | Tests unitarios Fases 1-2 | Completado |
| 2026-01-12 | 4.3 | Tests unitarios Fase 3 | Completado |
| 2026-01-12 | 5.1 | Feedback de errores y reintentos | Completado |
| 2026-01-12 | 5.2 | Modal de confirmacion | Completado |
| 2026-01-12 | 5.3 | Mejoras en widgets (LastUpdate) | Completado |
| 2026-01-12 | 5.4 | Sistema de alertas funcional | Completado |

---

## Notas

- Cada fase debe completarse antes de pasar a la siguiente, excepto tareas independientes
- Hacer commits frecuentes con mensajes descriptivos
- Actualizar este documento al completar tareas
- Priorizar estabilidad sobre nuevas features
