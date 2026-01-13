/**
 * Hook para gestionar la funcionalidad de deshacer eliminación
 */

import { useState, useRef, useEffect, useCallback } from 'react'

const UNDO_TIMEOUT = 4000

/**
 * Hook que proporciona funcionalidad de undo para eliminaciones
 * @param {Object} options - Opciones del hook
 * @param {Function} options.onRestore - Función para restaurar la conexión
 */
export function useUndoDelete({ onRestore }) {
  const [undoState, setUndoState] = useState(null)
  const undoTimerRef = useRef(null)

  // Limpiar timer al desmontar
  useEffect(() => {
    return () => {
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current)
      }
    }
  }, [])

  const setUndoData = useCallback((connection, index) => {
    setUndoState({ connection, index })
    
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current)
    }
    
    undoTimerRef.current = setTimeout(() => {
      setUndoState(null)
    }, UNDO_TIMEOUT)
  }, [])

  const handleUndo = useCallback(async () => {
    if (!undoState) return null
    
    await onRestore(undoState.connection, undoState.index)
    const restoredId = undoState.connection.id
    setUndoState(null)
    
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current)
    }
    
    return restoredId
  }, [undoState, onRestore])

  const clearUndo = useCallback(() => {
    setUndoState(null)
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current)
    }
  }, [])

  return {
    undoState,
    setUndoData,
    handleUndo,
    clearUndo,
    hasUndo: Boolean(undoState),
  }
}

export default useUndoDelete
