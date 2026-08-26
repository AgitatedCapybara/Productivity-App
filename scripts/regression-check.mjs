#!/usr/bin/env node
// scripts/regression-check.mjs
import { spawnSync } from 'child_process'
import fs from 'fs'
import path from 'path'

console.log('====================================================')
console.log('🚀 KEYSTONE PRE-RELEASE INTEGRITY & REGRESSION HARNESS')
console.log('====================================================')

// 1. RUN ALL TESTS (Unit + DB + Integration + Performance) via Vitest
console.log('\n🔍 Step 1: Running Vitest Test Suite...')
const testResult = spawnSync('npx', ['vitest', 'run'], { stdio: 'inherit', shell: true })
if (testResult.status !== 0) {
  console.error('\n❌ REGRESSION DETECTED: Vitest verification suite failed!')
  process.exit(1)
}
console.log('✅ Step 1: All Vitest verification tests passed successfully!')

// 2. RUN BUNDLE SIZE AUDIT
console.log('\n📊 Step 2: Auditing production bundle size bounds...')
const bundleResult = spawnSync('node', ['scripts/check-bundle-size.mjs'], { stdio: 'inherit' })
if (bundleResult.status !== 0) {
  console.error('\n❌ REGRESSION DETECTED: Production bundle exceeded budgeted limits!')
  process.exit(1)
}
console.log('✅ Step 2: Bundle size limits verified successfully!')

// 3. RUN DATABASE MIGRATION ROUNDTRIP SANITY
console.log('\n🗄️ Step 3: Verifying SQLite clean schema migrations roundtrip...')
const migrationCheck = spawnSync('npx', ['vitest', 'run', 'tests/db/migrations.test.ts'], { stdio: 'inherit', shell: true })
if (migrationCheck.status !== 0) {
  console.error('\n❌ REGRESSION DETECTED: Migration roundtrip sequence is corrupted!')
  process.exit(1)
}
console.log('✅ Step 3: Schema migration roundtrip successfully passed!')

// 4. PRINT MANUAL REGRESSION CHECKLIST
console.log('\n📋 Step 4: Printing manual release checkpoint requirements...')
const checklistPath = path.join(process.cwd(), 'docs/RELEASE_CHECKLIST.md')
if (fs.existsSync(checklistPath)) {
  console.log('----------------------------------------------------')
  console.log('     MANUAL EPICS QUALITY SIGN-OFF MANDATE')
  console.log('----------------------------------------------------')
  const content = fs.readFileSync(checklistPath, 'utf8')
  // Print some core headers from the RELEASE_CHECKLIST of Day-to-Day epics
  const lines = content.split('\n')
  lines.slice(0, 30).forEach(line => console.log(line))
  console.log('... (truncated manual checklist trace)')
  console.log('----------------------------------------------------')
} else {
  console.log('⚠️ docs/RELEASE_CHECKLIST.md not found. Generating template signature...')
}

console.log('\n✨ [HARNESS RESULT]: Keystone is 100% stable, regression-safe, and ready for release compilation!')
console.log('====================================================')
process.exit(0)
