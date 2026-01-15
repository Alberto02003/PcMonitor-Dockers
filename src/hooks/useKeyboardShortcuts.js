/**
 * Hook useKeyboardShortcuts - Gestión de atajos de teclado
 * 
 * Fase 4.4 - Keyboard Shortcuts
 * 
 * Features:
 * - Registro de atajos de teclado
 * - Soporte para combinaciones (Ctrl, Alt, Shift)
 * - Prevención de conflictos
 * - Shortcuts globales y por contexto
 * - Personalización de atajos
 */

import { useEffect, useCallback, useRef } from 'react'

const MODIFIERS = {
  CTRL: 'ctrl',
  ALT: 'alt',
  SHIFT: 'shift',
  META: 'meta', // Cmd en Mac, Win en Windows
}

/**
 * Normaliza una combinación de teclas
 * @param {string} combo - Ej: "ctrl+k", "alt+shift+s"
 * @returns {Object}
 */
function parseCombo(combo) {
  const parts = combo.toLowerCase().split('+')
  const key = parts[parts.length - 1]
  const modifiers = parts.slice(0, -1)

  return {
    key,
    ctrl: modifiers.includes(MODIFIERS.CTRL),
    alt: modifiers.includes(MODIFIERS.ALT),
    shift: modifiers.includes(MODIFIERS.SHIFT),
    meta: modifiers.includes(MODIFIERS.META),
  }
}

/**
 * Verifica si un evento coincide con una combinación
 * @param {KeyboardEvent} event 
 * @param {Object} combo 
 * @returns {boolean}
 */
function matchesCombo(event, combo) {
  const key = event.key.toLowerCase()
  
  // Comparar key
  if (key !== combo.key) return false
  
  // Comparar modifiers
  if (event.ctrlKey !== combo.ctrl) return false
  if (event.altKey !== combo.alt) return false
  if (event.shiftKey !== combo.shift) return false
  if (event.metaKey !== combo.meta) return false
  
  return true
}

/**
 * Verifica si el elemento actual acepta input de teclado
 * @returns {boolean}
 */
function isInputElement() {
  const activeElement = document.activeElement
  if (!activeElement) return false
  
  const tagName = activeElement.tagName.toLowerCase()
  const isEditable = activeElement.isContentEditable
  
  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    isEditable
  )
}

/**
 * Hook para gestionar atajos de teclado
 * 
 * @param {Object} shortcuts - Mapa de atajos { "ctrl+k": handler, ... }
 * @param {Object} options - Opciones
 * @param {boolean} options.enabled - Si está habilitado
 * @param {boolean} options.preventDefault - Prevenir comportamiento por defecto
 * @param {boolean} options.ignoreInputs - Ignorar cuando está en input/textarea
 * @param {Array<string>} options.enabledKeys - Solo estos atajos habilitados
 */
export function useKeyboardShortcuts(shortcuts = {}, options = {}) {
  const {
    enabled = true,
    preventDefault = true,
    ignoreInputs = true,
    enabledKeys = null,
  } = options

  const shortcutsRef = useRef(shortcuts)
  const optionsRef = useRef(options)

  // Actualizar refs
  useEffect(() => {
    shortcutsRef.current = shortcuts
    optionsRef.current = options
  }, [shortcuts, options])

  const handleKeyDown = useCallback((event) => {
    // Verificar si está habilitado
    if (!enabled) return

    // Ignorar si está en un input
    if (ignoreInputs && isInputElement()) return

    // Iterar sobre los atajos registrados
    const currentShortcuts = shortcutsRef.current
    const currentOptions = optionsRef.current

    for (const [combo, handler] of Object.entries(currentShortcuts)) {
      // Verificar si este atajo está habilitado
      if (enabledKeys && !enabledKeys.includes(combo)) continue

      const parsedCombo = parseCombo(combo)
      
      if (matchesCombo(event, parsedCombo)) {
        // Prevenir comportamiento por defecto
        if (preventDefault) {
          event.preventDefault()
          event.stopPropagation()
        }

        // Ejecutar handler
        if (typeof handler === 'function') {
          handler(event)
        }

        break
      }
    }
  }, [enabled, preventDefault, ignoreInputs, enabledKeys])

  useEffect(() => {
    if (!enabled) return

    window.addEventListener('keydown', handleKeyDown)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [enabled, handleKeyDown])
}

/**
 * Hook para gestionar un solo atajo de teclado
 * 
 * @param {string} combo - Combinación de teclas (ej: "ctrl+k")
 * @param {Function} handler - Función a ejecutar
 * @param {Object} options - Opciones
 */
export function useKeyboardShortcut(combo, handler, options = {}) {
  const shortcuts = { [combo]: handler }
  useKeyboardShortcuts(shortcuts, options)
}

export default useKeyboardShortcuts
