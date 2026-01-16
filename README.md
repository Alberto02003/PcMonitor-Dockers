# PC Monitoring Dockers

Aplicacion de escritorio para monitorizar servidores Linux remotos via SSH. Muestra metricas del sistema en tiempo real (CPU, RAM, disco, red, temperaturas) y gestion de contenedores Docker.

## Caracteristicas

- **Conexiones SSH**: Gestiona multiples conexiones a servidores Linux con autenticacion por password o clave SSH
- **Metricas en tiempo real**: CPU, memoria, disco, red, carga del sistema, temperaturas
- **Metricas avanzadas**: CPU per-core, memoria detallada, disk I/O, red por interfaz, conexiones TCP, puertos abiertos, procesos
- **Gestion de Docker**: Lista contenedores, inicia/para/reinicia, visualiza logs y estadisticas
- **Terminal SSH integrada**: Ejecuta comandos remotos con historial y soporte para ventana externa
- **Sistema de alertas**: Configura umbrales para CPU, RAM, disco, temperatura, etc. con notificaciones nativas
- **Almacenamiento cifrado**: Credenciales cifradas con Tauri Stronghold (AES-256-GCM)
- **Multiidioma**: Español e Inglés
- **Sin dependencias externas**: No requiere API REST ni base de datos externa
- **Solo visualización**: La app muestra datos en tiempo real sin almacenarlos (excepto configuración y credenciales)

## Tecnologias

### Frontend
- React 19
- Vite 7
- Zustand (estado global)
- Chart.js (graficos)

### Desktop
- Tauri 2.9 (Rust)
- SSH2 (conexiones SSH)
- Tauri Stronghold (almacenamiento cifrado de credenciales AES-256-GCM)
- localStorage (configuración de alertas y ajustes de la app)

## Requisitos

- Node.js 18+
- Rust 1.77+
- Tauri CLI

## Instalación para Usuarios

### Descarga la Aplicación

Descarga la última versión desde [Releases](https://github.com/Alberto02003/PcMonitor-Dockers/releases/latest):

- **Recomendado**: `PC.Monitoring.Dockers_X.X.X_x64-setup.exe` (Instalador NSIS)
- **Alternativo**: `PC.Monitoring.Dockers_X.X.X_x64_en-US.msi` (Instalador MSI)

### Instalación en Windows

Cuando ejecutes el instalador, Windows SmartScreen puede mostrar un mensaje de protección porque la aplicación no tiene un certificado de firma de código (requiere pago anual de ~$300).

**Para instalar de forma segura:**

1. Click derecho en el archivo descargado → **Propiedades**
2. En la pestaña **General**, marca **"Desbloquear"** → **Aplicar**
3. Ejecuta el instalador
4. Si aparece "Windows protegió tu PC":
   - Click en **"Más información"**
   - Click en **"Ejecutar de todas formas"**

La aplicación es completamente segura y de código abierto. Puedes verificar el código fuente en este repositorio.

### Actualizaciones Automáticas

Una vez instalada, la aplicación verificará automáticamente nuevas versiones cada 6 horas y te notificará cuando haya actualizaciones disponibles.

---

## Instalación para Desarrolladores

```bash
# Clonar repositorio
git clone https://github.com/Alberto02003/PcMonitor-Dockers.git
cd PcMonitor-Dockers

# Instalar dependencias
npm install

# Desarrollo
npm run tauri dev

# Build producción
npm run tauri build
```

## Estructura del proyecto

```
src/
  components/       # Componentes reutilizables
  pages/
    SelectionPage/  # Gestion de conexiones
    MonitoringPage/ # Dashboard de monitorizacion
    TerminalWindow/ # Ventana externa de terminal
  hooks/            # Custom hooks (useTranslation, useRealTimeData, etc.)
  stores/           # Zustand stores
  services/         # API Tauri
  i18n/             # Traducciones (es.json, en.json)

src-tauri/
  src/
    lib.rs              # Comandos Tauri
    ssh.rs              # Conexiones SSH
    metrics.rs          # Recoleccion de metricas basicas
    metrics_advanced.rs # Recoleccion de metricas avanzadas
    docker.rs           # Gestion de Docker
    security.rs         # Tauri Stronghold (cifrado)
```

## Scripts

```bash
npm run dev          # Servidor desarrollo Vite
npm run build        # Build frontend
npm run tauri dev    # Desarrollo con Tauri
npm run tauri build  # Build aplicacion
npm run test         # Tests con Vitest
npm run lint         # ESLint
```

## Arquitectura de Datos

### ✅ **Qué SE almacena:**
- **Credenciales SSH**: Cifradas con Tauri Stronghold (AES-256-GCM)
- **Configuración de conexiones**: Nombres, hosts, puertos, usuarios
- **Alertas configuradas**: Umbrales de CPU, RAM, disco, temperatura
- **Ajustes de la aplicación**: Idioma, tema, preferencias de notificaciones

### ❌ **Qué NO se almacena:**
- **Métricas del sistema**: Solo se muestran en tiempo real, no se guardan
- **Historial de rendimiento**: No hay base de datos de métricas históricas
- **Logs de Docker**: Solo visualización en tiempo real
- **Estadísticas a largo plazo**: La app es solo para monitoreo en vivo

### 🔒 **Seguridad:**
- Credenciales cifradas con AES-256-GCM usando Tauri Stronghold
- Clave de cifrado generada automáticamente y almacenada de forma segura
- Conexiones SSH directas sin proxy ni servidores intermediarios
- Sin telemetría ni envío de datos a terceros

## Notas de Desarrollo

### Código Eliminado (No Planificado)
Las siguientes funcionalidades fueron consideradas pero **NO se implementarán**:

- ❌ **Backend MySQL**: La app no guardará métricas en base de datos
- ❌ **WebSocket para streaming**: Se usa polling directo vía SSH
- ❌ **ChartWidget / Métricas históricas**: Solo visualización en tiempo real
- ❌ **Exportación de datos**: No hay datos que exportar

### Roadmap Futuro
- ✅ Monitoreo en tiempo real (implementado)
- ✅ Gestión de Docker (implementado)
- ✅ Sistema de alertas (implementado)
- ✅ Terminal SSH integrada (implementado)
- 🔄 Docker Compose management (en progreso)
- 📋 Mejoras de UI/UX

## Licencia

MIT
