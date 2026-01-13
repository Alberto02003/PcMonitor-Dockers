/**
 * Hook para internacionalizacion
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
   * @param {string} key - Clave de traduccion (ej: "common.save")
   * @param {Object} params - Parametros para interpolacion
   * @returns {string}
   */
  const t = useCallback((key, params = {}) => {
    return translate(lang, key, params)
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

/**
 * HOC para inyectar traducciones en componentes de clase
 * @param {React.Component} Component
 * @returns {React.Component}
 */
export function withTranslation(Component) {
  return function TranslatedComponent(props) {
    const { t, translations, lang } = useTranslation()
    return <Component {...props} t={t} translations={translations} lang={lang} />
  }
}

export default useTranslation
