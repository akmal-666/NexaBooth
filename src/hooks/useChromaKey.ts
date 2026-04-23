import { useRef, useCallback, useEffect, useState } from 'react'

export type ChromaColor = 'green' | 'blue' | 'none'

export interface ChromaKeyOptions {
  color: ChromaColor
  threshold?: number   // 0-255, default 80
  spill?: number       // spill suppression 0-1, default 0.3
  background?: string  // image URL or CSS gradient
}

export function useChromaKey(
  videoRef: React.RefObject<HTMLVideoElement>,
  options: ChromaKeyOptions
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const bgImgRef = useRef<HTMLImageElement | null>(null)
  const rafRef = useRef<number>(0)
  const [active, setActive] = useState(false)
  const optsRef = useRef(options)

  useEffect(() => { optsRef.current = options }, [options])

  // Preload background image
  useEffect(() => {
    const bg = options.background
    if (!bg || bg.startsWith('linear-') || bg.startsWith('radial-')) {
      bgImgRef.current = null
      return
    }
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = bg
    img.onload = () => { bgImgRef.current = img }
  }, [options.background])

  const drawLoop = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d', { willReadFrequently: true })
    if (!video || !canvas || !ctx || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(drawLoop)
      return
    }

    const w = video.videoWidth || canvas.width
    const h = video.videoHeight || canvas.height
    if (canvas.width !== w) canvas.width = w
    if (canvas.height !== h) canvas.height = h

    const { color, threshold = 80, spill = 0.3 } = optsRef.current

    if (color === 'none') {
      ctx.drawImage(video, 0, 0, w, h)
      rafRef.current = requestAnimationFrame(drawLoop)
      return
    }

    ctx.drawImage(video, 0, 0, w, h)
    const imageData = ctx.getImageData(0, 0, w, h)
    const d = imageData.data

    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2]

      let keyness = 0
      if (color === 'green') {
        // Green channel dominance
        keyness = g - Math.max(r, b)
      } else if (color === 'blue') {
        keyness = b - Math.max(r, g)
      }

      if (keyness > threshold * 0.5) {
        const alpha = Math.max(0, 1 - keyness / threshold)
        d[i + 3] = Math.round(alpha * 255)

        // Spill suppression: desaturate green/blue channel
        if (spill > 0 && keyness > 0) {
          if (color === 'green') d[i + 1] = Math.round(d[i + 1] * (1 - spill) + Math.max(r, b) * spill)
          if (color === 'blue')  d[i + 2] = Math.round(d[i + 2] * (1 - spill) + Math.max(r, g) * spill)
        }
      }
    }

    ctx.putImageData(imageData, 0, 0)

    // Draw background behind the keyed video
    const bg = optsRef.current.background
    if (bg) {
      ctx.globalCompositeOperation = 'destination-over'
      if (bgImgRef.current) {
        ctx.drawImage(bgImgRef.current, 0, 0, w, h)
      } else if (bg.startsWith('linear-') || bg.startsWith('radial-')) {
        // Parse CSS gradient not possible; fill solid fallback
        ctx.fillStyle = '#1E2A6E'
        ctx.fillRect(0, 0, w, h)
      }
      ctx.globalCompositeOperation = 'source-over'
    }

    rafRef.current = requestAnimationFrame(drawLoop)
  }, [videoRef])

  const enable = useCallback(() => {
    setActive(true)
    rafRef.current = requestAnimationFrame(drawLoop)
  }, [drawLoop])

  const disable = useCallback(() => {
    setActive(false)
    cancelAnimationFrame(rafRef.current)
  }, [])

  /** Capture current canvas frame as data URL */
  const capture = useCallback((): string | null => {
    return canvasRef.current?.toDataURL('image/jpeg', 0.92) ?? null
  }, [])

  /** Get raw ImageData for GIF encoding */
  const getImageData = useCallback((): ImageData | null => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d', { willReadFrequently: true })
    if (!canvas || !ctx) return null
    return ctx.getImageData(0, 0, canvas.width, canvas.height)
  }, [])

  useEffect(() => () => { cancelAnimationFrame(rafRef.current) }, [])

  return { canvasRef, active, enable, disable, capture, getImageData }
}
