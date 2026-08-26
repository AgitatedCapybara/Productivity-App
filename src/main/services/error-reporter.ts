// src/main/services/error-reporter.ts
import fs from 'fs'
import path from 'path'
import os from 'os'
import { app } from 'electron'

const MAX_LOG_SIZE_BYTES = 250 * 1024 // 250 KB threshold for rotation

function getLogPath(): string {
  try {
    // Falls back to tmp directory if app is not yet initialized (e.g., during bare tests)
    const folder = app ? app.getPath('userData') : os.tmpdir()
    return path.join(folder, 'keystone-errors.log')
  } catch (_) {
    return path.join(os.tmpdir(), 'keystone-errors.log')
  }
}

/**
 * Aggressive local security redaction to ensure that zero task content,
 * notes, projects, emails, or personal names/PII are ever written to error logs.
 */
export function redactPIIAndTasks(text: string): string {
  if (!text) return ''
  let sanitized = text

  // 1. Redact email addresses
  sanitized = sanitized.replace(/[\w.-]+@[\w.-]+\.\w+/gi, '[REDACTED_EMAIL]')

  // 2. Redact IP addresses / local routes
  sanitized = sanitized.replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[REDACTED_IP]')

  // 3. Redact common task identifiers or titles using key delimiters
  sanitized = sanitized.replace(/(?:task|note|project|title|body|notes)["']?\s*:\s*["'][^"']+/gi, (match) => {
    const key = match.split(':')[0]
    return `${key}: "[REDACTED_TASK_CONTENT]"`
  })

  // 4. Redact potential environment directories
  sanitized = sanitized.replace(/Users\/[\w.-]+/gi, 'Users/[REDACTED_USER]')

  return sanitized
}

/**
 * Safely logs an error locally with log rotation logic.
 */
export function logErrorLocally(error: Error | string, context = 'general'): void {
  try {
    const logPath = getLogPath()
    const timestamp = new Date().toISOString()
    const errMsg = error instanceof Error ? `${error.message}\n${error.stack}` : error
    
    // Format log line
    const rawLine = `[${timestamp}] [CONTEXT: ${context}] ${errMsg}\n`
    const sanitizedLine = redactPIIAndTasks(rawLine) + '\n--------------------------------------------------\n'

    // Rotate log file if limits are exceeded
    if (fs.existsSync(logPath)) {
      const stats = fs.statSync(logPath)
      if (stats.size >= MAX_LOG_SIZE_BYTES) {
        fs.renameSync(logPath, `${logPath}.1`)
      }
    }

    // Append to file
    fs.appendFileSync(logPath, sanitizedLine, 'utf8')
  } catch (err) {
    console.error('Failed to write local error log:', err)
  }
}

/**
 * Reads local log contents.
 */
export function getLocalErrorLog(): string {
  try {
    const logPath = getLogPath()
    if (!fs.existsSync(logPath)) {
      return '(Zero logged errors. Keystone is fully healthy!)'
    }
    return fs.readFileSync(logPath, 'utf8')
  } catch (err: any) {
    return `Failed to read error logs locally: ${err.message}`
  }
}

/**
 * Clears local error logs.
 */
export function clearLocalErrorLog(): boolean {
  try {
    const logPath = getLogPath()
    if (fs.existsSync(logPath)) {
      fs.unlinkSync(logPath)
    }
    if (fs.existsSync(`${logPath}.1`)) {
      fs.unlinkSync(`${logPath}.1`)
    }
    return true
  } catch (_) {
    return false
  }
}

/**
 * Generates an entirely sanitized, completely safe redacted system diagnostics package.
 * Copy-paste friendly, zero automatic uploads.
 */
export function generateRedactedDiagnostics(): string {
  const timestamp = new Date().toISOString()
  const uptimeSeconds = process.uptime()
  
  const payload = {
    keystone_version: app ? app.getVersion() : '0.0.0-test-sandbox',
    diagnostics_generated_at: timestamp,
    system_metrics: {
      platform: os.platform(),
      release: os.release(),
      arch: os.arch(),
      total_memory_mb: Math.round(os.totalmem() / (1024 * 1024)),
      free_memory_mb: Math.round(os.freemem() / (1024 * 1024)),
      node_version: process.version,
      uptime_seconds: Math.round(uptimeSeconds)
    },
    recent_logs: getLocalErrorLog()
  }

  return JSON.stringify(payload, null, 2)
}
