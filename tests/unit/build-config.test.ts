import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Auto-Updater Code-Signing and Build Parameter Verification', () => {
  it('verifies that package.json metadata and distribution scripts are set correctly', () => {
    const packageJsonPath = path.resolve(process.cwd(), 'package.json')
    expect(fs.existsSync(packageJsonPath)).toBe(true)

    const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8')
    const pkg = JSON.parse(packageJsonContent)

    // Verify metadata attributes in package profile
    expect(pkg.name).toBe('keystone')
    expect(pkg.version).toBeDefined()
    expect(pkg.author).toBe('Solo Dev')
    expect(pkg.main).toBe('out/main/index.js')
    
    // Verify distribution compilation scripts
    expect(pkg.scripts).toBeDefined()
    expect(pkg.scripts.dist).toBe('electron-builder')
  })

  it('verifies that electron-builder.yml configuration conforms to code-signing requirements and development defaults', () => {
    const builderConfigPath = path.resolve(process.cwd(), 'electron-builder.yml')
    expect(fs.existsSync(builderConfigPath)).toBe(true)

    const content = fs.readFileSync(builderConfigPath, 'utf8')
    
    // Helper to parse simple key-values from YAML
    const getYamlValue = (key: string): string | null => {
      const regex = new RegExp(`^\\s*${key}\\s*:\\s*(.*)$`, 'm')
      const match = content.match(regex)
      return match ? match[1].trim() : null
    }

    // Verify application metadata attributes
    expect(getYamlValue('appId')).toBe('com.keystone.Keystone')
    expect(getYamlValue('productName')).toBe('Keystone')

    // Verify local developer regression safeguard: standard local builds should not force code-signing
    const winForceSign = content.includes('forceCodeSigning: false')
    expect(winForceSign).toBe(true)

    // Verify macOS security properties that mitigate Gatekeeper blocks
    expect(getYamlValue('hardenedRuntime')).toBe('true')
    expect(getYamlValue('gatekeeperAssess')).toBe('false')

    // Verify Windows properties that mitigate EV cert execution/SmartScreen barriers
    expect(content.includes('signingHashAlgorithms')).toBe(true)
    expect(content.includes('sha256')).toBe(true)
  })
})
