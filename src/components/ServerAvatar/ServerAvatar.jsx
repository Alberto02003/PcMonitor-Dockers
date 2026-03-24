/**
 * ServerAvatar - Avatar visual para servidores
 * Muestra iniciales, iconos o colores segun el servidor
 */

import { useMemo } from 'react'
import './ServerAvatar.css'

/**
 * Genera un color consistente basado en un string
 * @param {string} str - String para generar color
 * @returns {string} Color HSL
 */
function stringToColor(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash % 360)
  return `hsl(${hue}, 65%, 45%)`
}

/**
 * Obtiene las iniciales de un nombre
 * @param {string} name - Nombre del servidor
 * @returns {string} Iniciales (max 2 caracteres)
 */
function getInitials(name) {
  if (!name) return '?'
  
  // Si es una IP, usar primeros digitos
  if (/^\d+\.\d+\.\d+\.\d+$/.test(name)) {
    const parts = name.split('.')
    return parts[0].slice(0, 2)
  }
  
  // Si tiene espacios, tomar primera letra de cada palabra
  const words = name.trim().split(/[\s-_]+/)
  if (words.length > 1) {
    return (words[0][0] + words[1][0]).toUpperCase()
  }
  
  // Si no, tomar primeras 2 letras
  return name.slice(0, 2).toUpperCase()
}

/**
 * @param {Object} props
 * @param {string} props.name - Nombre del servidor
 * @param {string} props.host - Host/IP del servidor
 * @param {string} props.size - Tamano: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
 * @param {string} props.status - Estado: 'online' | 'offline' | 'connecting' | 'error'
 * @param {string} props.icon - Icono personalizado (emoji o caracter)
 * @param {string} props.color - Color personalizado
 * @param {boolean} props.showStatus - Mostrar indicador de estado
 * @param {string} props.className - Clases adicionales
 */
function ServerAvatar({
  name = '',
  host = '',
  size = 'md',
  status = null,
  icon = null,
  color = null,
  showStatus = false,
  className = '',
}) {
  // Generar color basado en nombre o host
  const backgroundColor = useMemo(() => {
    if (color) return color
    return stringToColor(name || host || 'default')
  }, [name, host, color])

  // Obtener iniciales o usar icono
  const content = useMemo(() => {
    if (icon) return icon
    return getInitials(name || host)
  }, [name, host, icon])

  const statusClass = status ? `server-avatar--${status}` : ''

  return (
    <div 
      className={`server-avatar server-avatar--${size} ${statusClass} ${className}`}
      style={{ backgroundColor }}
      title={name || host}
    >
      <span className="server-avatar__content">
        {content}
      </span>
      
      {showStatus && status && (
        <span className={`server-avatar__status server-avatar__status--${status}`} />
      )}
    </div>
  )
}

/**
 * Grupo de avatares apilados
 */
function ServerAvatarGroup({
  children,
  max = 4,
  size = 'sm',
  className = '',
}) {
  const childArray = Array.isArray(children) ? children : [children]
  const visible = childArray.slice(0, max)
  const remaining = childArray.length - max

  return (
    <div className={`server-avatar-group server-avatar-group--${size} ${className}`}>
      {visible}
      {remaining > 0 && (
        <div className={`server-avatar server-avatar--${size} server-avatar--more`}>
          <span className="server-avatar__content">+{remaining}</span>
        </div>
      )}
    </div>
  )
}

/**
 * Avatar con informacion adicional
 */
function ServerAvatarWithInfo({
  name = '',
  host = '',
  subtitle = '',
  size = 'md',
  status = null,
  showStatus = true,
  className = '',
  onClick = null,
}) {
  return (
    <div 
      className={`server-avatar-info ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <ServerAvatar 
        name={name}
        host={host}
        size={size}
        status={status}
        showStatus={showStatus}
      />
      <div className="server-avatar-info__text">
        <span className="server-avatar-info__name">{name || host}</span>
        {subtitle && (
          <span className="server-avatar-info__subtitle">{subtitle}</span>
        )}
      </div>
    </div>
  )
}

export default ServerAvatar
// eslint-disable-next-line react-refresh/only-export-components
export { ServerAvatarGroup, ServerAvatarWithInfo, stringToColor, getInitials }
