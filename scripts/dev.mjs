import { spawn, execSync } from 'child_process';
import os from 'os';
import path from 'path';
import fs from 'fs';

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

  try {
    const electronDir = path.join(process.cwd(), 'node_modules', 'electron');
    if (fs.existsSync(electronDir)) {
      const pathTxtFile = path.join(electronDir, 'path.txt');
      
      // Determine default platform executable name
      let platformExe = 'electron';
      if (os.platform() === 'win32') {
        platformExe = 'electron.exe';
      } else if (os.platform() === 'darwin') {
        platformExe = 'Electron.app/Contents/MacOS/Electron';
      }

      // Check what version is requested vs installed
      let localElectronVersion = 'unknown';
      try {
        const localPkg = JSON.parse(fs.readFileSync(path.join(electronDir, 'package.json'), 'utf8'));
        localElectronVersion = localPkg.version || 'unknown';
      } catch (e) {}

      console.log(`[Dev Helper] Detected installed Electron package version: ${localElectronVersion}`);

      // 1. Auto-heal path.txt if it is missing or empty
      if (!fs.existsSync(pathTxtFile) || !fs.readFileSync(pathTxtFile, 'utf8').trim()) {
        console.log(`[Dev Helper] Healing missing node_modules/electron/path.txt with: ${platformExe}`);
        fs.writeFileSync(pathTxtFile, platformExe, 'utf8');
      }

      const localElectronPath = path.join(electronDir, 'dist', platformExe);
      
      // 2. If the executable is entirely missing, try running the install script first, then fall back to PowerShell download/extraction
      if (!fs.existsSync(localElectronPath)) {
        console.log(`[Dev Helper] Executable NOT found at: ${localElectronPath}`);
        console.log(`[Dev Helper] Running 'node node_modules/electron/install.js' to reconstruct...`);
        try {
          // Remove potential skipping environment variables to force a fresh download
          const targetEnv = { ...process.env };
          delete targetEnv.ELECTRON_SKIP_BINARY_DOWNLOAD;
          
          execSync('node node_modules/electron/install.js', { stdio: 'inherit', env: targetEnv });
        } catch (installErr) {
          console.error('[Dev Helper] Running install.js failed:', installErr.message);
        }
      }

      // 3. Fallback: If still missing on Windows, run native PowerShell download and extraction
      if (!fs.existsSync(localElectronPath) && os.platform() === 'win32') {
        try {
          const version = localElectronVersion !== 'unknown' ? localElectronVersion : '32.3.3';
          const arch = os.arch();
          const zipUrl = `https://github.com/electron/electron/releases/download/v${version}/electron-v${version}-win32-${arch}.zip`;
          const tempCacheDir = path.join(process.cwd(), '.electron-cache');
          
          console.log(`\n=============================================================`);
          console.log(`[Dev Helper] [PowerShell Fallback] electron.exe is still missing.`);
          console.log(`[Dev Helper] Attempting native Windows download and extraction for version ${version} (${arch})...`);
          console.log(`=============================================================\n`);

          if (!fs.existsSync(tempCacheDir)) {
            fs.mkdirSync(tempCacheDir, { recursive: true });
          }

          const zipPath = path.join(tempCacheDir, `electron-v${version}-win32-${arch}.zip`);
          const distPath = path.join(electronDir, 'dist');

          // Check if cached zip already exists and is valid (> 10MB)
          let needsDownload = true;
          if (fs.existsSync(zipPath)) {
            const sizeInBytes = fs.statSync(zipPath).size;
            if (sizeInBytes > 10 * 1024 * 1024) {
              needsDownload = false;
              console.log(`[Dev Helper] Found a valid cached ZIP at: ${zipPath}`);
            } else {
              console.log(`[Dev Helper] Cached ZIP at ${zipPath} is corrupted or incomplete. Redownloading...`);
              fs.unlinkSync(zipPath);
            }
          }

          if (needsDownload) {
            console.log(`[Dev Helper] Downloading Electron ZIP from: ${zipUrl}`);
            const downloadCmd = `powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '${zipUrl}' -OutFile '${zipPath}' -UserAgent 'Mozilla/5.0'"`;
            execSync(downloadCmd, { stdio: 'inherit' });
          }

          // Ensure dist folder is completely clean to prevent write/merge collisions
          if (fs.existsSync(distPath)) {
            console.log(`[Dev Helper] Cleaning existing dist folder at: ${distPath}`);
            try {
              fs.rmSync(distPath, { recursive: true, force: true });
            } catch (rmErr) {
              console.warn('[Dev Helper] Non-blocking warning: Failed to fully delete dist folder:', rmErr.message);
            }
          }
          fs.mkdirSync(distPath, { recursive: true });

          console.log(`[Dev Helper] Extracting ZIP via Windows Expand-Archive to ${distPath}...`);
          const extractCmd = `powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${distPath}' -Force"`;
          execSync(extractCmd, { stdio: 'inherit' });

          // Write/heal path.txt and version file to avoid Electron re-install checks
          fs.writeFileSync(path.join(electronDir, 'path.txt'), 'electron.exe', 'utf8');
          fs.writeFileSync(path.join(distPath, 'version'), `v${version}`, 'utf8');

          console.log(`[Dev Helper] Extraction completed.`);
        } catch (fallbackErr) {
          console.error('[Dev Helper] PowerShell Fallback failed:', fallbackErr.message);
        }
      }

      // 4. Check again after install script and fallback
      if (!fs.existsSync(localElectronPath)) {
        console.log('\n=============================================================');
        console.log('❌ CRITICAL DEV SERVER ERROR: electron.exe IS STILL MISSING!');
        console.log(`Path checked: ${localElectronPath}`);
        console.log('-------------------------------------------------------------');
        
        // Debug node_modules/electron/dist contents
        const distFolder = path.join(electronDir, 'dist');
        if (fs.existsSync(distFolder)) {
          const files = fs.readdirSync(distFolder);
          console.log(`Contents of node_modules/electron/dist/ (Count: ${files.length}):`);
          console.log(files.slice(0, 10).join(', ') + (files.length > 10 ? '...' : ''));
        } else {
          console.log('The folder node_modules/electron/dist/ does not exist at all!');
        }
        
        console.log('\nREASON for this on Windows ARM64:');
        console.log('1. A corrupted download was cached by the Electron downloader.');
        console.log('2. Windows Defender or an Antivirus quarantined/blocked the ARM64 electron.exe binary.');
        console.log('3. Stale local electron instances are locking directory structures.');
        
        console.log('\nHOW TO RESOLVE (Run these exact commands in your local PowerShell):');
        console.log('--------------------------------------------------------------');
        console.log('# Step A: Kill any hanging Electron/Node processes');
        console.log('Stop-Process -Name "electron", "node" -ErrorAction SilentlyContinue');
        console.log('\n# Step B: Clear the corrupted Electron local download cache folder');
        console.log('Remove-Item -Recurse -Force $env:LOCALAPPDATA\\electron\\Cache');
        console.log('\n# Step C: Re-run the installation with a new localized cache folder to bypass system cache');
        console.log('$env:electron_config_cache = "$pwd\\.electron-cache"');
        console.log('node node_modules/electron/install.js');
        console.log('\n# Step D: Verify electron.exe now exists in dist:');
        console.log('Test-Path node_modules\\electron\\dist\\electron.exe');
        console.log('=============================================================\n');
      } else {
        // Set ELECTRON_EXEC_PATH explicitly as a secondary fallback
        process.env.ELECTRON_EXEC_PATH = localElectronPath;
        console.log(`[Dev Helper] Found electron.exe! Setting ELECTRON_EXEC_PATH to: ${localElectronPath}`);
      }
    }
  } catch (err) {
    console.warn('[Dev Helper] Failed to check/heal Electron paths:', err.message);
  }

  const child = spawn('npx', ['electron-vite', 'dev'], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env }
  });
  child.on('exit', code => process.exit(code));
}

