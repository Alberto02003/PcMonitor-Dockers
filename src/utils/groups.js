/**
 * Grupos predefinidos para conexiones
 */

export const DEFAULT_GROUPS = [
  { 
    name: 'default', 
    color: '#64ffda', 
    label: { en: 'Default', es: 'Por Defecto' }
  },
  { 
    name: 'production', 
    color: '#ff5370', 
    label: { en: 'Production', es: 'Producción' }
  },
  { 
    name: 'development', 
    color: '#ffcb6b', 
    label: { en: 'Development', es: 'Desarrollo' }
  },
  { 
    name: 'testing', 
    color: '#5ccfe6', 
    label: { en: 'Testing', es: 'Testing' }
  },
  { 
    name: 'staging', 
    color: '#c792ea', 
    label: { en: 'Staging', es: 'Staging' }
  },
]

export const GROUP_COLORS = [
  '#ff5370', // Red
  '#ffcb6b', // Yellow
  '#5ccfe6', // Blue
  '#c792ea', // Purple
  '#64ffda', // Cyan
  '#4ce3a0', // Green
  '#f78c6c', // Orange
  '#89ddff', // Light Blue
]

/**
 * Obtiene el color de un grupo
 */
export function getGroupColor(groupName) {
  const group = DEFAULT_GROUPS.find(g => g.name === groupName)
  return group?.color || '#64ffda'
}

/**
 * Obtiene el label traducido de un grupo
 */
export function getGroupLabel(groupName, lang = 'en') {
  const group = DEFAULT_GROUPS.find(g => g.name === groupName)
  return group?.label?.[lang] || groupName
}
