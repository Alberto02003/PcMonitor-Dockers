# PC Monitoring Dockers - Website

Página web estática para la descarga y descripción de la aplicación **PC Monitoring Dockers**.

## 📁 Estructura

```
web/
├── index.html          # Página principal
├── styles.css          # Estilos con la paleta de colores de la app
├── script.js           # Lógica para obtener última versión y descargar
├── assets/
│   └── logo.png        # Logo de la aplicación
└── README.md           # Este archivo
```

## 🎨 Características

- **Diseño Responsive**: Se adapta a móviles, tablets y escritorio
- **Paleta de Colores**: Usa los mismos colores que la aplicación desktop
- **Descarga Automática**: Obtiene la última versión desde GitHub Releases API
- **Animaciones Suaves**: Efectos visuales atractivos y profesionales
- **SEO Optimizado**: Meta tags para búsquedas y redes sociales

## 🚀 Despliegue

### Opción 1: GitHub Pages

1. Activar GitHub Pages en la configuración del repositorio
2. Seleccionar la carpeta `/web` como fuente
3. La página estará disponible en: `https://alberto02003.github.io/PcMonitor-Dockers/`

### Opción 2: Netlify

1. Conectar el repositorio con Netlify
2. Configurar el directorio de publicación como `web`
3. Desplegar automáticamente

### Opción 3: Vercel

1. Importar el proyecto en Vercel
2. Configurar el directorio raíz como `web`
3. Desplegar

### Opción 4: Servidor Local

```bash
# Desde la carpeta web
npx serve
# O con Python
python -m http.server 8000
```

## 📝 Personalización

### Cambiar Información

Edita `index.html` para actualizar:
- Título y descripción
- Características
- Tecnologías
- Enlaces

### Cambiar Estilos

Edita `styles.css` para modificar:
- Colores (variables CSS en `:root`)
- Animaciones
- Diseño responsive

### API de GitHub

El script obtiene automáticamente la última versión desde:
```
https://api.github.com/repos/Alberto02003/PcMonitor-Dockers/releases/latest
```

Si cambias el nombre del repositorio, actualiza la variable `GITHUB_REPO` en `script.js`.

## 🔧 Tecnologías

- HTML5 puro
- CSS3 con variables y animaciones
- JavaScript vanilla (sin frameworks)
- GitHub Releases API

## 📄 Licencia

Mismo que el proyecto principal.
