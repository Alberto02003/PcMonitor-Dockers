import './UndoSnackbar.css'

function UndoSnackbar({ open, message, actionLabel, onUndo }) {
  if (!open) return null

  return (
    <div className="undo-snackbar" role="status">
      <span>{message}</span>
      <button type="button" onClick={onUndo}>
        {actionLabel}
      </button>
    </div>
  )
}

export default UndoSnackbar
