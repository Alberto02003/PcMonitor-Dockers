import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from '../../hooks/useTranslation.jsx'
import { getAppVersion } from '../../services/tauri.js'
import { parseReleaseBody, hasContent } from '../../utils/releaseNotesParser.js'
import './PatchNotesModal.css'

const GITHUB_API = 'https://api.github.com/repos/Alberto02003/PcMonitor-Dockers/releases'
const CACHE_KEY = 'patch_notes_cache'
const CACHE_TTL = 30 * 60 * 1000 // 30 minutes

/**
 * Read cached releases from localStorage
 */
function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    if (Date.now() - ts > CACHE_TTL) return null
    return data
  } catch {
    return null
  }
}

/**
 * Write releases to localStorage cache
 */
function writeCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }))
  } catch {
    // localStorage full — ignore
  }
}

/**
 * Unified Patch Notes modal
 *
 * Modes:
 *  - Manual: user clicks "What's New" button → fetches from GitHub, shows multiple releases
 *  - WhatsNew: auto-shown after app restart with new version → highlights current version,
 *    can also show from localStorage notes saved before update
 */
function PatchNotesModal({ open, onClose, whatsNewMode = false, whatsNewVersion = null, savedNotes = null }) {
  const { t, lang } = useTranslation()
  const [patchNotes, setPatchNotes] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentVersion, setCurrentVersion] = useState('')

  const loadPatchNotes = useCallback(async () => {
    setIsLoading(true)
    try {
      const version = await getAppVersion()
      setCurrentVersion(version)

      // Try cache first, then GitHub
      let releases = readCache()
      if (!releases) {
        const response = await fetch(GITHUB_API, {
          headers: { 'Accept': 'application/vnd.github.v3+json' }
        })
        if (response.ok) {
          releases = await response.json()
          writeCache(releases)
        }
      }

      if (releases) {
        const parsed = releases.slice(0, 10).map(release => ({
          version: release.tag_name.replace('v', ''),
          date: new Date(release.published_at).toLocaleDateString(
            lang === 'es' ? 'es-ES' : 'en-US'
          ),
          notes: parseReleaseBody(release.body || ''),
          isCurrent: release.tag_name.replace('v', '') === version,
        }))

        const filtered = parsed.filter(r => hasContent(r.notes))
        setPatchNotes(filtered.slice(0, 5))
      } else if (savedNotes) {
        // Offline fallback: use notes saved from the updater
        setPatchNotes([{
          version: whatsNewVersion || version,
          date: new Date().toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US'),
          notes: parseReleaseBody(savedNotes),
          isCurrent: true,
        }])
      } else {
        setPatchNotes([])
      }
    } catch (error) {
      console.error('Failed to load patch notes:', error)
      // Fallback to savedNotes from updater if available
      if (savedNotes) {
        const version = currentVersion || whatsNewVersion || '0.0.0'
        setPatchNotes([{
          version,
          date: new Date().toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US'),
          notes: parseReleaseBody(savedNotes),
          isCurrent: true,
        }])
      } else {
        setPatchNotes([])
      }
    } finally {
      setIsLoading(false)
    }
  }, [lang, savedNotes, whatsNewVersion])

  useEffect(() => {
    if (open) loadPatchNotes()
  }, [open, loadPatchNotes])

  if (!open) return null

  const title = whatsNewMode ? t('whatsNew.title') : t('patchNotes.title')
  const closeLabel = whatsNewMode ? t('whatsNew.getStarted') : t('common.close')

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="patch-notes-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
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
          {whatsNewMode && (
            <p className="whats-new-intro">{t('whatsNew.intro')}</p>
          )}

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
                  className={`patch-note-item ${release.isCurrent ? 'is-latest' : ''}`}
                >
                  <div className="patch-note-header">
                    <div className="patch-note-version-row">
                      <h3 className="patch-note-version">v{release.version}</h3>
                      {release.isCurrent && (
                        <span className="patch-note-badge">
                          {whatsNewMode ? 'NEW' : t('patchNotes.current')}
                        </span>
                      )}
                    </div>
                    <span className="patch-note-date">{release.date}</span>
                  </div>

                  <div className="patch-note-content">
                    {release.notes.features.length > 0 && (
                      <NoteSection
                        icon="✨"
                        title={t('patchNotes.features')}
                        items={release.notes.features}
                      />
                    )}
                    {release.notes.fixes.length > 0 && (
                      <NoteSection
                        icon="🐛"
                        title={t('patchNotes.fixes')}
                        items={release.notes.fixes}
                      />
                    )}
                    {release.notes.improvements.length > 0 && (
                      <NoteSection
                        icon="⚡"
                        title={t('patchNotes.improvements')}
                        items={release.notes.improvements}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {whatsNewMode && !isLoading && patchNotes.length > 0 && (
            <p className="whats-new-thanks">{t('whatsNew.thanks')}</p>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {closeLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function NoteSection({ icon, title, items }) {
  return (
    <div className="patch-note-section">
      <h4 className="patch-note-section-title">
        <span className="section-icon">{icon}</span>
        {title}
      </h4>
      <ul className="patch-note-list">
        {items.map((item, idx) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>
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
