import type { FrameLayout, PhotoFilter, LayoutConfig } from '../types'
import { LAYOUT_CONFIGS, FILTER_CSS } from '../types'
import { loadImage } from './utils'

interface RenderOptions {
  filter?: PhotoFilter
  borderColor?: string
  accentColor?: string
  /** Optional text to emboss at the bottom of the composite */
  footerText?: string
}

export async function renderComposite(
  photos: string[],
  layout: FrameLayout,
  opts: RenderOptions = {}
): Promise<string> {
  const cfg: LayoutConfig = LAYOUT_CONFIGS[layout]
  const canvas = document.createElement('canvas')
  canvas.width = cfg.canvasWidth
  canvas.height = cfg.canvasHeight
  const ctx = canvas.getContext('2d')!

  // Background / border
  ctx.fillStyle = opts.borderColor ?? '#FFFFFF'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Draw each photo slot
  for (let i = 0; i < cfg.slots.length; i++) {
    const src = photos[i]
    if (!src) continue
    const slot = cfg.slots[i]

    const img = await loadImage(src)

    // Apply CSS filter via OffscreenCanvas trick using drawImage + globalCompositeOperation
    ctx.save()

    // Clip to slot rectangle with rounded corners
    roundRect(ctx, slot.x, slot.y, slot.w, slot.h, 12)
    ctx.clip()

    // Cover-fit the image into the slot
    const { sx, sy, sw, sh } = coverFit(img.naturalWidth, img.naturalHeight, slot.w, slot.h)
    ctx.drawImage(img, sx, sy, sw, sh, slot.x, slot.y, slot.w, slot.h)

    ctx.restore()
  }

  // Footer text
  if (opts.footerText) {
    const fSize = Math.round(cfg.canvasWidth * 0.022)
    ctx.font = `600 ${fSize}px Inter, sans-serif`
    ctx.fillStyle = opts.accentColor ?? '#1E2A6E'
    ctx.textAlign = 'center'
    ctx.fillText(opts.footerText, canvas.width / 2, canvas.height - fSize)
  }

  // Apply filter post-render if needed (simulated via overlay blend)
  if (opts.filter && opts.filter !== 'normal') {
    applyCanvasFilter(ctx, canvas.width, canvas.height, opts.filter)
  }

  return canvas.toDataURL('image/jpeg', 0.95)
}

function applyCanvasFilter(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  filter: PhotoFilter
): void {
  const imgData = ctx.getImageData(0, 0, w, h)
  const d = imgData.data

  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2]

    if (filter === 'grayscale') {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b
      d[i] = d[i + 1] = d[i + 2] = gray
    } else if (filter === 'sepia') {
      d[i]     = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189)
      d[i + 1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168)
      d[i + 2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131)
    } else if (filter === 'warm') {
      d[i]     = Math.min(255, r * 1.1)
      d[i + 2] = Math.max(0,   b * 0.9)
    } else if (filter === 'cool') {
      d[i]     = Math.max(0,   r * 0.9)
      d[i + 2] = Math.min(255, b * 1.1)
    } else if (filter === 'fade') {
      d[i]     = r * 0.8 + 40
      d[i + 1] = g * 0.8 + 40
      d[i + 2] = b * 0.8 + 40
    } else if (filter === 'vivid') {
      d[i]     = Math.min(255, (r - 128) * 1.3 + 128)
      d[i + 1] = Math.min(255, (g - 128) * 1.3 + 128)
      d[i + 2] = Math.min(255, (b - 128) * 1.3 + 128)
    }
  }

  ctx.putImageData(imgData, 0, 0)
}

// Cover-fit: returns source crop coords so image fills dest without distortion
function coverFit(
  iw: number, ih: number,
  dw: number, dh: number
): { sx: number; sy: number; sw: number; sh: number } {
  const scale = Math.max(dw / iw, dh / ih)
  const sw = dw / scale
  const sh = dh / scale
  return { sx: (iw - sw) / 2, sy: (ih - sh) / 2, sw, sh }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  r: number
): void {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

export function printImage(dataUrl: string): void {
  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(`<!doctype html><html><head>
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { display:flex; justify-content:center; align-items:center; min-height:100vh; background:#fff; }
      img { max-width:100%; max-height:100vh; object-fit:contain; }
      @media print { @page { margin:0; } body { background:#fff; } }
    </style>
  </head><body>
    <img src="${dataUrl}" onload="window.print();window.close();" />
  </body></html>`)
  win.document.close()
}

export { FILTER_CSS }
