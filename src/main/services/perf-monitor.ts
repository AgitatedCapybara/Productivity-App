// src/main/services/perf-monitor.ts

export interface QueryLog {
  sql: string
  durationMs: number
  timestamp: string
}

const MAX_LOGS = 200
const ringBuffer: QueryLog[] = []
let totalQueries = 0
let totalDurationMs = 0

export function logPerformance(sql: string, durationMs: number): void {
  // Simple check on setting to avoid overhead if disabled
  // Note: we can import getSetting inline or check configuration
  totalQueries++
  totalDurationMs += durationMs

  const logEntry: QueryLog = {
    sql,
    durationMs,
    timestamp: new Date().toISOString()
  }

  if (ringBuffer.length >= MAX_LOGS) {
    ringBuffer.shift()
  }
  ringBuffer.push(logEntry)
}

export interface PerfStats {
  totalQueries: number
  avgDurationMs: number
  recentLogs: QueryLog[]
  memoryUsage?: {
    rssMb: number
    heapTotalMb: number
    heapUsedMb: number
  }
}

export function getPerfStats(): PerfStats {
  const mem = process.memoryUsage()
  return {
    totalQueries,
    avgDurationMs: totalQueries > 0 ? totalDurationMs / totalQueries : 0,
    recentLogs: [...ringBuffer].reverse(),
    memoryUsage: {
      rssMb: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
      heapTotalMb: Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100,
      heapUsedMb: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
    }
  }
}
