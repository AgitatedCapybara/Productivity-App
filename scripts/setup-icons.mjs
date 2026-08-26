import fs from 'fs'
import path from 'path'

const __dirname = path.dirname(new URL(import.meta.url).pathname)
const rootDir = path.resolve(__dirname, '..')

const srcImagePath = path.join(rootDir, 'src/assets/images/icon_1782764949855.jpg')

function setup() {
  console.log('--- ICON SETUP SCRIPT ---')
  if (!fs.existsSync(srcImagePath)) {
    console.error(`Source image not found at ${srcImagePath}`)
    process.exit(1)
  }

  const assetImgBuffer = fs.readFileSync(srcImagePath)

  // Ensure directories exist
  const assetsDir = path.join(rootDir, 'assets')
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true })
  }

  const resourcesDir = path.join(rootDir, 'resources')
  if (!fs.existsSync(resourcesDir)) {
    fs.mkdirSync(resourcesDir, { recursive: true })
  }

  // Copy/write to target paths
  const targets = [
    path.join(assetsDir, 'icon.png'),
    path.join(assetsDir, 'icon.ico'),
    path.join(resourcesDir, 'icon.png'),
    path.join(resourcesDir, 'iconTemplate.png'),
    path.join(resourcesDir, 'tray-icon.png')
  ]

  for (const target of targets) {
    fs.writeFileSync(target, assetImgBuffer)
    console.log(`Successfully written asset to: ${target}`)
  }
}

setup()
