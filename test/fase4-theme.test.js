/**
 * Tests para Fase 4.1 - Dark Mode / Theme
 * 
 * Verifica el hook useTheme y funcionalidades de tema
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTheme, THEMES } from '../src/hooks/useTheme.js'

describe('Fase 4.1 - Dark Mode / Theme', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    document.body.className = ''
    
    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  })

  describe('THEMES constants', () => {
    it('debe exportar todos los temas', () => {
      expect(THEMES.LIGHT).toBe('light')
      expect(THEMES.DARK).toBe('dark')
      expect(THEMES.AUTO).toBe('auto')
    })
  })

  describe('useTheme - estado inicial', () => {
    it('debe iniciar con tema auto por defecto', () => {
      const { result } = renderHook(() => useTheme())

      expect(result.current.theme).toBe(THEMES.AUTO)
      expect([THEMES.LIGHT, THEMES.DARK]).toContain(result.current.effectiveTheme)
      expect(typeof result.current.isDark).toBe('boolean')
    })

    it('debe cargar tema guardado desde localStorage', () => {
      localStorage.setItem('pcmd.theme.v1', THEMES.DARK)

      const { result } = renderHook(() => useTheme())

      expect(result.current.theme).toBe(THEMES.DARK)
      expect(result.current.effectiveTheme).toBe(THEMES.DARK)
      expect(result.current.isDark).toBe(true)
    })

    it('debe usar tema auto si localStorage tiene valor invalido', () => {
      localStorage.setItem('pcmd.theme.v1', 'invalid')

      const { result } = renderHook(() => useTheme())

      expect(result.current.theme).toBe(THEMES.AUTO)
    })
  })

  describe('setTheme()', () => {
    it('debe cambiar el tema a light', () => {
      const { result } = renderHook(() => useTheme())

      act(() => {
        result.current.setTheme(THEMES.LIGHT)
      })

      expect(result.current.theme).toBe(THEMES.LIGHT)
      expect(result.current.effectiveTheme).toBe(THEMES.LIGHT)
      expect(result.current.isDark).toBe(false)
    })

    it('debe cambiar el tema a dark', () => {
      const { result } = renderHook(() => useTheme())

      act(() => {
        result.current.setTheme(THEMES.DARK)
      })

      expect(result.current.theme).toBe(THEMES.DARK)
      expect(result.current.effectiveTheme).toBe(THEMES.DARK)
      expect(result.current.isDark).toBe(true)
    })

    it('debe guardar el tema en localStorage', () => {
      const { result } = renderHook(() => useTheme())

      act(() => {
        result.current.setTheme(THEMES.DARK)
      })

      const stored = localStorage.getItem('pcmd.theme.v1')
      expect(stored).toBe(THEMES.DARK)
    })

    it('debe ignorar temas invalidos', () => {
      const { result } = renderHook(() => useTheme())
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const initialTheme = result.current.theme

      act(() => {
        result.current.setTheme('invalid-theme')
      })

      expect(result.current.theme).toBe(initialTheme)
      expect(consoleSpy).toHaveBeenCalled()
      
      consoleSpy.mockRestore()
    })
  })

  describe('toggleTheme()', () => {
    it('debe alternar de light a dark', () => {
      const { result } = renderHook(() => useTheme())

      act(() => {
        result.current.setTheme(THEMES.LIGHT)
      })

      act(() => {
        result.current.toggleTheme()
      })

      expect(result.current.theme).toBe(THEMES.DARK)
      expect(result.current.effectiveTheme).toBe(THEMES.DARK)
      expect(result.current.isDark).toBe(true)
    })

    it('debe alternar de dark a light', () => {
      const { result } = renderHook(() => useTheme())

      act(() => {
        result.current.setTheme(THEMES.DARK)
      })

      act(() => {
        result.current.toggleTheme()
      })

      expect(result.current.theme).toBe(THEMES.LIGHT)
      expect(result.current.effectiveTheme).toBe(THEMES.LIGHT)
      expect(result.current.isDark).toBe(false)
    })

    it('debe alternar desde auto al contrario del sistema', () => {
      // Mock system theme as light
      window.matchMedia = vi.fn().mockImplementation(query => ({
        matches: false, // prefers-color-scheme: dark = false
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }))

      const { result } = renderHook(() => useTheme())

      act(() => {
        result.current.setTheme(THEMES.AUTO)
      })

      expect(result.current.effectiveTheme).toBe(THEMES.LIGHT)

      act(() => {
        result.current.toggleTheme()
      })

      expect(result.current.theme).toBe(THEMES.DARK)
    })
  })

  describe('Aplicación de clases CSS', () => {
    it('debe agregar clase theme-light al body', () => {
      const { result } = renderHook(() => useTheme())

      act(() => {
        result.current.setTheme(THEMES.LIGHT)
      })

      expect(document.body.classList.contains('theme-light')).toBe(true)
      expect(document.body.classList.contains('theme-dark')).toBe(false)
    })

    it('debe agregar clase theme-dark al body', () => {
      const { result } = renderHook(() => useTheme())

      act(() => {
        result.current.setTheme(THEMES.DARK)
      })

      expect(document.body.classList.contains('theme-dark')).toBe(true)
      expect(document.body.classList.contains('theme-light')).toBe(false)
    })

    it('debe cambiar clases al alternar tema', () => {
      const { result } = renderHook(() => useTheme())

      act(() => {
        result.current.setTheme(THEMES.LIGHT)
      })

      expect(document.body.classList.contains('theme-light')).toBe(true)

      act(() => {
        result.current.toggleTheme()
      })

      expect(document.body.classList.contains('theme-dark')).toBe(true)
      expect(document.body.classList.contains('theme-light')).toBe(false)
    })
  })

  describe('Detección de tema del sistema', () => {
    it('debe detectar tema oscuro del sistema', () => {
      window.matchMedia = vi.fn().mockImplementation(query => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }))

      const { result } = renderHook(() => useTheme())

      act(() => {
        result.current.setTheme(THEMES.AUTO)
      })

      expect(result.current.effectiveTheme).toBe(THEMES.DARK)
      expect(result.current.isDark).toBe(true)
    })

    it('debe detectar tema claro del sistema', () => {
      window.matchMedia = vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }))

      const { result } = renderHook(() => useTheme())

      act(() => {
        result.current.setTheme(THEMES.AUTO)
      })

      expect(result.current.effectiveTheme).toBe(THEMES.LIGHT)
      expect(result.current.isDark).toBe(false)
    })
  })

  describe('isDark property', () => {
    it('debe ser true para tema dark', () => {
      const { result } = renderHook(() => useTheme())

      act(() => {
        result.current.setTheme(THEMES.DARK)
      })

      expect(result.current.isDark).toBe(true)
    })

    it('debe ser false para tema light', () => {
      const { result } = renderHook(() => useTheme())

      act(() => {
        result.current.setTheme(THEMES.LIGHT)
      })

      expect(result.current.isDark).toBe(false)
    })
  })

  describe('Persistencia', () => {
    it('debe persistir cambios entre renders', () => {
      const { result, unmount } = renderHook(() => useTheme())

      act(() => {
        result.current.setTheme(THEMES.DARK)
      })

      unmount()

      const { result: result2 } = renderHook(() => useTheme())

      expect(result2.current.theme).toBe(THEMES.DARK)
      expect(result2.current.effectiveTheme).toBe(THEMES.DARK)
    })
  })
})
