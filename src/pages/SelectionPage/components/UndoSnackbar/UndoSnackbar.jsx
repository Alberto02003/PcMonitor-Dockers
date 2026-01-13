import { useTranslation } from '../../../../hooks/useTranslation.jsx'
import './UndoSnackbar.css'

function UndoSnackbar({ open, message, onUndo }) {
  const { t } = useTranslation()

  if (!open) return null

  return (
    <div className="undo-snackbar" role="status">
      <span>{message}</span>
      <button type="button" onClick={onUndo}>
        {t('common.undo')}
      </button>
    </div>
  )
}

export default UndoSnackbar
