/**
 * Funciones de cifrado para almacenamiento local
 * Usa Web Crypto API con AES-GCM
 */

const KEY_STORAGE = 'pcmd.key.v1'

/**
 * Convierte bytes a string base64
 * @param {Uint8Array} bytes
 * @returns {string}
 */
function bytesToBase64(bytes) {
  return btoa(String.fromCharCode(...bytes))
}

/**
 * Convierte string base64 a bytes
 * @param {string} value
 * @returns {Uint8Array}
 */
function base64ToBytes(value) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0))
}

/**
 * Obtiene o genera la clave de cifrado
 * @returns {Promise<CryptoKey>}
 */
export async function getEncryptionKey() {
  const stored = localStorage.getItem(KEY_STORAGE)
  
  if (stored) {
    const raw = base64ToBytes(stored)
    return crypto.subtle.importKey('raw', raw, 'AES-GCM', true, [
      'encrypt',
      'decrypt',
    ])
  }

  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
  
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', key))
  localStorage.setItem(KEY_STORAGE, bytesToBase64(raw))
  
  return key
}

/**
 * Cifra un payload JSON
 * @param {any} payload - Datos a cifrar
 * @returns {Promise<string>} - String base64 con IV + datos cifrados
 */
export async function encryptPayload(payload) {
  const key = await getEncryptionKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const data = new TextEncoder().encode(JSON.stringify(payload))
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  )
  
  const merged = new Uint8Array(iv.length + encrypted.byteLength)
  merged.set(iv, 0)
  merged.set(new Uint8Array(encrypted), iv.length)
  
  return bytesToBase64(merged)
}

/**
 * Descifra un payload cifrado
 * @param {string} payload - String base64 con IV + datos cifrados
 * @returns {Promise<any>} - Datos descifrados
 */
export async function decryptPayload(payload) {
  const key = await getEncryptionKey()
  const bytes = base64ToBytes(payload)
  const iv = bytes.slice(0, 12)
  const data = bytes.slice(12)
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  )
  
  const text = new TextDecoder().decode(decrypted)
  return JSON.parse(text)
}


