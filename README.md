# PC Monitoring Dockers

Aplicacion de escritorio para monitorizar servidores Linux remotos via SSH. Muestra metricas del sistema en tiempo real (CPU, RAM, disco, red, temperaturas) y gestion de contenedores Docker.

## Caracteristicas

- **Conexiones SSH**: Gestiona multiples conexiones a servidores Linux con autenticacion por password o clave SSH
- **Metricas en tiempo real**: CPU, memoria, disco, red, carga del sistema, temperaturas
- **Metricas avanzadas**: CPU per-core, memoria detallada, disk I/O, red por interfaz, conexiones TCP, puertos abiertos, procesos
- **Gestion de Docker**: Lista contenedores, inicia/para/reinicia, visualiza logs y estadisticas
- **Terminal SSH integrada**: Ejecuta comandos remotos con historial y soporte para ventana externa
- **Sistema de alertas**: Configura umbrales para CPU, RAM, disco, temperatura, etc. con notificaciones nativas
- **Almacenamiento local**: Credenciales cifradas con Tauri Stronghold, historial de metricas en localStorage (24h)
- **Multiidioma**: Espanol e Ingles
- **Sin dependencias externas**: No requiere API REST ni base de datos externa

## Tecnologias

### Frontend
- React 19
- Vite 7
- Zustand (estado global)
- Chart.js (graficos)

### Desktop
- Tauri 2.9 (Rust)
- SSH2 (conexiones SSH)
- Tauri Stronghold (almacenamiento cifrado de credenciales)
- localStorage (historial de metricas - 24 horas)

## Requisitos

- Node.js 18+
- Rust 1.77+
- Tauri CLI

## Instalacion

```bash
# Clonar repositorio
git clone <repo-url>
cd pc-monitoring-dockers

# Instalar dependencias
npm install

# Desarrollo
npm run tauri dev

# Build produccion
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

## Licencia

MIT
