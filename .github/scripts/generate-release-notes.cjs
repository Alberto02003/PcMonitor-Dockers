#!/usr/bin/env node

/**
 * Script para generar release notes user-friendly desde commits de Git
 * Filtra información técnica y genera contenido para usuarios finales
 * 
 * Uso: node generate-release-notes.js [desde_tag] [hasta_ref]
 * Ejemplo: node generate-release-notes.js v0.1.2 HEAD
 */

const { execSync } = require('child_process');

/**
 * Obtiene commits entre dos referencias
 */
function getCommits(from, to = 'HEAD') {
  try {
    const command = from 
      ? `git log ${from}..${to} --pretty=format:"%s" --no-merges`
      : `git log ${to} --pretty=format:"%s" --no-merges -20`; // Últimos 20 commits si no hay tag previo
    
    const output = execSync(command, { encoding: 'utf8' });
    return output.split('\n').filter(line => line.trim());
  } catch (error) {
    console.error('Error obteniendo commits:', error.message);
    return [];
  }
}

/**
 * Obtiene el último tag de git
 */
function getLatestTag() {
  try {
    return execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

/**
 * Categoriza y limpia un mensaje de commit
 */
function parseCommit(message) {
  // Extraer el tipo de commit (feat, fix, etc.)
  const typeMatch = message.match(/^(feat|fix|perf|docs|style|refactor|test|chore|build|ci)(\(.+?\))?:\s*(.+)/i);
  
  if (!typeMatch) {
    return null; // Commit sin formato convencional
  }

  const [, type, scope, description] = typeMatch;
  const cleanType = type.toLowerCase();
  
  // Filtrar commits técnicos que no interesan a usuarios
  const technicalTypes = ['refactor', 'test', 'chore', 'build', 'ci', 'docs', 'style'];
  if (technicalTypes.includes(cleanType)) {
    return null;
  }

  // Filtrar por palabras clave técnicas en la descripción
  const technicalKeywords = [
    'internal',
    'dependency',
    'dependencies',
    'eslint',
    'prettier',
    'lint',
    'types',
    'typescript',
    'config',
    'workflow'
  ];
  
  const lowerDesc = description.toLowerCase();
  if (technicalKeywords.some(keyword => lowerDesc.includes(keyword))) {
    return null;
  }

  // Limpiar la descripción
  let cleanDesc = description
    .replace(/\(#\d+\)/g, '') // Eliminar referencias a issues/PRs
    .trim();
  
  // Capitalizar primera letra
  cleanDesc = cleanDesc.charAt(0).toUpperCase() + cleanDesc.slice(1);
  
  // Mapear tipos a categorías user-friendly
  const categoryMap = {
    'feat': 'feature',
    'fix': 'fix',
    'perf': 'improvement'
  };

  return {
    type: categoryMap[cleanType] || 'other',
    description: cleanDesc,
    scope: scope ? scope.replace(/[()]/g, '') : null
  };
}

/**
 * Agrupa commits por categoría
 */
function groupCommits(commits) {
  const groups = {
    feature: [],
    fix: [],
    improvement: [],
    other: []
  };

  commits.forEach(commit => {
    const parsed = parseCommit(commit);
    if (parsed && parsed.description.length > 10) {
      groups[parsed.type].push(parsed.description);
    }
  });

  return groups;
}

/**
 * Genera el texto de release notes en formato Markdown (bilingüe EN/ES)
 */
function generateReleaseNotes(groups) {
  const sections = [];

  // Nueva funcionalidad / Features
  if (groups.feature.length > 0) {
    sections.push('## Features / Nuevas Funcionalidades\n');
    groups.feature.forEach(desc => {
      sections.push(`- ${desc}`);
    });
    sections.push('');
  }

  // Correcciones / Fixes
  if (groups.fix.length > 0) {
    sections.push('## Fixes / Correcciones\n');
    groups.fix.forEach(desc => {
      sections.push(`- ${desc}`);
    });
    sections.push('');
  }

  // Mejoras / Improvements
  if (groups.improvement.length > 0) {
    sections.push('## Improvements / Mejoras\n');
    groups.improvement.forEach(desc => {
      sections.push(`- ${desc}`);
    });
    sections.push('');
  }

  // Otros cambios (solo si hay algo relevante)
  if (groups.other.length > 0) {
    sections.push('## Other Changes / Otros Cambios\n');
    groups.other.forEach(desc => {
      sections.push(`- ${desc}`);
    });
    sections.push('');
  }

  return sections.join('\n');
}

/**
 * Función principal
 */
function main() {
  const args = process.argv.slice(2);
  const fromRef = args[0] || getLatestTag();
  const toRef = args[1] || 'HEAD';

  console.error(`Generando release notes desde: ${fromRef || '(inicio)'} hasta: ${toRef}`);
  
  const commits = getCommits(fromRef, toRef);
  
  if (commits.length === 0) {
    console.error('No se encontraron commits');
    console.log('## 📦 Nueva Versión\n\nMejoras generales de rendimiento y estabilidad.');
    process.exit(0);
  }

  console.error(`Procesando ${commits.length} commits...`);
  
  const groups = groupCommits(commits);
  const totalUserFacing = groups.feature.length + groups.fix.length + groups.improvement.length + groups.other.length;
  
  console.error(`Cambios user-facing: ${totalUserFacing}`);
  
  if (totalUserFacing === 0) {
    console.log('## 📦 Nueva Versión\n\nMejoras generales de rendimiento y estabilidad.');
  } else {
    const notes = generateReleaseNotes(groups);
    console.log(notes);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main();
}

module.exports = { getCommits, parseCommit, groupCommits, generateReleaseNotes };
