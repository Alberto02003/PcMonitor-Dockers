/**
 * Unified release notes parser
 * Single source of truth for parsing GitHub release markdown into structured data
 */

const SECTION_PATTERNS = {
  features: /^#+\s*(?:✨|🎉|⭐)?\s*(?:features?(?:\s*\/\s*nuevas?\s*(?:funcionalidades?|características?))?|nuevas?\s*(?:funcionalidades?|características?)(?:\s*\/\s*features?)?)/i,
  fixes: /^#+\s*(?:🐛|🔧|🩹)?\s*(?:(?:bug\s*)?fixes?(?:\s*\/\s*correcciones?)?|correcciones?(?:\s*\/\s*(?:bug\s*)?fixes?)?|arreglos?)/i,
  improvements: /^#+\s*(?:⚡|🚀|📈)?\s*(?:improvements?(?:\s*\/\s*mejoras?)?|mejoras?(?:\s*\/\s*improvements?)?|rendimiento|performance)/i,
}

const TECHNICAL_LINE = /^[a-f0-9]{7,}|^chore|^build|^ci|^refactor|^test|^docs|^style/i

/**
 * Parse a GitHub release body into categorized notes
 * @param {string} body - Markdown body from GitHub release
 * @returns {{ features: string[], fixes: string[], improvements: string[] }}
 */
export function parseReleaseBody(body) {
  if (!body) return { features: [], fixes: [], improvements: [] }

  const lines = body.split('\n')
  const result = { features: [], fixes: [], improvements: [] }
  let currentSection = null

  for (const line of lines) {
    const trimmed = line.trim()

    // Detect section headers
    if (SECTION_PATTERNS.features.test(trimmed)) {
      currentSection = 'features'
      continue
    }
    if (SECTION_PATTERNS.fixes.test(trimmed)) {
      currentSection = 'fixes'
      continue
    }
    if (SECTION_PATTERNS.improvements.test(trimmed)) {
      currentSection = 'improvements'
      continue
    }
    // Any other header resets the section
    if (/^#+\s/.test(trimmed)) {
      currentSection = null
      continue
    }

    // Parse list items
    const itemMatch = trimmed.match(/^[-*]\s+(.+)/)
    if (itemMatch && currentSection) {
      let text = itemMatch[1].trim()
      // Strip conventional commit prefixes
      text = text.replace(/^(feat|fix|perf):\s*/i, '')
      // Strip PR/issue references
      text = text.replace(/\(#\d+\)/g, '').trim()

      if (text.length > 5 && !TECHNICAL_LINE.test(text)) {
        result[currentSection].push(text)
      }
    }
  }

  return result
}

/**
 * Check if parsed notes have any content
 */
export function hasContent(notes) {
  return notes.features.length > 0 || notes.fixes.length > 0 || notes.improvements.length > 0
}
