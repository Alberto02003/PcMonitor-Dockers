/**
 * Tests para utils/validation.js
 * 
 * Verifica las funciones de validacion extraidas en Fase 3
 */

import { describe, it, expect } from 'vitest'
import {
  validateHost,
  validatePort,
  validateUsername,
  sanitizeCommandArg,
  validateConnectionForm,
  isFormValid,
} from '../src/utils/validation.js'

describe('Fase 3 - Utils: Validation', () => {
  describe('validateHost()', () => {
    describe('hosts validos', () => {
      it('debe aceptar direcciones IP', () => {
        expect(validateHost('192.168.1.1').valid).toBe(true)
        expect(validateHost('10.0.0.1').valid).toBe(true)
        expect(validateHost('127.0.0.1').valid).toBe(true)
      })

      it('debe aceptar hostnames', () => {
        expect(validateHost('localhost').valid).toBe(true)
        expect(validateHost('my-server').valid).toBe(true)
        expect(validateHost('server.local').valid).toBe(true)
        expect(validateHost('sub.domain.example.com').valid).toBe(true)
      })

      it('debe aceptar hostnames con guiones bajos', () => {
        expect(validateHost('my_server').valid).toBe(true)
        expect(validateHost('server_01').valid).toBe(true)
      })

      it('debe trimear whitespace', () => {
        expect(validateHost('  192.168.1.1  ').valid).toBe(true)
        expect(validateHost('\tserver\n').valid).toBe(true)
      })
    })

    describe('hosts invalidos', () => {
      it('debe rechazar vacio o null', () => {
        expect(validateHost('').valid).toBe(false)
        expect(validateHost('   ').valid).toBe(false)
        expect(validateHost(null).valid).toBe(false)
        expect(validateHost(undefined).valid).toBe(false)
      })

      it('debe rechazar hosts muy largos', () => {
        const longHost = 'a'.repeat(254)
        expect(validateHost(longHost).valid).toBe(false)
        expect(validateHost(longHost).error).toContain('too long')
      })

      it('debe rechazar caracteres de inyeccion shell', () => {
        const injections = [
          'host;rm -rf /',
          'host$(whoami)',
          'host`id`',
          'host && echo x',
          'host | cat /etc/passwd',
          'host > /tmp/x',
          'host < /etc/passwd',
          'host\ninjected',
          'host\rinjected',
        ]
        for (const injection of injections) {
          expect(validateHost(injection).valid).toBe(false)
        }
      })

      it('debe rechazar comillas', () => {
        expect(validateHost("host'").valid).toBe(false)
        expect(validateHost('host"').valid).toBe(false)
        expect(validateHost('host\\').valid).toBe(false)
      })
    })
  })

  describe('validatePort()', () => {
    describe('puertos validos', () => {
      it('debe aceptar puertos en rango valido', () => {
        expect(validatePort(1).valid).toBe(true)
        expect(validatePort(22).valid).toBe(true)
        expect(validatePort(80).valid).toBe(true)
        expect(validatePort(443).valid).toBe(true)
        expect(validatePort(8080).valid).toBe(true)
        expect(validatePort(65535).valid).toBe(true)
      })

      it('debe aceptar strings numericos', () => {
        expect(validatePort('22').valid).toBe(true)
        expect(validatePort('8080').valid).toBe(true)
      })
    })

    describe('puertos invalidos', () => {
      it('debe rechazar 0', () => {
        expect(validatePort(0).valid).toBe(false)
      })

      it('debe rechazar negativos', () => {
        expect(validatePort(-1).valid).toBe(false)
        expect(validatePort(-22).valid).toBe(false)
      })

      it('debe rechazar mayores a 65535', () => {
        expect(validatePort(65536).valid).toBe(false)
        expect(validatePort(100000).valid).toBe(false)
      })

      it('debe rechazar no numericos', () => {
        expect(validatePort('abc').valid).toBe(false)
        expect(validatePort('22abc').valid).toBe(false)
      })

      it('debe rechazar null/undefined', () => {
        expect(validatePort(null).valid).toBe(false)
        expect(validatePort(undefined).valid).toBe(false)
      })

      it('debe rechazar decimales', () => {
        expect(validatePort(22.5).valid).toBe(false)
        expect(validatePort(80.1).valid).toBe(false)
      })
    })
  })

  describe('validateUsername()', () => {
    describe('usernames validos', () => {
      it('debe aceptar usernames alfanumericos', () => {
        expect(validateUsername('admin').valid).toBe(true)
        expect(validateUsername('root').valid).toBe(true)
        expect(validateUsername('user123').valid).toBe(true)
        expect(validateUsername('test_user').valid).toBe(true)
      })

      it('debe trimear whitespace', () => {
        expect(validateUsername('  admin  ').valid).toBe(true)
      })
    })

    describe('usernames invalidos', () => {
      it('debe rechazar vacio o null', () => {
        expect(validateUsername('').valid).toBe(false)
        expect(validateUsername('   ').valid).toBe(false)
        expect(validateUsername(null).valid).toBe(false)
        expect(validateUsername(undefined).valid).toBe(false)
      })

      it('debe rechazar usernames muy largos', () => {
        const longUser = 'a'.repeat(33)
        expect(validateUsername(longUser).valid).toBe(false)
        expect(validateUsername(longUser).error).toContain('too long')
      })

      it('debe rechazar espacios en medio', () => {
        expect(validateUsername('user name').valid).toBe(false)
        expect(validateUsername('user\tname').valid).toBe(false)
      })

      it('debe rechazar caracteres de inyeccion', () => {
        expect(validateUsername('user;id').valid).toBe(false)
        expect(validateUsername('user$(whoami)').valid).toBe(false)
        expect(validateUsername('user`id`').valid).toBe(false)
        expect(validateUsername('user|cat').valid).toBe(false)
      })
    })
  })

  describe('sanitizeCommandArg()', () => {
    it('debe retornar strings limpios sin cambios', () => {
      expect(sanitizeCommandArg('abc123')).toBe('abc123')
      expect(sanitizeCommandArg('container-name')).toBe('container-name')
      expect(sanitizeCommandArg('my_container')).toBe('my_container')
    })

    it('debe eliminar caracteres peligrosos', () => {
      expect(sanitizeCommandArg('cmd;rm')).toBe('cmdrm')
      expect(sanitizeCommandArg('cmd$(id)')).toBe('cmdid')
      expect(sanitizeCommandArg('cmd`whoami`')).toBe('cmdwhoami')
      expect(sanitizeCommandArg('cmd&&echo')).toBe('cmdecho')
      expect(sanitizeCommandArg('cmd|cat')).toBe('cmdcat')
      expect(sanitizeCommandArg('cmd>file')).toBe('cmdfile')
      expect(sanitizeCommandArg('cmd<file')).toBe('cmdfile')
    })

    it('debe eliminar saltos de linea', () => {
      expect(sanitizeCommandArg('line1\nline2')).toBe('line1line2')
      expect(sanitizeCommandArg('line1\rline2')).toBe('line1line2')
    })

    it('debe escapar comillas simples', () => {
      expect(sanitizeCommandArg("it's")).toBe("it'\\''s")
      expect(sanitizeCommandArg("don't")).toBe("don'\\''t")
    })

    it('debe manejar valores nulos', () => {
      expect(sanitizeCommandArg(null)).toBe('')
      expect(sanitizeCommandArg(undefined)).toBe('')
      expect(sanitizeCommandArg('')).toBe('')
    })
  })

  describe('validateConnectionForm()', () => {
    const translations = {
      required: 'Campo requerido',
      invalidPort: 'Puerto invalido',
    }

    it('debe retornar objeto vacio para formulario valido', () => {
      const valid = {
        name: 'My Server',
        host: '192.168.1.1',
        port: '22',
        username: 'admin',
      }
      const errors = validateConnectionForm(valid, translations)
      expect(Object.keys(errors)).toHaveLength(0)
    })

    it('debe detectar campos requeridos faltantes', () => {
      const invalid = {
        name: '',
        host: '',
        port: '22',
        username: '',
      }
      const errors = validateConnectionForm(invalid, translations)
      expect(errors.name).toBe('Campo requerido')
      expect(errors.host).toBe('Campo requerido')
      expect(errors.username).toBe('Campo requerido')
    })

    it('debe detectar puerto invalido', () => {
      const invalid = {
        name: 'Server',
        host: '192.168.1.1',
        port: '99999',
        username: 'admin',
      }
      const errors = validateConnectionForm(invalid, translations)
      expect(errors.port).toBe('Puerto invalido')
    })

    it('debe usar traducciones por defecto si no se proveen', () => {
      const invalid = { name: '', host: '', port: '22', username: '' }
      const errors = validateConnectionForm(invalid)
      expect(errors.name).toBe('Required')
    })
  })

  describe('isFormValid()', () => {
    it('debe retornar true para formulario valido', () => {
      const valid = {
        name: 'Server',
        host: '192.168.1.1',
        port: '22',
        username: 'admin',
      }
      expect(isFormValid(valid)).toBe(true)
    })

    it('debe retornar false para formulario invalido', () => {
      const invalid = {
        name: '',
        host: '192.168.1.1',
        port: '22',
        username: 'admin',
      }
      expect(isFormValid(invalid)).toBe(false)
    })
  })
})
