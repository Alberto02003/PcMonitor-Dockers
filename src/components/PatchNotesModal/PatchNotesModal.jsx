import { useState, useEffect } from 'react'
import { useTranslation } from '../../hooks/useTranslation.jsx'
import { invoke } from '@tauri-apps/api/core'
import './PatchNotesModal.css'

function PatchNotesModal({ open, onClose }) {
  const { t, lang } = useTranslation()
  const [patchNotes, setPatchNotes] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentVersion, setCurrentVersion] = useState('')

  useEffect(() => {
    if (open) {
      loadPatchNotes()
    }
  }, [open, lang])

  const loadPatchNotes = async () => {
    setIsLoading(true)
    try {
      // Obtener versión actual del package.json
      const version = import.meta.env.VITE_APP_VERSION || '0.1.5'
      setCurrentVersion(version)

      // Intentar obtener release notes desde GitHub
      const response = await fetch(
        `https://api.github.com/repos/Alberto02003/PcMonitor-Dockers/releases`,
        {
          headers: {
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      )

      if (response.ok) {
        const releases = await response.json()
        const parsed = releases.slice(0, 10).map(release => ({
          version: release.tag_name.replace('v', ''),
          date: new Date(release.published_at).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US'),
          notes: parseReleaseNotes(release.body || '', lang),
          isLatest: release.tag_name.replace('v', '') === version
        }))
        
        // Filtrar solo releases que tengan contenido explicativo
        const filtered = parsed.filter(release => {
          const hasContent = 
            release.notes.features.length > 0 ||
            release.notes.fixes.length > 0 ||
            release.notes.improvements.length > 0
          return hasContent
        })
        
        // Tomar solo las primeras 5 con contenido
        setPatchNotes(filtered.slice(0, 5))
      } else {
        // Fallback: notas locales hardcodeadas
        setPatchNotes(getFallbackNotes(version))
      }
    } catch (error) {
      console.error('Failed to load patch notes:', error)
      setPatchNotes(getFallbackNotes(currentVersion || '0.1.5'))
    } finally {
      setIsLoading(false)
    }
  }

  const parseReleaseNotes = (body, language = 'en') => {
    // Parsear markdown y filtrar contenido técnico
    const lines = body.split('\n')
    const features = []
    const fixes = []
    const improvements = []

    let currentSection = null

    lines.forEach(line => {
      const trimmed = line.trim()
      
      // Detectar secciones bilingües: "## Features / Nuevas Funcionalidades"
      // También detecta formato solo en inglés o solo en español
      
      // Features
      if (trimmed.match(/^#+\s*(?:✨|🎉|⭐)?\s*(?:features?(?:\s*\/\s*nuevas?\s*funcionalidades?)?|nuevas?\s*funcionalidades?(?:\s*\/\s*features?)?|nuevas?\s*características)/i)) {
        currentSection = 'features'
      } 
      // Fixes
      else if (trimmed.match(/^#+\s*(?:🐛|🔧|🩹)?\s*(?:fixes?(?:\s*\/\s*correcciones?)?|bug\s*fixes?(?:\s*\/\s*correcciones?)?|correcciones?(?:\s*\/\s*fixes?)?|arreglos?)/i)) {
        currentSection = 'fixes'
      } 
      // Improvements
      else if (trimmed.match(/^#+\s*(?:⚡|🚀|📈)?\s*(?:improvements?(?:\s*\/\s*mejoras?)?|mejoras?(?:\s*\/\s*improvements?)?|rendimiento|performance)/i)) {
        currentSection = 'improvements'
      }
      // Parsear items de lista
      else if (trimmed.match(/^[-*]\s+(.+)/)) {
        const match = trimmed.match(/^[-*]\s+(.+)/)
        const text = match[1].trim()
        
        // Filtrar líneas técnicas (commits, hashes, etc)
        if (!text.match(/^[a-f0-9]{7,}/i) && !text.match(/^chore|^build|^ci/i)) {
          if (currentSection === 'features') features.push(text)
          else if (currentSection === 'fixes') fixes.push(text)
          else if (currentSection === 'improvements') improvements.push(text)
        }
      }
    })

    return { features, fixes, improvements }
  }

  const getFallbackNotes = (version) => {
    // Notas hardcodeadas para la versión actual
    return [
      {
        version: version,
        date: new Date().toLocaleDateString(),
        isLatest: true,
        notes: {
          features: [
            'Connection Groups UI with visual organization',
            'Group management modal (create/rename/delete)',
            'Automatic update detection badge',
            "What's New modal after updates",
            'CI/CD release notes automation'
          ],
          fixes: [
            'SSH connection credential loading from Secure Storage',
            'IPv4 preference over IPv6 to avoid timeouts',
            'Connection timeout optimized to 15s'
          ],
          improvements: [
            'Performance optimizations (Sprint 0)',
            'Unified real-time data hooks',
            'Extracted metrics utilities',
            'Added memoization to critical components'
          ]
        }
      },
      {
        version: '0.1.4',
        date: '2026-01-10',
        isLatest: false,
        notes: {
          features: [
            'Real-time metrics monitoring',
            'Docker containers management',
            'SSH connection testing'
          ],
          fixes: [
            'Memory leak in WebSocket connections',
            'CPU usage calculation accuracy'
          ],
          improvements: [
            'UI/UX enhancements',
            'Better error handling'
          ]
        }
      }
    ]
  }

  if (!open) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="patch-notes-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{t('patchNotes.title')}</h2>
          <button 
            type="button" 
            className="modal-close" 
            onClick={onClose}
            aria-label={t('common.close')}
          >
            <CloseIcon />
          </button>
        </div>

        <div className="modal-body">
          {isLoading ? (
            <div className="patch-notes-loading">
              <div className="spinner" />
              <p>{t('common.loading')}</p>
            </div>
          ) : patchNotes.length === 0 ? (
            <div className="patch-notes-empty">
              <div className="empty-icon">📋</div>
              <p className="empty-message">{t('patchNotes.noReleases')}</p>
              <p className="empty-hint">{t('patchNotes.noReleasesHint')}</p>
            </div>
          ) : (
            <div className="patch-notes-list">
              {patchNotes.map((release) => (
                <div 
                  key={release.version} 
                  className={`patch-note-item ${release.isLatest ? 'is-latest' : ''}`}
                >
                  <div className="patch-note-header">
                    <div className="patch-note-version-row">
                      <h3 className="patch-note-version">v{release.version}</h3>
                      {release.isLatest && (
                        <span className="patch-note-badge">{t('patchNotes.current')}</span>
                      )}
                    </div>
                    <span className="patch-note-date">{release.date}</span>
                  </div>

                  <div className="patch-note-content">
                    {release.notes.features.length > 0 && (
                      <div className="patch-note-section">
                        <h4 className="patch-note-section-title">
                          <span className="section-icon">✨</span>
                          {t('patchNotes.features')}
                        </h4>
                        <ul className="patch-note-list">
                          {release.notes.features.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {release.notes.fixes.length > 0 && (
                      <div className="patch-note-section">
                        <h4 className="patch-note-section-title">
                          <span className="section-icon">🐛</span>
                          {t('patchNotes.fixes')}
                        </h4>
                        <ul className="patch-note-list">
                          {release.notes.fixes.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {release.notes.improvements.length > 0 && (
                      <div className="patch-note-section">
                        <h4 className="patch-note-section-title">
                          <span className="section-icon">⚡</span>
                          {t('patchNotes.improvements')}
                        </h4>
                        <ul className="patch-note-list">
                          {release.notes.improvements.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button 
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

export default PatchNotesModal
