/**
 * Tests para utils/encryption.js
 * 
 * Verifica las funciones de cifrado extraidas en Fase 3
 * 
 * NOTA: Los tests de encrypt/decrypt requieren Web Crypto API real
 * que no esta disponible en el entorno de test (jsdom).
 * Solo testeamos las funciones de conversion base64 y las
 * funciones auxiliares que no dependen de crypto.subtle.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  bytesToBase64,
  base64ToBytes,
  hasEncryptionKey,
  clearEncryptionKey,
} from '../src/utils/encryption.js'

describe('Fase 3 - Utils: Encryption', () => {
  beforeEach(() => {
    // Limpiar localStorage antes de cada test
    localStorage.clear()
  })

  describe('bytesToBase64()', () => {
    it('debe convertir bytes a base64', () => {
      const bytes = new Uint8Array([72, 101, 108, 108, 111]) // "Hello"
      const result = bytesToBase64(bytes)
      expect(result).toBe('SGVsbG8=')
    })

    it('debe manejar array vacio', () => {
      const bytes = new Uint8Array([])
      const result = bytesToBase64(bytes)
      expect(result).toBe('')
    })

    it('debe manejar bytes con valores altos', () => {
      const bytes = new Uint8Array([255, 128, 0])
      const result = bytesToBase64(bytes)
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
    })

    it('debe generar base64 valido', () => {
      const bytes = new Uint8Array([0, 128, 255, 64, 32, 16])
      const result = bytesToBase64(bytes)
      // Verificar que es base64 valido (solo caracteres permitidos)
      expect(result).toMatch(/^[A-Za-z0-9+/]*=*$/)
    })
  })

  describe('base64ToBytes()', () => {
    it('debe convertir base64 a bytes', () => {
      const result = base64ToBytes('SGVsbG8=')
      expect(result).toEqual(new Uint8Array([72, 101, 108, 108, 111]))
    })

    it('debe manejar string vacio', () => {
      const result = base64ToBytes('')
      expect(result).toEqual(new Uint8Array([]))
    })

    it('debe ser inversa de bytesToBase64', () => {
      const original = new Uint8Array([1, 2, 3, 255, 128, 64])
      const base64 = bytesToBase64(original)
      const restored = base64ToBytes(base64)
      expect(restored).toEqual(original)
    })

    it('debe manejar base64 sin padding', () => {
      // "Hi" en base64 sin padding
      const result = base64ToBytes('SGk')
      expect(result).toEqual(new Uint8Array([72, 105]))
    })

    it('debe manejar base64 con padding', () => {
      // "H" en base64 con padding
      const result = base64ToBytes('SA==')
      expect(result).toEqual(new Uint8Array([72]))
    })
  })

  describe('Roundtrip bytesToBase64 <-> base64ToBytes', () => {
    it('debe preservar datos binarios arbitrarios', () => {
      const testCases = [
        new Uint8Array([]),
        new Uint8Array([0]),
        new Uint8Array([255]),
        new Uint8Array([0, 0, 0]),
        new Uint8Array([255, 255, 255]),
        new Uint8Array(Array.from({ length: 256 }, (_, i) => i)),
      ]

      for (const original of testCases) {
        const encoded = bytesToBase64(original)
        const decoded = base64ToBytes(encoded)
        expect(decoded).toEqual(original)
      }
    })
  })

  describe('hasEncryptionKey()', () => {
    it('debe retornar false cuando no hay clave', () => {
      localStorage.clear()
      expect(hasEncryptionKey()).toBe(false)
    })

    it('debe retornar true cuando hay clave en localStorage', () => {
      localStorage.clear()
      localStorage.setItem('pcmd.key.v1', 'somekey')
      expect(hasEncryptionKey()).toBe(true)
    })
  })

  describe('clearEncryptionKey()', () => {
    it('debe eliminar la clave de localStorage', () => {
      localStorage.setItem('pcmd.key.v1', 'somekey')
      expect(hasEncryptionKey()).toBe(true)
      
      clearEncryptionKey()
      
      expect(hasEncryptionKey()).toBe(false)
    })

    it('no debe fallar si no hay clave', () => {
      localStorage.clear()
      expect(() => clearEncryptionKey()).not.toThrow()
    })

    it('no debe afectar otras claves de localStorage', () => {
      localStorage.setItem('pcmd.key.v1', 'encryptionkey')
      localStorage.setItem('other.key', 'othervalue')
      
      clearEncryptionKey()
      
      expect(localStorage.getItem('other.key')).toBe('othervalue')
      expect(hasEncryptionKey()).toBe(false)
    })
  })

  // NOTA: Los siguientes tests requieren Web Crypto API real
  // que no esta disponible en jsdom. Se testean en integracion.
  describe.skip('encryptPayload() y decryptPayload() - Requieren Web Crypto API', () => {
    it('debe cifrar y descifrar un objeto simple', async () => {
      // Este test requiere crypto.subtle real
    })
  })
})
