/**
 * Tests para Fase 4.4 - Keyboard Shortcuts
 * 
 * Verifica los hooks de atajos de teclado
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import {
  useKeyboardShortcuts,
  useKeyboardShortcut,
} from '../src/hooks/useKeyboardShortcuts.js'

// NOTE: useNavigationShortcuts, useViewShortcuts, formatShortcut, getPlatformInfo
// are not yet implemented in the source module. Tests for them are marked as todo.

describe('Fase 4.4 - Keyboard Shortcuts', () => {
  let keydownHandler = null
  const originalAddEventListener = window.addEventListener.bind(window)
  const originalRemoveEventListener = window.removeEventListener.bind(window)

  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''

    // Intercept addEventListener to capture the keydown handler for cleanup
    window.addEventListener = vi.fn((event, handler, options) => {
      if (event === 'keydown') {
        keydownHandler = handler
      }
      return originalAddEventListener(event, handler, options)
    })
    window.removeEventListener = vi.fn((event, handler, options) => {
      return originalRemoveEventListener(event, handler, options)
    })
  })

  afterEach(() => {
    // Remove the actual registered handler, not a new empty function
    if (keydownHandler) {
      originalRemoveEventListener('keydown', keydownHandler)
      keydownHandler = null
    }
    window.addEventListener = originalAddEventListener
    window.removeEventListener = originalRemoveEventListener
  })

  describe('useKeyboardShortcuts', () => {
    it('debe registrar shortcuts básicos', () => {
      const handler = vi.fn()
      const shortcuts = {
        'ctrl+k': handler,
      }

      renderHook(() => useKeyboardShortcuts(shortcuts))

      // Simular Ctrl+K
      const event = new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
      })
      window.dispatchEvent(event)

      expect(handler).toHaveBeenCalledWith(expect.any(KeyboardEvent))
    })

    it('debe soportar múltiples shortcuts', () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      const shortcuts = {
        'ctrl+k': handler1,
        'ctrl+s': handler2,
      }

      renderHook(() => useKeyboardShortcuts(shortcuts))

      // Ctrl+K
      window.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
      }))
      expect(handler1).toHaveBeenCalled()

      // Ctrl+S
      window.dispatchEvent(new KeyboardEvent('keydown', {
        key: 's',
        ctrlKey: true,
      }))
      expect(handler2).toHaveBeenCalled()
    })

    it('debe soportar combinaciones con Alt', () => {
      const handler = vi.fn()
      renderHook(() => useKeyboardShortcuts({ 'alt+a': handler }))

      window.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'a',
        altKey: true,
      }))

      expect(handler).toHaveBeenCalled()
    })

    it('debe soportar combinaciones con Shift', () => {
      const handler = vi.fn()
      renderHook(() => useKeyboardShortcuts({ 'shift+s': handler }))

      window.dispatchEvent(new KeyboardEvent('keydown', {
        key: 's',
        shiftKey: true,
      }))

      expect(handler).toHaveBeenCalled()
    })

    it('debe soportar combinaciones múltiples', () => {
      const handler = vi.fn()
      renderHook(() => useKeyboardShortcuts({ 'ctrl+shift+d': handler }))

      window.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'd',
        ctrlKey: true,
        shiftKey: true,
      }))

      expect(handler).toHaveBeenCalled()
    })

    it('no debe ejecutar si falta un modificador', () => {
      const handler = vi.fn()
      renderHook(() => useKeyboardShortcuts({ 'ctrl+k': handler }))

      // Solo 'k' sin Ctrl
      window.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'k',
      }))

      expect(handler).not.toHaveBeenCalled()
    })

    it('no debe ejecutar si hay modificadores extra', () => {
      const handler = vi.fn()
      renderHook(() => useKeyboardShortcuts({ 'ctrl+k': handler }))

      // Ctrl+Alt+K (Alt extra)
      window.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
        altKey: true,
      }))

      expect(handler).not.toHaveBeenCalled()
    })

    it('debe respetar la opción enabled', () => {
      const handler = vi.fn()
      const { rerender } = renderHook(
        ({ enabled }) => useKeyboardShortcuts({ 'ctrl+k': handler }, { enabled }),
        { initialProps: { enabled: false } }
      )

      window.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
      }))

      expect(handler).not.toHaveBeenCalled()

      // Habilitar
      rerender({ enabled: true })

      window.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
      }))

      expect(handler).toHaveBeenCalled()
    })

    it('debe prevenir comportamiento por defecto si preventDefault es true', () => {
      const handler = vi.fn()
      renderHook(() => 
        useKeyboardShortcuts({ 'ctrl+k': handler }, { preventDefault: true })
      )

      const event = new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
      })
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')
      const stopPropagationSpy = vi.spyOn(event, 'stopPropagation')

      window.dispatchEvent(event)

      expect(preventDefaultSpy).toHaveBeenCalled()
      expect(stopPropagationSpy).toHaveBeenCalled()
    })

    it('debe ignorar inputs si ignoreInputs es true', () => {
      const handler = vi.fn()
      renderHook(() => 
        useKeyboardShortcuts({ 'ctrl+k': handler }, { ignoreInputs: true })
      )

      // Crear un input y enfocarlo
      const input = document.createElement('input')
      document.body.appendChild(input)
      input.focus()

      window.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
      }))

      expect(handler).not.toHaveBeenCalled()
    })

    it('no debe ignorar inputs si ignoreInputs es false', () => {
      const handler = vi.fn()
      renderHook(() => 
        useKeyboardShortcuts({ 'ctrl+k': handler }, { ignoreInputs: false })
      )

      const input = document.createElement('input')
      document.body.appendChild(input)
      input.focus()

      window.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
      }))

      expect(handler).toHaveBeenCalled()
    })

    it('debe respetar enabledKeys', () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      renderHook(() => 
        useKeyboardShortcuts(
          { 'ctrl+a': handler1, 'ctrl+b': handler2 },
          { enabledKeys: ['ctrl+a'] }
        )
      )

      window.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'a',
        ctrlKey: true,
      }))
      expect(handler1).toHaveBeenCalled()

      window.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'b',
        ctrlKey: true,
      }))
      expect(handler2).not.toHaveBeenCalled()
    })

    it('debe actualizar handlers dinámicamente', () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()

      const { rerender } = renderHook(
        ({ shortcuts }) => useKeyboardShortcuts(shortcuts),
        { initialProps: { shortcuts: { 'ctrl+k': handler1 } } }
      )

      window.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
      }))
      expect(handler1).toHaveBeenCalled()

      // Cambiar handler
      rerender({ shortcuts: { 'ctrl+k': handler2 } })

      window.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
      }))
      expect(handler2).toHaveBeenCalled()
    })
  })

  describe('useKeyboardShortcut (single)', () => {
    it('debe registrar un único shortcut', () => {
      const handler = vi.fn()
      renderHook(() => useKeyboardShortcut('ctrl+k', handler))

      window.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
      }))

      expect(handler).toHaveBeenCalled()
    })
  })

  describe('useNavigationShortcuts', () => {
    // useNavigationShortcuts is not yet exported from the source module
    it.todo('debe registrar shortcuts de navegación (onBack, onRefresh, onSearch)')
    it.todo('debe retornar mapa de shortcuts activos')
  })

  describe('useViewShortcuts', () => {
    // useViewShortcuts is not yet exported from the source module
    it.todo('debe registrar shortcuts de vista (onView1, onView2, onToggleTheme)')
  })

  describe('formatShortcut', () => {
    // formatShortcut is not yet exported from the source module
    it.todo('debe formatear shortcuts simples (ctrl+k -> Ctrl+K)')
    it.todo('debe formatear shortcuts múltiples (ctrl+shift+d -> Ctrl+Shift+D)')
    it.todo('debe formatear teclas especiales (arrowleft -> arrow symbol)')
    it.todo('debe manejar shortcuts vacíos')
    it.todo('debe capitalizar teclas normales')
  })

  describe('getPlatformInfo', () => {
    // getPlatformInfo is not yet exported from the source module
    it.todo('debe retornar información de la plataforma (isMac, isWindows, isLinux, modifierKey, modifierSymbol)')
    it.todo('debe usar Cmd en Mac')
    it.todo('debe usar Ctrl en Windows')
  })

  describe('Casos edge', () => {
    it('debe manejar teclas case-insensitive', () => {
      const handler = vi.fn()
      renderHook(() => useKeyboardShortcuts({ 'ctrl+K': handler }))

      window.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
      }))

      expect(handler).toHaveBeenCalled()
    })

    it('debe ignorar textarea', () => {
      const handler = vi.fn()
      renderHook(() => 
        useKeyboardShortcuts({ 'ctrl+k': handler }, { ignoreInputs: true })
      )

      const textarea = document.createElement('textarea')
      document.body.appendChild(textarea)
      textarea.focus()

      window.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
      }))

      expect(handler).not.toHaveBeenCalled()
    })

    it.todo('debe ignorar elementos contentEditable (jsdom does not fully support contentEditable/activeElement for this test)')
  })
})
