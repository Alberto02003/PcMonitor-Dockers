/**
 * Modal de confirmacion para acciones destructivas
 */

import { useEffect, useRef } from 'react'
import './ConfirmModal.css'

/**
 * @param {Object} props
 * @param {boolean} props.open - Si el modal esta abierto
 * @param {string} props.title - Titulo del modal
 * @param {string} props.message - Mensaje de confirmacion
 * @param {string} props.confirmLabel - Texto del boton de confirmar
 * @param {string} props.cancelLabel - Texto del boton de cancelar
 * @param {'danger'|'warning'|'info'} props.variant - Variante visual
 * @param {boolean} props.loading - Si esta procesando
 * @param {Function} props.onConfirm - Callback al confirmar
 * @param {Function} props.onCancel - Callback al cancelar
 */
function ConfirmModal({
  open,
  title = 'Confirmar accion',
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}) {
  const modalRef = useRef(null)
  const confirmButtonRef = useRef(null)

  // Focus trap y escape key
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !loading) {
        onCancel?.()
      }
    }

    // Focus en el boton de cancelar al abrir
    confirmButtonRef.current?.focus()

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, loading, onCancel])

  // Prevenir scroll del body cuando esta abierto
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  const handleBackdropClick = (e) => {
    if (e.target === modalRef.current && !loading) {
      onCancel?.()
    }
  }

  return (
    <div
      ref={modalRef}
      className="confirm-modal-backdrop"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div className={`confirm-modal confirm-modal--${variant}`}>
        <div className="confirm-modal__icon">
          {variant === 'danger' && <DangerIcon />}
          {variant === 'warning' && <WarningIcon />}
          {variant === 'info' && <InfoIcon />}
        </div>

        <h2 id="confirm-modal-title" className="confirm-modal__title">
          {title}
        </h2>

        <p className="confirm-modal__message">{message}</p>

        <div className="confirm-modal__actions">
          <button
            type="button"
            className="confirm-modal__btn confirm-modal__btn--cancel"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            className={`confirm-modal__btn confirm-modal__btn--confirm confirm-modal__btn--${variant}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <span className="confirm-modal__loading">
                <LoadingSpinner />
                Procesando...
              </span>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function DangerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  )
}

function WarningIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2L2 22h20L12 2z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <circle cx="12" cy="17" r="1" fill="currentColor" />
    </svg>
  )
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <circle cx="12" cy="8" r="1" fill="currentColor" />
    </svg>
  )
}

function LoadingSpinner() {
  return (
    <svg className="confirm-modal__spinner" viewBox="0 0 24 24">
      <circle
        cx="12"
        cy="12"
        r="10"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="31.4"
        strokeDashoffset="10"
      />
    </svg>
  )
}

export default ConfirmModal
