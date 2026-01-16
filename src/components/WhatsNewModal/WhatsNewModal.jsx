/**
 * Modal que muestra los cambios de la última actualización
 * Se muestra automáticamente al iniciar la app después de actualizarse
 * Solo muestra información general para usuarios, sin aspectos técnicos
 */

import { useMemo } from 'react'
import { useTranslation } from '../../hooks/useTranslation.jsx'
import './WhatsNewModal.css'

/**
 * Parsea las release notes y extrae solo lo relevante para usuarios
 * Filtra aspectos técnicos y devuelve puntos generales
 */
function parseReleaseNotes(body) {
  if (!body) return []

  // Dividir por líneas
  const lines = body.split('\n').filter(line => line.trim())
  
  const userFriendlyChanges = []
  
  // Secciones que interesan a usuarios finales
  const userSections = [
    'nuevas funcionalidades',
    'new features',
    'mejoras',
    'improvements', 
    'cambios',
    'changes',
    'fixes',
    'correcciones'
  ]

  // Secciones técnicas que se deben omitir
  const technicalSections = [
    'technical',
    'refactor',
    'dependencies',
    'dependencias',
    'internal',
    'dev',
    'build',
    'ci/cd'
  ]

  let _currentSection = null
  let isUserSection = false

  for (const line of lines) {
    const trimmed = line.trim()
    
    // Detectar si es un encabezado de sección (## o ###)
    if (trimmed.startsWith('##') || trimmed.startsWith('###')) {
      const sectionName = trimmed.replace(/^#+\s*/, '').toLowerCase()
      _currentSection = sectionName
      
      // Verificar si es una sección para usuarios
      isUserSection = userSections.some(section => 
        sectionName.includes(section)
      ) && !technicalSections.some(section => 
        sectionName.includes(section)
      )
      
      continue
    }

    // Si estamos en una sección de usuario, procesar los items
    if (isUserSection) {
      // Items de lista (- o *)
      if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
        let item = trimmed.replace(/^[-*]\s*/, '').trim()
        
        // Eliminar prefijos técnicos (feat:, fix:, etc.)
        item = item.replace(/^(feat|fix|chore|docs|style|refactor|perf|test):\s*/i, '')
        
        // Eliminar referencias a PRs y issues (#123)
        item = item.replace(/\(#\d+\)/g, '').trim()
        
        // Solo agregar si tiene contenido significativo
        if (item.length > 10 && !item.toLowerCase().includes('internal')) {
          userFriendlyChanges.push(item)
        }
      }
    }
  }

  // Si no se encontraron cambios estructurados, intentar extraer bullets generales
  if (userFriendlyChanges.length === 0) {
    const bullets = lines.filter(line => {
      const trimmed = line.trim()
      return (trimmed.startsWith('-') || trimmed.startsWith('*')) &&
             !trimmed.toLowerCase().includes('technical') &&
             !trimmed.toLowerCase().includes('refactor') &&
             !trimmed.toLowerCase().includes('dependency')
    })

    bullets.forEach(bullet => {
      let item = bullet.trim().replace(/^[-*]\s*/, '').trim()
      item = item.replace(/^(feat|fix|chore|docs|style|refactor|perf|test):\s*/i, '')
      item = item.replace(/\(#\d+\)/g, '').trim()
      
      if (item.length > 10) {
        userFriendlyChanges.push(item)
      }
    })
  }

  // Limitar a los primeros 8 cambios más relevantes
  return userFriendlyChanges.slice(0, 8)
}

function WhatsNewModal({ open, onClose, version, releaseNotes }) {
  const { t } = useTranslation()
  
  // Parse release notes using useMemo to avoid unnecessary recalculations
  const changes = useMemo(() => {
    return releaseNotes ? parseReleaseNotes(releaseNotes) : []
  }, [releaseNotes])

  if (!open) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="whats-new-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="whats-new-header">
          <div className="whats-new-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <div className="whats-new-title">
            <h2>{t('whatsNew.title')}</h2>
            <p className="whats-new-version">v{version}</p>
          </div>
          <button 
            className="whats-new-close"
            onClick={onClose}
            aria-label={t('common.close')}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="whats-new-content">
          <p className="whats-new-intro">
            {t('whatsNew.intro')}
          </p>

          {changes.length > 0 ? (
            <ul className="whats-new-list">
              {changes.map((change, index) => (
                <li key={index} className="whats-new-item">
                  <span className="whats-new-bullet">✓</span>
                  <span className="whats-new-text">{change}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="whats-new-empty">
              <p>{t('whatsNew.generalImprovements')}</p>
            </div>
          )}

          {/* Footer */}
          <div className="whats-new-footer">
            <p className="whats-new-thanks">
              {t('whatsNew.thanks')}
            </p>
            <button 
              className="btn btn-primary whats-new-btn"
              onClick={onClose}
            >
              {t('whatsNew.getStarted')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WhatsNewModal
