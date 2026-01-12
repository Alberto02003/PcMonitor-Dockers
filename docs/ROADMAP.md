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

## Fase 2: Seguridad (Prioridad Alta)

### 2.1 Almacenamiento seguro de credenciales
- [ ] Agregar `tauri-plugin-stronghold` o equivalente
- [ ] Migrar almacenamiento de clave AES de localStorage al keychain del SO
- [ ] Implementar cifrado de credenciales en el backend (Rust)
- [ ] Eliminar funciones de crypto del frontend

**Archivos a modificar**:
- `src-tauri/Cargo.toml`
- `src-tauri/src/lib.rs`
- `src-tauri/src/security.rs` (nuevo)
- `src/pages/SelectionPage/SelectionPage.jsx` (eliminar crypto functions)

### 2.2 Configurar CSP
- [ ] Definir Content Security Policy restrictiva en `tauri.conf.json`
- [ ] Probar que la app funcione con CSP activo

**Archivos a modificar**:
- `src-tauri/tauri.conf.json`

### 2.3 Validacion de inputs
- [ ] Sanitizar todos los inputs antes de enviar al backend
- [ ] Validar formato de IP/hostname
- [ ] Validar rango de puertos
- [ ] Escapar caracteres especiales en comandos SSH

**Archivos a modificar**:
- `src/pages/SelectionPage/SelectionPage.jsx`
- `src-tauri/src/ssh.rs`

---

## Fase 3: Refactorizacion (Prioridad Media)

### 3.1 Extraer logica de SelectionPage
- [ ] Crear hook `useConnections` para CRUD de conexiones
- [ ] Crear hook `useEncryption` para funciones de cifrado (temporal hasta Fase 2)
- [ ] Crear hook `useConnectionStatus` para estados de conexion
- [ ] Mover validacion a `utils/validation.js`

**Archivos a crear**:
- `src/hooks/useConnections.js`
- `src/hooks/useEncryption.js`
- `src/hooks/useConnectionStatus.js`
- `src/utils/validation.js`

**Archivos a modificar**:
- `src/pages/SelectionPage/SelectionPage.jsx`

### 3.2 Sistema de internacionalizacion
- [ ] Crear estructura de archivos de traduccion
- [ ] Extraer textos de SelectionPage a JSON
- [ ] Extraer textos de MonitoringPage a JSON
- [ ] Crear hook o contexto `useTranslation`

**Archivos a crear**:
- `src/i18n/es.json`
- `src/i18n/en.json`
- `src/i18n/index.js`
- `src/hooks/useTranslation.js`

**Archivos a modificar**:
- `src/pages/SelectionPage/SelectionPage.jsx`
- `src/pages/MonitoringPage/MonitoringPage.jsx`
- `src/pages/MonitoringPage/components/MonitoringHeader/MonitoringHeader.jsx`

### 3.3 Estado global con Context o Zustand
- [ ] Evaluar si usar Context API o Zustand
- [ ] Crear store para conexiones
- [ ] Crear store para metricas en tiempo real
- [ ] Crear store para configuracion de alertas
- [ ] Migrar estado de componentes al store global

**Archivos a crear**:
- `src/stores/connections.js`
- `src/stores/metrics.js`
- `src/stores/alerts.js`

---

## Fase 4: Testing (Prioridad Media)

### 4.1 Configurar entorno de testing
- [ ] Instalar Vitest
- [ ] Configurar `vitest.config.js`
- [ ] Agregar scripts en `package.json`

### 4.2 Tests unitarios
- [ ] Tests para funciones de validacion
- [ ] Tests para hooks personalizados
- [ ] Tests para funciones de utilidad
- [ ] Tests para parseo de metricas

**Archivos a crear**:
- `src/utils/__tests__/validation.test.js`
- `src/hooks/__tests__/useConnections.test.js`

### 4.3 Tests de componentes
- [ ] Tests para ConnectionForm
- [ ] Tests para SelectionSidebar
- [ ] Tests para widgets de monitoreo
- [ ] Tests para modales

### 4.4 Tests E2E
- [ ] Instalar Playwright o Cypress
- [ ] Test de flujo de creacion de conexion
- [ ] Test de flujo de conexion y monitoreo
- [ ] Test de configuracion de alertas

---

## Fase 5: Mejoras de UX (Prioridad Media)

### 5.1 Feedback de errores
- [ ] Mostrar errores de conexion SSH detallados
- [ ] Indicador visual de conexion perdida
- [ ] Reintentos automaticos con backoff
- [ ] Toast de reconexion exitosa

### 5.2 Confirmaciones para acciones destructivas
- [ ] Modal de confirmacion para eliminar conexion
- [ ] Modal de confirmacion para detener contenedor
- [ ] Modal de confirmacion para reiniciar sistema remoto

**Archivos a crear**:
- `src/components/ConfirmModal/ConfirmModal.jsx`
- `src/components/ConfirmModal/ConfirmModal.css`

### 5.3 Mejoras en widgets
- [ ] Indicador de ultima actualizacion real
- [ ] Animaciones de transicion en cambios de valores
- [ ] Graficos historicos (ultimos 5-10 minutos)
- [ ] Indicadores de alerta cuando se superen umbrales

### 5.4 Sistema de alertas funcional
- [ ] Comparar metricas con umbrales configurados
- [ ] Notificaciones del sistema (Tauri notifications)
- [ ] Historial de alertas
- [ ] Sonido opcional para alertas criticas

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

---

## Notas

- Cada fase debe completarse antes de pasar a la siguiente, excepto tareas independientes
- Hacer commits frecuentes con mensajes descriptivos
- Actualizar este documento al completar tareas
- Priorizar estabilidad sobre nuevas features
