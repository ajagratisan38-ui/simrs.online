const fs = require('fs')
const path = require('path')

function generateSvgAtSize(size) {
  const r = Math.round(size * 0.1875)
  const crossW = Math.round(size * 0.234)
  const crossH = Math.round(size * 0.625)
  const crossX = Math.round((size - crossW) / 2)
  const crossY = Math.round((size - crossH) / 2)
  const hCrossX = Math.round((size - crossH) / 2)
  const hCrossY = Math.round((size - crossW) / 2)
  const cr = Math.round(size * 0.03)

  const pMidY = Math.round(size / 2)
  const pLeft = Math.round(size * 0.265)
  const pRight = Math.round(size * 0.735)
  const pAmp = Math.round(size * 0.094)
  const pSeg = Math.round(size * 0.047)
  const pWid = Math.round(size * 0.0625)
  const sw = Math.max(Math.round(size * 0.023), 1)

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none">
  <rect width="${size}" height="${size}" rx="${r}" fill="#0d9488"/>
  <rect x="${crossX}" y="${crossY}" width="${crossW}" height="${crossH}" rx="${cr}" fill="white"/>
  <rect x="${hCrossX}" y="${hCrossY}" width="${crossH}" height="${crossW}" rx="${cr}" fill="white"/>
  <path d="M${pLeft} ${pMidY} h${pWid} l${pSeg}-${pAmp} ${pSeg*2} ${pAmp*2} ${pSeg*2}-${pAmp*2} ${pSeg} ${pAmp} h${pWid}" 
        stroke="#0d9488" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>`
}

const iconsDir = path.join(__dirname, '..', 'public', 'icons')
fs.mkdirSync(iconsDir, { recursive: true })

const sizes = [16, 32, 48, 72, 96, 128, 144, 152, 180, 192, 384, 512]

for (const size of sizes) {
  const svg = generateSvgAtSize(size)
  fs.writeFileSync(path.join(iconsDir, `icon-${size}.svg`), svg)
  console.log(`Generated icon-${size}.svg`)
}

console.log('Done! Icons generated as SVG.')
console.log('For production, convert these to PNG using a tool like sharp, Inkscape, or an online converter.')
