/**
 * Sistema de internacionalizacion (i18n)
 */

import es from './es.json'
import en from './en.json'

/**
 * Idiomas disponibles
 */
export const LANGUAGES = {
  es: { code: 'es', name: 'Espanol', nativeName: 'Espanol' },
  en: { code: 'en', name: 'English', nativeName: 'English' },
}

/**
 * Idioma por defecto
 */
export const DEFAULT_LANGUAGE = 'es'

/**
 * Traducciones por idioma
 */
export const translations = {
  es,
  en,
}

/**
 * Obtiene las traducciones para un idioma
 * @param {string} lang - Codigo de idioma (es, en)
 * @returns {Object} - Objeto de traducciones
 */
export function getTranslations(lang) {
  return translations[lang] || translations[DEFAULT_LANGUAGE]
}

/**
 * Obtiene una traduccion especifica usando notacion de punto
 * @param {string} lang - Codigo de idioma
 * @param {string} key - Clave de traduccion (ej: "common.save")
 * @param {Object} params - Parametros para interpolacion
 * @returns {string}
 */
export function t(lang, key, params = {}) {
  const keys = key.split('.')
  let value = translations[lang] || translations[DEFAULT_LANGUAGE]

  for (const k of keys) {
    if (value && typeof value === 'object') {
      value = value[k]
    } else {
      value = undefined
      break
    }
  }

  if (typeof value !== 'string') {
    console.warn(`Translation missing: ${key} for language: ${lang}`)
    return key
  }

  // Interpolacion simple: {{param}}
  return value.replace(/\{\{(\w+)\}\}/g, (_, param) => {
    return params[param] !== undefined ? params[param] : `{{${param}}}`
  })
}

/**
 * Detecta el idioma del navegador
 * @returns {string} - Codigo de idioma
 */
export function detectBrowserLanguage() {
  const browserLang = navigator.language?.split('-')[0] || DEFAULT_LANGUAGE
  return LANGUAGES[browserLang] ? browserLang : DEFAULT_LANGUAGE
}

export default translations
