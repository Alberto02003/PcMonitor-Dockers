#!/usr/bin/env node

/**
 * Release Script for PC Monitoring Dockers
 * 
 * Usage:
 *   node scripts/release.js patch   # 0.1.0 -> 0.1.1
 *   node scripts/release.js minor   # 0.1.0 -> 0.2.0
 *   node scripts/release.js major   # 0.1.0 -> 1.0.0
 *   node scripts/release.js 0.2.5   # Set specific version
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function exec(command, options = {}) {
  try {
    return execSync(command, { encoding: 'utf8', stdio: 'pipe', ...options }).trim()
  } catch (error) {
    if (options.ignoreError) return ''
    throw error
  }
}

function getCurrentVersion() {
  const tauriConfigPath = path.join(__dirname, '..', 'src-tauri', 'tauri.conf.json')
  const config = JSON.parse(fs.readFileSync(tauriConfigPath, 'utf8'))
  return config.version
}

function parseVersion(version) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/)
  if (!match) throw new Error(`Invalid version format: ${version}`)
  return {
    major: parseInt(match[1]),
    minor: parseInt(match[2]),
    patch: parseInt(match[3])
  }
}

function bumpVersion(currentVersion, type) {
  const v = parseVersion(currentVersion)
  
  switch (type) {
    case 'major':
      return `${v.major + 1}.0.0`
    case 'minor':
      return `${v.major}.${v.minor + 1}.0`
    case 'patch':
      return `${v.major}.${v.minor}.${v.patch + 1}`
    default:
      // Assume it's a specific version
      if (/^\d+\.\d+\.\d+$/.test(type)) {
        return type
      }
      throw new Error(`Invalid version type: ${type}. Use: major, minor, patch, or X.Y.Z`)
  }
}

function updateVersion(newVersion) {
  // Update tauri.conf.json
  const tauriConfigPath = path.join(__dirname, '..', 'src-tauri', 'tauri.conf.json')
  const config = JSON.parse(fs.readFileSync(tauriConfigPath, 'utf8'))
  config.version = newVersion
  fs.writeFileSync(tauriConfigPath, JSON.stringify(config, null, 2) + '\n')
  log(`  Updated src-tauri/tauri.conf.json`, 'green')

  // Update Cargo.toml
  const cargoPath = path.join(__dirname, '..', 'src-tauri', 'Cargo.toml')
  let cargoContent = fs.readFileSync(cargoPath, 'utf8')
  cargoContent = cargoContent.replace(/^version = ".*"/m, `version = "${newVersion}"`)
  fs.writeFileSync(cargoPath, cargoContent)
  log(`  Updated src-tauri/Cargo.toml`, 'green')

  // Update package.json
  const packagePath = path.join(__dirname, '..', 'package.json')
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
  packageJson.version = newVersion
  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n')
  log(`  Updated package.json`, 'green')
}

function hasUncommittedChanges() {
  const status = exec('git status --porcelain')
  return status.length > 0
}

function tagExists(tag) {
  const result = exec(`git tag -l "${tag}"`, { ignoreError: true })
  return result === tag
}

async function main() {
  const args = process.argv.slice(2)
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    log('\nPC Monitoring Dockers - Release Script', 'cyan')
    log('━'.repeat(40), 'cyan')
    log('\nUsage:', 'bold')
    log('  node scripts/release.js <version-type>\n')
    log('Version types:', 'bold')
    log('  patch   Bump patch version (0.1.0 -> 0.1.1)')
    log('  minor   Bump minor version (0.1.0 -> 0.2.0)')
    log('  major   Bump major version (0.1.0 -> 1.0.0)')
    log('  X.Y.Z   Set specific version (e.g., 0.2.5)\n')
    log('Examples:', 'bold')
    log('  node scripts/release.js patch')
    log('  node scripts/release.js 1.0.0\n')
    process.exit(0)
  }

  const versionType = args[0]
  const currentVersion = getCurrentVersion()
  
  log('\n🚀 PC Monitoring Dockers - Release Script', 'cyan')
  log('━'.repeat(45), 'cyan')

  // Check for uncommitted changes
  log('\n📋 Checking git status...', 'yellow')
  if (hasUncommittedChanges()) {
    log('  Found uncommitted changes, staging all...', 'yellow')
  }

  // Calculate new version
  const newVersion = bumpVersion(currentVersion, versionType)
  const tag = `v${newVersion}`

  log(`\n📦 Version: ${currentVersion} → ${newVersion}`, 'bold')

  // Check if tag already exists
  if (tagExists(tag)) {
    log(`\n❌ Tag ${tag} already exists!`, 'red')
    log('  Delete it first with: git tag -d ' + tag + ' && git push origin :refs/tags/' + tag, 'yellow')
    process.exit(1)
  }

  // Update version in files
  log('\n📝 Updating version in files...', 'yellow')
  updateVersion(newVersion)

  // Git operations
  log('\n🔧 Git operations...', 'yellow')
  
  exec('git add -A')
  log('  Staged all changes', 'green')

  exec(`git commit -m "release: v${newVersion}"`)
  log(`  Created commit: release: v${newVersion}`, 'green')

  exec(`git tag ${tag}`)
  log(`  Created tag: ${tag}`, 'green')

  // Push to remote
  log('\n🚀 Pushing to GitHub...', 'yellow')
  
  exec('git push origin main')
  log('  Pushed commits to main', 'green')

  exec(`git push origin ${tag}`)
  log(`  Pushed tag ${tag}`, 'green')

  // Success message
  log('\n✅ Release v' + newVersion + ' created successfully!', 'green')
  log('\n📋 Next steps:', 'cyan')
  log('  1. Check GitHub Actions: https://github.com/Alberto02003/PcMonitor-Dockers/actions')
  log('  2. Wait for build to complete (~10-15 min)')
  log('  3. Release will be published automatically\n')
}

main().catch(error => {
  log(`\n❌ Error: ${error.message}`, 'red')
  process.exit(1)
})
