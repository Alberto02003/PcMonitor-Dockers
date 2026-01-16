/**
 * Hook para internacionalizacion
 * 
 * OPTIMIZADO (2026-01-16):
 * - Fix default parameter {} que causaba recreación de función
 * - Vercel rule: rerender-functional-setstate
 */

import { useCallback, useMemo } from 'react'
import { useSettings } from '../components/Settings/Settings.jsx'
import { getTranslations, t as translate, DEFAULT_LANGUAGE, LANGUAGES } from '../i18n/index.js'

/**
 * Hook para obtener traducciones
 * @returns {Object}
 */
export function useTranslation() {
  const { settings } = useSettings()
  const lang = settings?.language || DEFAULT_LANGUAGE

  /**
   * Objeto completo de traducciones para el idioma actual
   */
  const translations = useMemo(() => getTranslations(lang), [lang])

  /**
   * Funcion para obtener una traduccion especifica
   * OPTIMIZACIÓN: No usar default parameter {} que causa recreación
   * @param {string} key - Clave de traduccion (ej: "common.save")
   * @param {Object} params - Parametros para interpolacion
   * @returns {string}
   */
  const t = useCallback((key, params) => {
    return translate(lang, key, params || {})
  }, [lang])

  /**
   * Idioma actual
   */
  const currentLanguage = lang

  /**
   * Lista de idiomas disponibles
   */
  const availableLanguages = LANGUAGES

  return {
    t,
    translations,
    lang: currentLanguage,
    languages: availableLanguages,
  }
}

export default useTranslation
