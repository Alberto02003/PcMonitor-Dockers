# PC Monitor-Dockers - Análisis Exhaustivo de Código

**Fecha**: 16 de Enero de 2026  
**Versión Analizada**: v0.1.5  
**Total de Archivos**: 81 JavaScript/JSX + 9 Rust  
**Total de Líneas**: ~13,843 líneas (Frontend) + ~3,500 líneas (Backend)

---

## Tabla de Contenidos

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Vulnerabilidades Críticas de Seguridad](#vulnerabilidades-críticas-de-seguridad)
3. [Problemas de Alto Impacto](#problemas-de-alto-impacto)
4. [Problemas de Medio Impacto](#problemas-de-medio-impacto)
5. [Mejoras de Código y Refactoring](#mejoras-de-código-y-refactoring)
6. [Features Faltantes](#features-faltantes)
7. [Plan de Acción Priorizado](#plan-de-acción-priorizado)
8. [Código de Ejemplo para Fixes](#código-de-ejemplo-para-fixes)

---

## Resumen Ejecutivo

### Calificación General: **B-** (Bueno pero necesita mejoras)

**Fortalezas**:
- ✅ Arquitectura limpia con separación de responsabilidades
- ✅ Uso correcto de Zustand para state management
- ✅ Integración robusta con Tauri
- ✅ Features completas de monitoreo SSH
- ✅ Código Rust mayormente seguro (sin unsafe blocks)

**Debilidades Críticas**:
- 🔴 **CRÍTICO**: Vulnerabilidad de Command Injection en backend Rust
- 🔴 **CRÍTICO**: Encriptación débil (XOR) en security.rs
- 🔴 **CRÍTICO**: Falta encryption key storage en localStorage (inseguro)
- 🔴 **ALTO**: Sin error boundaries (crashes no manejados)
- 🔴 **ALTO**: Memory leaks potenciales (SSH connections, WebSocket tasks)

### Métricas de Código

| Categoría | Cantidad | Severidad |
|-----------|----------|-----------|
| Vulnerabilidades Críticas | 3 | 🔴 |
| Problemas de Seguridad Alta | 4 | 🟠 |
| Problemas de Performance | 6 | 🟡 |
| Code Smells | 12 | 🔵 |
| Dead Code | 3 archivos | ℹ️ |
| Código Duplicado | 5 casos | ℹ️ |
| Missing Features | 25+ | ℹ️ |

---

## Vulnerabilidades Críticas de Seguridad

### 1. 🔴 **Command Injection en Backend Rust** - CRÍTICO

**Archivos Afectados**: 
- `src-tauri/src/docker.rs` (líneas 290, 306, 322, 343, 536-687)
- `src-tauri/src/websocket.rs` (línea 394)

**Problema**:
```rust
// docker.rs:290 - SIN VALIDACIÓN
let cmd = format!("{}; $D start {}", Self::docker_cmd_script(), container_id);

// Exploit posible:
let container_id = "abc; rm -rf /; #";
// Ejecuta: docker start abc; rm -rf /; #
```

**Impacto**: 
- Ejecución de comandos arbitrarios en el sistema
- Acceso root si Docker corre con privilegios
- Compromiso total del servidor SSH

**Solución**:
```rust
// Agregar validación estricta
fn validate_container_id(id: &str) -> Result<(), String> {
    if !id.chars().all(|c| c.is_alphanumeric() || c == '-' || c == '_') {
        return Err("Invalid container ID format".into());
    }
    if id.len() > 64 {
        return Err("Container ID too long".into());
    }
    Ok(())
}

// Usar antes de cualquier comando
validate_container_id(&container_id)?;
```

**Archivos a modificar**:
- `src-tauri/src/docker.rs` - Añadir validación en todos los métodos
- `src-tauri/src/websocket.rs:394` - Validar container_id antes de uso

---

### 2. 🔴 **Encriptación Débil (XOR)** - CRÍTICO

**Archivo**: `src-tauri/src/security.rs` (líneas 318-352)

**Problema**:
```rust
// security.rs:318-328 - ENCRIPTACIÓN INSEGURA
fn simple_encrypt(&self, data: &str) -> String {
    let key = self.derive_key();
    let encrypted: Vec<u8> = data.bytes()
        .zip(key.iter().cycle())
        .map(|(b, k)| b ^ k)  // ❌ XOR es trivialmente rompible
        .collect();
    STANDARD.encode(&encrypted)
}
```

**Impacto**:
- Credenciales SSH "encriptadas" son fácilmente descifrables
- Un atacante con acceso al filesystem puede obtener todas las contraseñas
- La "seguridad" de Stronghold es ilusoria

**Solución**:
```rust
// Usar el módulo crypto.rs existente que tiene AES-256-GCM
use crate::crypto::{encrypt_credential, decrypt_credential};

// Reemplazar simple_encrypt() y simple_decrypt()
fn encrypt_field(&self, data: &str) -> Result<String, String> {
    encrypt_credential(data)
}

fn decrypt_field(&self, encrypted: &str) -> Result<String, String> {
    decrypt_credential(encrypted)
}
```

**Archivos a modificar**:
- `src-tauri/src/security.rs` - Reemplazar métodos de encriptación
- Eliminar `derive_key()` y lógica de XOR

---

### 3. 🔴 **Encryption Key en localStorage** - CRÍTICO

**Archivo**: `src/utils/encryption.js` (línea 48)

**Problema**:
```javascript
// encryption.js:48 - ALMACENAMIENTO INSEGURO
export async function getEncryptionKey() {
  const stored = localStorage.getItem(KEY_STORAGE) // ❌ localStorage no es seguro
  // ...
}
```

**Impacto**:
- Extensiones de navegador pueden acceder a localStorage
- XSS puede robar la clave de encriptación
- Malware con acceso al perfil del usuario obtiene todas las credenciales

**Solución**:
```javascript
// Mover a Tauri Secure Storage
import { invoke } from '@tauri-apps/api/core'

export async function getEncryptionKey() {
  try {
    // Usar Stronghold a través de Tauri
    let stored = await invoke('get_encryption_key')
    
    if (stored) {
      return crypto.subtle.importKey(
        'raw', 
        base64ToBytes(stored), 
        'AES-GCM', 
        true, 
        ['encrypt', 'decrypt']
      )
    }
    
    // Generar y guardar nueva clave
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 }, 
      true, 
      ['encrypt', 'decrypt']
    )
    const raw = new Uint8Array(await crypto.subtle.exportKey('raw', key))
    await invoke('save_encryption_key', { key: bytesToBase64(raw) })
    return key
  } catch (error) {
    throw new Error('Failed to manage encryption key: ' + error.message)
  }
}
```

**Archivos a modificar**:
- `src/utils/encryption.js` - Reescribir storage
- `src-tauri/src/lib.rs` - Añadir commands para get/save encryption key

---

## Problemas de Alto Impacto

### 4. 🟠 **Sin Error Boundaries** - ALTO

**Archivos**: `src/components/App/App.jsx`, `src/pages/MonitoringPage/MonitoringPage.jsx`

**Problema**:
- Cualquier error no manejado crash la app completa
- Usuario ve pantalla blanca sin información
- No hay recovery mechanism

**Solución**:
```javascript
// Crear ErrorBoundary.jsx
import React from 'react'

class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null, errorInfo: null }
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  
  componentDidCatch(error, errorInfo) {
    console.error('Application crashed:', error, errorInfo)
    // Opcional: Enviar a servicio de error tracking
  }
  
  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    window.location.reload()
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="error-screen">
          <div className="error-content">
            <h1>⚠️ Algo salió mal</h1>
            <p>La aplicación encontró un error inesperado</p>
            <details>
              <summary>Detalles técnicos</summary>
              <pre>{this.state.error?.toString()}</pre>
            </details>
            <button onClick={this.handleReset}>Reiniciar Aplicación</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// En App.jsx
function App() {
  return (
    <ErrorBoundary>
      <SettingsProvider>
        <NotificationProvider>
          <AppContent />
        </NotificationProvider>
      </SettingsProvider>
    </ErrorBoundary>
  )
}
```

---

### 5. 🟠 **Memory Leak - SSH Connections** - ALTO

**Archivo**: `src-tauri/src/ssh.rs` (líneas 143, 152-159)

**Problema**:
```rust
// ssh.rs:152 - No verifica cierre real de sesión
pub fn disconnect(&self, connection_id: &str) -> Result<(), SshError> {
    let mut connections = self.connections.lock();
    if connections.remove(connection_id).is_some() {
        Ok(())  // ❌ Solo remueve del HashMap, no cierra sesión SSH
    } else {
        Err(SshError::NotFound(connection_id.to_string()))
    }
}
```

**Impacto**:
- Conexiones SSH zombie consumen file descriptors
- Eventual agotamiento de recursos (FD limit reached)
- Servidor SSH puede bloquear por demasiadas conexiones

**Solución**:
```rust
// ssh.rs - Mejorar disconnect()
pub fn disconnect(&self, connection_id: &str) -> Result<(), SshError> {
    let mut connections = self.connections.lock();
    
    if let Some(connection) = connections.remove(connection_id) {
        // Cerrar explícitamente la sesión SSH
        if let Err(e) = connection.session.disconnect(None, "User disconnected", None) {
            eprintln!("Warning: Failed to cleanly disconnect SSH session: {}", e);
        }
        Ok(())
    } else {
        Err(SshError::NotFound(connection_id.to_string()))
    }
}

// Añadir timeout automático
pub fn start_connection_reaper(&self) {
    let connections = Arc::clone(&self.connections);
    std::thread::spawn(move || {
        loop {
            std::thread::sleep(Duration::from_secs(300)); // Cada 5 minutos
            
            let mut conns = connections.lock();
            let now = Instant::now();
            
            conns.retain(|id, conn| {
                if now.duration_since(conn.last_used) > Duration::from_secs(1800) {
                    eprintln!("Closing idle SSH connection: {}", id);
                    let _ = conn.session.disconnect(None, "Timeout", None);
                    false // Remover
                } else {
                    true // Mantener
                }
            });
        }
    });
}
```

---

### 6. 🟠 **Memory Leak - WebSocket Tasks** - ALTO

**Archivo**: `src-tauri/src/websocket.rs` (líneas 266-429)

**Problema**:
```rust
// websocket.rs:266 - Task spawned sin cleanup explícito
tokio::spawn(async move {
    loop {
        // Stream de métricas infinito
        // ❌ No hay límite de tiempo ni cleanup
        tokio::time::sleep(Duration::from_millis(interval_ms)).await;
    }
});
```

**Impacto**:
- Cada subscripción crea un task que corre indefinidamente
- Si el cliente no unsubscribe correctamente, tasks acumulan
- Eventual agotamiento de threads/memoria

**Solución**:
```rust
// websocket.rs - Track tasks y añadir timeout
use tokio::task::JoinHandle;
use std::collections::HashMap;

struct WebSocketServer {
    // ... campos existentes
    active_tasks: Arc<Mutex<HashMap<String, JoinHandle<()>>>>,
}

async fn handle_subscribe(&self, ws_id: String, data: Value) {
    // ... código existente ...
    
    let task_id = format!("{}:{}", ws_id, connection_id);
    let handle = tokio::spawn(async move {
        let mut iterations = 0;
        const MAX_ITERATIONS: u32 = 7200; // 2 horas a 1s interval = 7200
        
        loop {
            if iterations >= MAX_ITERATIONS {
                println!("Task timeout reached, stopping: {}", task_id);
                break;
            }
            
            // ... lógica existente ...
            iterations += 1;
            tokio::time::sleep(Duration::from_millis(interval_ms)).await;
        }
    });
    
    // Guardar handle para cleanup
    self.active_tasks.lock().unwrap().insert(task_id, handle);
}

async fn handle_unsubscribe(&self, ws_id: String, data: Value) {
    // ... código existente ...
    
    // Cancelar task
    let task_id = format!("{}:{}", ws_id, connection_id);
    if let Some(handle) = self.active_tasks.lock().unwrap().remove(&task_id) {
        handle.abort();
    }
}
```

---

### 7. 🟠 **Unbounded Data Growth** - ALTO

**Archivos**: 
- `src/stores/metricsStore.js` - Métricas acumulan sin límite
- `src/stores/alertsStore.js` - Historial de alertas crece indefinidamente

**Problema**:
```javascript
// metricsStore.js - Sin límite de retención
setMetrics: (connectionId, metrics) => {
    set((state) => ({
        metrics: {
            ...state.metrics,
            [connectionId]: metrics  // ❌ Nunca se limpia
        }
    }))
}

// alertsStore.js:236 - Límite de 50 pero sin expiry por tiempo
addToHistory: (alert) => set((state) => {
    const newHistory = [alert, ...state.alertHistory].slice(0, 50)
    return { alertHistory: newHistory }
})
```

**Impacto**:
- Memoria crece indefinidamente
- Eventual slowdown por GC pressure
- localStorage puede exceder límites

**Solución**:
```javascript
// metricsStore.js - Añadir cleanup
const MAX_METRICS_AGE = 10 * 60 * 1000; // 10 minutos

setMetrics: (connectionId, metrics) => {
    set((state) => {
        const now = Date.now();
        
        // Limpiar métricas viejas
        const cleanedMetrics = Object.fromEntries(
            Object.entries(state.metrics).filter(([_, data]) => {
                return data.timestamp && (now - data.timestamp) < MAX_METRICS_AGE;
            })
        );
        
        return {
            metrics: {
                ...cleanedMetrics,
                [connectionId]: {
                    ...metrics,
                    timestamp: now
                }
            }
        };
    });
}

// alertsStore.js - Añadir expiry por tiempo
const MAX_ALERT_AGE = 24 * 60 * 60 * 1000; // 24 horas

addToHistory: (alert) => set((state) => {
    const now = Date.now();
    const alertWithTimestamp = { ...alert, timestamp: now };
    
    // Filtrar por tiempo Y límite de cantidad
    const recentAlerts = [alertWithTimestamp, ...state.alertHistory]
        .filter(a => (now - a.timestamp) < MAX_ALERT_AGE)
        .slice(0, 50);
    
    return { alertHistory: recentAlerts };
})
```

---

### 8. 🟠 **No Request Timeout & Retry** - ALTO

**Archivo**: `src/hooks/useRealTimeData.js`

**Problema**:
- Requests SSH pueden colgar indefinidamente
- No hay timeout configurado
- No hay retry logic en failures
- No hay circuit breaker

**Solución**:
```javascript
// useRealTimeData.js - Añadir timeout wrapper
const REQUEST_TIMEOUT = 10000; // 10 segundos
const MAX_RETRIES = 3;

const withTimeoutAndRetry = async (fn, retries = MAX_RETRIES) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const result = await Promise.race([
                fn(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Request timeout')), REQUEST_TIMEOUT)
                )
            ]);
            return result;
        } catch (error) {
            if (attempt === retries) {
                throw error;
            }
            
            // Exponential backoff
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
};

// Usar en fetchMetrics
const fetchMetrics = useCallback(async () => {
    try {
        const result = await withTimeoutAndRetry(() => 
            getRealTimeMetrics(connection.id)
        );
        // ... resto del código
    } catch (error) {
        console.error('Failed after retries:', error);
        // Marcar conexión como unhealthy
    }
}, [connection]);
```

---

## Problemas de Medio Impacto

### 9. 🟡 **Expensive Re-renders** - MEDIO

**Archivo**: `src/pages/SelectionPage/SelectionPage.jsx` (líneas 71-89)

**Problema**:
```javascript
// SelectionPage.jsx:71 - Recalcula en cada render
const filteredConnections = connections.filter(...)
```

**Solución**:
```javascript
const filteredConnections = useMemo(() => {
    let filtered = connections;
    
    if (selectedGroup) {
        filtered = filtered.filter(item => 
            (item.group || 'default') === selectedGroup
        );
    }
    
    if (search.trim()) {
        const term = search.trim().toLowerCase();
        filtered = filtered.filter(item =>
            [item.name, item.host, item.username, item.notes, String(item.port || 22)]
                .filter(Boolean)
                .some(value => value.toLowerCase().includes(term))
        );
    }
    
    return filtered;
}, [connections, search, selectedGroup]);
```

---

### 10. 🟡 **Console.log en Producción** - MEDIO

**Archivos**: 87 ocurrencias en toda la app

**Problema**:
- Posible fuga de información sensible
- Impacto en performance (console.log es lento)
- Logs no útiles en producción

**Solución**:
```javascript
// Crear logger utility
// src/utils/logger.js
const isDevelopment = import.meta.env.MODE === 'development';

export const logger = {
    debug: (...args) => isDevelopment && console.log('[DEBUG]', ...args),
    info: (...args) => isDevelopment && console.info('[INFO]', ...args),
    warn: (...args) => console.warn('[WARN]', ...args),
    error: (...args) => console.error('[ERROR]', ...args),
};

// Reemplazar todos los console.log con logger.debug()
```

**Script de búsqueda y reemplazo**:
```bash
# Encontrar todos los console.log
grep -r "console.log" src/ --exclude-dir=node_modules

# Reemplazar automáticamente (revisar manualmente después)
find src -name "*.js" -o -name "*.jsx" | xargs sed -i 's/console\.log/logger.debug/g'
```

---

### 11. 🟡 **Dead Code** - MEDIO

**Archivos a Eliminar**:
1. `src/hooks/useWebSocket.js` (157 líneas) - No usado en ningún lado
2. `src/hooks/useRealTimeData.js` (líneas 320-497) - Hooks deprecated pero exportados
3. `src-tauri/src/security.rs:424` - `sanitize_command_arg()` nunca usado

**Impacto**:
- Bundle size innecesariamente grande
- Confusión en mantenimiento
- Posibles bugs en código no mantenido

**Acción**:
```bash
# Verificar que realmente no se usa
grep -r "useWebSocket" src/ --exclude-dir=node_modules
grep -r "useRealTimeMetrics" src/ --exclude-dir=node_modules
grep -r "useRealTimeContainers" src/ --exclude-dir=node_modules

# Si no hay matches, eliminar
rm src/hooks/useWebSocket.js

# En useRealTimeData.js, eliminar exports deprecated
```

---

### 12. 🟡 **Código Duplicado** - MEDIO

**1. Connection Normalization** (49 líneas duplicadas):
- `src/hooks/useConnections.js` líneas 30-56
- `src/stores/connectionsStore.js` líneas 28-49

**Solución**:
```javascript
// src/utils/connectionUtils.js (NUEVO)
export function normalizeConnection(conn) {
    return {
        id: conn.id || generateUniqueId(),
        name: conn.name?.trim() || 'Unnamed',
        host: conn.host?.trim() || '',
        port: conn.port || 22,
        username: conn.username?.trim() || '',
        authType: conn.authType || 'password',
        password: conn.password || null,
        keyPath: conn.keyPath || null,
        notes: conn.notes || '',
        isFavorite: Boolean(conn.isFavorite),
        isDefault: Boolean(conn.isDefault),
        group: conn.group || 'default',
        tags: Array.isArray(conn.tags) ? conn.tags : [],
        status: conn.status || 'unknown',
        createdAt: conn.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
}

// Importar en ambos archivos
import { normalizeConnection } from '../utils/connectionUtils.js';
```

---

## Features Faltantes

### Monitoring
- [ ] **Metric History & Graphs** - Gráficos de tendencia temporal
- [ ] **Metric Comparison** - Comparar múltiples servidores
- [ ] **Custom Dashboards** - Layout de widgets personalizable
- [ ] **Metric Export** - CSV/JSON export
- [ ] **Baseline Detection** - Detección de anomalías
- [ ] **Scheduled Reports** - Reportes automáticos por email

### Alerts
- [ ] **Alert Snooze** - Silenciar temporalmente
- [ ] **Alert Routing** - Email/Webhook/Slack
- [ ] **Alert Escalation** - Progresión de severidad
- [ ] **Alert Correlation** - Agrupar alertas relacionadas
- [ ] **Alert Templates** - Configuraciones guardadas

### Docker
- [ ] **Docker Compose UI** - Gestión visual de compose files
- [ ] **Container Stats** - Uso de recursos por contenedor
- [ ] **Image Management** - Pull/build images
- [ ] **Volume Management** - CRUD de volúmenes
- [ ] **Network Management** - CRUD de redes

### Connections
- [ ] **Connection Groups UI** - Folders/categorías visibles
- [ ] **Connection Tags** - Etiquetas y filtros
- [ ] **Bulk Operations** - Multi-select, multi-delete
- [ ] **Search History** - Búsquedas recientes
- [ ] **Connection Templates** - Plantillas reutilizables
- [ ] **Quick Connect** - Recent/pinned connections
- [ ] **Health Checks** - Test connectivity automático

### Terminal
- [ ] **Terminal Tabs** - Múltiples terminales simultáneas
- [ ] **Session Logs** - Guardar historial de sesiones
- [ ] **Command Snippets** - Biblioteca de comandos
- [ ] **SFTP Integration** - Transferencia de archivos

### UX
- [ ] **Loading States** - Skeleton screens
- [ ] **Empty States** - Mensajes útiles cuando no hay data
- [ ] **Onboarding** - Tour guiado para nuevos usuarios
- [ ] **Keyboard Shortcuts Help** - Modal con shortcuts
- [ ] **Dark Mode Improvements** - Más variantes de tema

---

## Plan de Acción Priorizado

### 🔴 **SPRINT 1 - Seguridad Crítica** (1-2 semanas)

#### Día 1-3: Command Injection
- [ ] Crear `src-tauri/src/validation.rs` con funciones de validación
- [ ] Añadir `validate_container_id()`, `validate_image_name()`, `validate_path()`
- [ ] Modificar `docker.rs` para usar validación en todos los comandos
- [ ] Modificar `websocket.rs:394` para validar container_id
- [ ] Tests unitarios para validaciones

#### Día 4-6: Fix Encriptación
- [ ] Reemplazar XOR encryption en `security.rs` con AES-256-GCM
- [ ] Migrar datos existentes del formato viejo al nuevo
- [ ] Añadir comando Tauri para encryption key storage
- [ ] Modificar `encryption.js` para usar Tauri Secure Storage
- [ ] Tests de migración

#### Día 7-10: Error Boundaries & Cleanup
- [ ] Crear `ErrorBoundary.jsx` component
- [ ] Integrar en `App.jsx` y páginas principales
- [ ] Añadir error tracking (opcional: Sentry)
- [ ] Implementar SSH connection cleanup con timeout
- [ ] Implementar WebSocket task management
- [ ] Tests de error handling

---

### 🟠 **SPRINT 2 - Performance & Stability** (1 semana)

#### Performance
- [ ] Añadir `useMemo` en SelectionPage filters
- [ ] Implementar request timeout & retry en useRealTimeData
- [ ] Añadir data retention limits en stores
- [ ] Implementar request deduplication

#### Code Quality
- [ ] Eliminar dead code (useWebSocket, deprecated hooks)
- [ ] Consolidar código duplicado (normalizeConnection)
- [ ] Crear logger utility y reemplazar console.log
- [ ] Añadir TypeScript o JSDoc types

---

### 🟡 **SPRINT 3 - Missing Features** (2-3 semanas)

#### High Priority Features
- [ ] Connection Groups UI
- [ ] Bulk Operations (multi-select)
- [ ] Alert Snooze
- [ ] Metric History (últimas 24h)
- [ ] Loading States & Skeletons

#### Medium Priority Features
- [ ] Docker Compose UI básico
- [ ] Terminal tabs
- [ ] Command snippets library
- [ ] Custom keyboard shortcuts

---

### 🔵 **SPRINT 4 - Polish & Advanced Features** (Ongoing)

- [ ] Accessibility audit completo
- [ ] Metric export (CSV/JSON)
- [ ] Alert routing (webhook/email)
- [ ] SFTP integration
- [ ] Advanced metric graphs
- [ ] Unit test coverage >80%

---

## Código de Ejemplo para Fixes

### Fix 1: Command Injection Prevention

```rust
// src-tauri/src/validation.rs (NUEVO ARCHIVO)
use regex::Regex;
use lazy_static::lazy_static;

lazy_static! {
    static ref CONTAINER_ID_REGEX: Regex = Regex::new(r"^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,63}$").unwrap();
    static ref IMAGE_NAME_REGEX: Regex = Regex::new(r"^[a-z0-9]+(?:[._-][a-z0-9]+)*(?:/[a-z0-9]+(?:[._-][a-z0-9]+)*)*(?::[a-zA-Z0-9_][a-zA-Z0-9._-]{0,127})?$").unwrap();
}

pub fn validate_container_id(id: &str) -> Result<(), String> {
    if id.is_empty() || id.len() > 64 {
        return Err("Invalid container ID length".into());
    }
    
    if !CONTAINER_ID_REGEX.is_match(id) {
        return Err("Invalid container ID format".into());
    }
    
    // Prohibir caracteres peligrosos
    if id.contains(&[';', '&', '|', '$', '`', '\\', '\n', '\r'][..]) {
        return Err("Container ID contains forbidden characters".into());
    }
    
    Ok(())
}

pub fn validate_image_name(name: &str) -> Result<(), String> {
    if name.is_empty() || name.len() > 255 {
        return Err("Invalid image name length".into());
    }
    
    if !IMAGE_NAME_REGEX.is_match(name) {
        return Err("Invalid image name format".into());
    }
    
    Ok(())
}

pub fn validate_path(path: &str) -> Result<(), String> {
    // Solo paths absolutos
    if !path.starts_with('/') {
        return Err("Path must be absolute".into());
    }
    
    // Prohibir path traversal
    if path.contains("..") {
        return Err("Path traversal not allowed".into());
    }
    
    // Prohibir caracteres peligrosos
    if path.contains(&[';', '&', '|', '$', '`', '\n', '\r'][..]) {
        return Err("Path contains forbidden characters".into());
    }
    
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_validate_container_id() {
        assert!(validate_container_id("my-container").is_ok());
        assert!(validate_container_id("container_123").is_ok());
        assert!(validate_container_id("abc; rm -rf /").is_err());
        assert!(validate_container_id("$(whoami)").is_err());
    }
    
    #[test]
    fn test_validate_path() {
        assert!(validate_path("/home/user/project").is_ok());
        assert!(validate_path("../etc/passwd").is_err());
        assert!(validate_path("/home; cat /etc/passwd").is_err());
    }
}
```

```rust
// src-tauri/src/docker.rs - Modificar métodos existentes
use crate::validation::{validate_container_id, validate_image_name, validate_path};

impl DockerManager {
    pub fn start_container(&self, connection_id: &str, container_id: &str) -> Result<DockerActionResult, String> {
        // ✅ AÑADIR VALIDACIÓN
        validate_container_id(container_id)?;
        
        // Resto del código existente...
        let cmd = format!("{}; $D start {}", Self::docker_cmd_script(), container_id);
        // ...
    }
    
    pub fn compose_up(&self, connection_id: &str, project_path: &str, detached: bool) -> Result<ComposeActionResult, String> {
        // ✅ AÑADIR VALIDACIÓN
        validate_path(project_path)?;
        
        // Resto del código existente...
    }
}
```

---

### Fix 2: Encryption Storage Migration

```rust
// src-tauri/src/lib.rs - Añadir commands
#[tauri::command]
async fn get_encryption_key(state: State<'_, AppState>) -> Result<String, String> {
    let storage = state.secure_storage.lock();
    if let Some(ref storage) = *storage {
        storage.get_encryption_key()
            .map_err(|e| e.to_string())
    } else {
        Err("Secure storage not initialized".into())
    }
}

#[tauri::command]
async fn save_encryption_key(
    state: State<'_, AppState>,
    key: String
) -> Result<(), String> {
    let storage = state.secure_storage.lock();
    if let Some(ref storage) = *storage {
        storage.save_encryption_key(&key)
            .map_err(|e| e.to_string())
    } else {
        Err("Secure storage not initialized".into())
    }
}
```

```rust
// src-tauri/src/security.rs - Añadir métodos
impl SecureStorage {
    const ENCRYPTION_KEY_ID: &'static str = "app_encryption_key";
    
    pub fn get_encryption_key(&self) -> Result<String, Box<dyn std::error::Error>> {
        let client = self.get_client()?;
        let store = client.get_store()?;
        
        if let Some(key_bytes) = store.get(Self::ENCRYPTION_KEY_ID.as_bytes())? {
            Ok(String::from_utf8(key_bytes.to_vec())?)
        } else {
            Err("Encryption key not found".into())
        }
    }
    
    pub fn save_encryption_key(&self, key: &str) -> Result<(), Box<dyn std::error::Error>> {
        let client = self.get_client()?;
        let mut store = client.get_store()?;
        
        store.insert(
            Self::ENCRYPTION_KEY_ID.as_bytes(),
            key.as_bytes(),
            None
        )?;
        
        Ok(())
    }
}
```

---

## Conclusión

La aplicación es **funcional y tiene buena arquitectura**, pero requiere **mejoras críticas de seguridad** antes de producción.

**Tiempo estimado para fixes críticos**: 2-3 semanas  
**Tiempo estimado para producción-ready**: 6-8 semanas

**Recomendación**: 
1. Implementar Sprint 1 INMEDIATAMENTE (seguridad)
2. Implementar Sprint 2 antes de release público
3. Sprint 3-4 como roadmap post-launch

---

**Documento generado**: 16 de Enero de 2026  
**Próxima revisión recomendada**: Después de Sprint 1
