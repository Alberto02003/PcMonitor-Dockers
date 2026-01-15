/**
 * Docker Utilities
 * 
 * Utilidades para trabajar con contenedores Docker
 */

/**
 * Genera URLs accesibles desde los port mappings
 * @param {Array} portMappings - Array de port mappings del contenedor
 * @param {string} serverHost - Host del servidor SSH
 * @returns {Array} Array de URLs accesibles con metadata
 */
export function generateAccessUrls(portMappings, serverHost) {
  if (!portMappings || portMappings.length === 0) {
    return []
  }

  const urls = []

  for (const mapping of portMappings) {
    const { hostPort, containerPort, protocol } = mapping

    // Solo generar URLs para HTTP/HTTPS comunes
    const isWebPort = isCommonWebPort(containerPort)
    const useHttps = containerPort === 443 || hostPort === 443

    // Determinar el host a usar
    const host = serverHost || 'localhost'

    // Generar URL
    const scheme = useHttps ? 'https' : 'http'
    const displayPort = shouldDisplayPort(scheme, hostPort) ? `:${hostPort}` : ''
    const url = `${scheme}://${host}${displayPort}`

    urls.push({
      url,
      hostPort,
      containerPort,
      protocol,
      scheme,
      isWebPort,
      label: generateLabel(containerPort, hostPort, protocol),
    })
  }

  return urls
}

/**
 * Verifica si un puerto es comúnmente usado para web
 * @param {number} port - Número de puerto
 * @returns {boolean}
 */
function isCommonWebPort(port) {
  const webPorts = [
    80, 443, // HTTP/HTTPS estándar
    3000, 3001, 3002, 3003, // Node.js común
    4200, 4201, // Angular
    5000, 5001, 5173, // Vite, Flask
    8000, 8001, 8080, 8081, 8443, 8888, // Varios HTTP
    9000, 9090, // Varios
  ]
  return webPorts.includes(port)
}

/**
 * Determina si debe mostrarse el puerto en la URL
 * @param {string} scheme - http o https
 * @param {number} port - Número de puerto
 * @returns {boolean}
 */
function shouldDisplayPort(scheme, port) {
  if (scheme === 'http' && port === 80) return false
  if (scheme === 'https' && port === 443) return false
  return true
}

/**
 * Genera una etiqueta descriptiva para el puerto
 * @param {number} containerPort - Puerto del contenedor
 * @param {number} hostPort - Puerto del host
 * @param {string} protocol - Protocolo (tcp/udp)
 * @returns {string}
 */
function generateLabel(containerPort, hostPort, protocol) {
  const portLabels = {
    80: 'HTTP',
    443: 'HTTPS',
    3000: 'Web',
    3306: 'MySQL',
    5432: 'PostgreSQL',
    6379: 'Redis',
    8080: 'HTTP Alt',
    8443: 'HTTPS Alt',
    9000: 'Web',
    27017: 'MongoDB',
  }

  const label = portLabels[containerPort] || `Port ${containerPort}`

  if (hostPort !== containerPort) {
    return `${label} (${hostPort})`
  }

  return label
}

/**
 * Formatea la información de puertos para mostrar
 * @param {Array} portMappings - Port mappings
 * @returns {string}
 */
export function formatPortsDisplay(portMappings) {
  if (!portMappings || portMappings.length === 0) {
    return 'Sin puertos expuestos'
  }

  return portMappings
    .map((p) => {
      if (p.hostPort === p.containerPort) {
        return `${p.hostPort}/${p.protocol}`
      }
      return `${p.hostPort}→${p.containerPort}/${p.protocol}`
    })
    .join(', ')
}

/**
 * Abre una URL en el navegador externo
 * @param {string} url - URL a abrir
 */
export async function openInBrowser(url) {
  // Verificar si estamos en Tauri
  const isTauri = window.__TAURI_INTERNALS__ || window.__TAURI__
  
  if (isTauri) {
    try {
      // Usar el plugin de shell de Tauri para abrir en navegador externo
      const { open } = await import('@tauri-apps/plugin-shell')
      await open(url)
      console.log('URL opened in external browser:', url)
      return
    } catch (error) {
      console.error('Error opening URL with Tauri shell:', error)
      // Fallback si el plugin falla
    }
  }
  
  // En desarrollo o si Tauri falla, usar window.open
  try {
    const opened = window.open(url, '_blank', 'noopener,noreferrer')
    
    if (!opened) {
      console.warn('Could not open URL, popup might be blocked')
    }
  } catch (error) {
    console.error('Error opening URL with window.open:', error)
  }
}

/**
 * Copia texto al portapapeles
 * @param {string} text - Texto a copiar
 * @returns {Promise<boolean>}
 */
export async function copyToClipboard(text) {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text)
      return true
    } else {
      // Fallback para navegadores antiguos
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      const success = document.execCommand('copy')
      document.body.removeChild(textarea)
      return success
    }
  } catch (error) {
    console.error('Error copying to clipboard:', error)
    return false
  }
}
