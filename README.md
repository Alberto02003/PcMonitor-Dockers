# PC Monitoring Dockers

Aplicacion de escritorio para monitorizar servidores Linux remotos via SSH. Muestra metricas del sistema en tiempo real (CPU, RAM, disco, red, temperaturas) y gestion de contenedores Docker.

## Caracteristicas

- **Conexiones SSH**: Gestiona multiples conexiones a servidores Linux con autenticacion por password o clave SSH
- **Metricas en tiempo real**: CPU, memoria, disco, red, carga del sistema, temperaturas
- **Gestion de Docker**: Lista contenedores, inicia/para/reinicia, visualiza logs y estadisticas
- **Terminal SSH integrada**: Ejecuta comandos remotos con historial y soporte para ventana externa
- **Sistema de alertas**: Configura umbrales para CPU, RAM, disco, temperatura, etc. con notificaciones nativas
- **Informes PDF**: Genera reportes del estado del servidor
- **Credenciales cifradas**: Las passwords y rutas de claves SSH se cifran con AES-256-GCM
- **Multiidioma**: Espanol e Ingles

## Tecnologias

### Frontend
- React 19
- Vite 7
- Zustand (estado global)
- Chart.js (graficos)

### Desktop
- Tauri 2.9 (Rust)
- SSH2 (conexiones SSH)
- AES-GCM (cifrado de credenciales)
- PrintPDF (generacion de informes)

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
    lib.rs          # Comandos Tauri
    ssh.rs          # Conexiones SSH
    metrics.rs      # Recoleccion de metricas
    docker.rs       # Gestion de Docker
    crypto.rs       # Cifrado AES-256-GCM
    reports/        # Generacion de PDF
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
