import { spawn } from 'child_process';
import os from 'os';
import path from 'path';

// AI Studio sets this flag
const isPreview = process.env.DISABLE_HMR === 'true';

if (isPreview) {
  console.log('Running web preview for AI Studio...');
  // Ensure we set host 0.0.0.0 and port 3000 for preview
  const child = spawn('npx', ['vite', 'serve', '--config', 'vite.config.ts'], {
    stdio: 'inherit',
    shell: true
  });
  child.on('exit', code => process.exit(code));
} else {
  console.log('Running full Electron dev server...');
  const child = spawn('npx', ['electron-vite', 'dev'], {
    stdio: 'inherit',
    shell: true
  });
  child.on('exit', code => process.exit(code));
}
