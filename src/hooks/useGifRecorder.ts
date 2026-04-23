import { useRef, useState, useCallback } from 'react'

export interface GifOptions {
  fps?: number
  quality?: number
  boomerang?: boolean
  maxFrames?: number
}

function encodeGif(
  frames: ImageData[],
  delay: number
): Uint8Array {
  // Minimal GIF89a encoder (palette-quantized, 256 colors)
  const w = frames[0].width
  const h = frames[0].height

  function writeHeader(buf: number[]) {
    // GIF89a
    ;[0x47, 0x49, 0x46, 0x38, 0x39, 0x61].forEach(b => buf.push(b))
  }

  function writeUint16LE(buf: number[], v: number) {
    buf.push(v & 0xff, (v >> 8) & 0xff)
  }

  function buildPalette(data: Uint8ClampedArray): Uint8Array {
    // Median-cut approximation: sample every Nth pixel
    const palette = new Uint8Array(256 * 3)
    const step = Math.max(1, Math.floor(data.length / 4 / 512))
    const samples: number[][] = []
    for (let i = 0; i < data.length / 4; i += step) {
      samples.push([data[i * 4], data[i * 4 + 1], data[i * 4 + 2]])
    }
    // Sort and pick 255 evenly spaced colors + black
    samples.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2])
    const interval = Math.max(1, Math.floor(samples.length / 255))
    for (let i = 0; i < 255; i++) {
      const s = samples[Math.min(i * interval, samples.length - 1)]
      palette[i * 3] = s[0]
      palette[i * 3 + 1] = s[1]
      palette[i * 3 + 2] = s[2]
    }
    return palette
  }

  function quantizePixels(data: Uint8ClampedArray, palette: Uint8Array): Uint8Array {
    const pixels = new Uint8Array(data.length / 4)
    for (let i = 0; i < pixels.length; i++) {
      const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2]
      let best = 0, bestDist = Infinity
      for (let p = 0; p < 256; p++) {
        const dr = r - palette[p * 3], dg = g - palette[p * 3 + 1], db = b - palette[p * 3 + 2]
        const d = dr * dr + dg * dg + db * db
        if (d < bestDist) { bestDist = d; best = p }
        if (d === 0) break
      }
      pixels[i] = best
    }
    return pixels
  }

  function lzwEncode(pixels: Uint8Array, minCodeSize: number): Uint8Array {
    const out: number[] = []
    const clearCode = 1 << minCodeSize
    const eofCode = clearCode + 1
    let codeSize = minCodeSize + 1
    let nextCode = eofCode + 1
    const table = new Map<string, number>()

    function reset() {
      table.clear()
      for (let i = 0; i < clearCode; i++) table.set(String(i), i)
      codeSize = minCodeSize + 1
      nextCode = eofCode + 1
    }

    let buf = 0, bufBits = 0
    const bytes: number[] = []

    function writeCode(code: number) {
      buf |= code << bufBits
      bufBits += codeSize
      while (bufBits >= 8) { bytes.push(buf & 0xff); buf >>= 8; bufBits -= 8 }
    }

    function flushBytes() {
      while (bytes.length) {
        const chunk = bytes.splice(0, 255)
        out.push(chunk.length, ...chunk)
      }
    }

    reset()
    writeCode(clearCode)

    let idx = 0
    let str = String(pixels[idx++])
    while (idx < pixels.length) {
      const c = String(pixels[idx++])
      const key = str + ',' + c
      if (table.has(key)) {
        str = key
      } else {
        writeCode(table.get(str)!)
        if (nextCode < 4096) {
          table.set(key, nextCode++)
          if (nextCode > (1 << codeSize) && codeSize < 12) codeSize++
        } else {
          writeCode(clearCode)
          reset()
        }
        str = c
      }
    }
    writeCode(table.get(str)!)
    writeCode(eofCode)
    if (bufBits > 0) bytes.push(buf & 0xff)
    flushBytes()
    out.push(0) // block terminator
    return new Uint8Array(out)
  }

  const palette = buildPalette(frames[0].data)
  const buf: number[] = []

  writeHeader(buf)
  writeUint16LE(buf, w)
  writeUint16LE(buf, h)
  buf.push(0xf7, 0, 0) // global color table, 256 colors, background 0
  for (let i = 0; i < 256 * 3; i++) buf.push(palette[i])

  // Netscape loop extension
  buf.push(0x21, 0xff, 0x0b,
    0x4e, 0x45, 0x54, 0x53, 0x43, 0x41, 0x50, 0x45, 0x32, 0x2e, 0x30,
    0x03, 0x01, 0x00, 0x00, 0x00)

  for (const frame of frames) {
    const pixels = quantizePixels(frame.data, palette)
    const lzw = lzwEncode(pixels, 8)

    // Graphic control extension (delay)
    buf.push(0x21, 0xf9, 0x04, 0x04)
    writeUint16LE(buf, Math.round(delay / 10))
    buf.push(0x00, 0x00)

    // Image descriptor
    buf.push(0x2c)
    writeUint16LE(buf, 0); writeUint16LE(buf, 0)
    writeUint16LE(buf, w); writeUint16LE(buf, h)
    buf.push(0x00)

    // Image data
    buf.push(0x08, ...lzw)
  }

  buf.push(0x3b) // GIF trailer
  return new Uint8Array(buf)
}

export function useGifRecorder(opts: GifOptions = {}) {
  const framesRef = useRef<ImageData[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [progress, setProgress] = useState(0)

  const startRecording = useCallback(
    (getFrame: () => ImageData | null, totalMs: number) => {
      framesRef.current = []
      setProgress(0)
      setIsRecording(true)

      const fps = opts.fps ?? 8
      const maxFrames = opts.maxFrames ?? Math.round(totalMs / 1000 * fps)
      let captured = 0

      intervalRef.current = setInterval(() => {
        const frame = getFrame()
        if (frame) {
          framesRef.current.push(frame)
          captured++
          setProgress(Math.round((captured / maxFrames) * 100))
          if (captured >= maxFrames) stopCapture()
        }
      }, 1000 / fps)

      function stopCapture() {
        if (intervalRef.current) clearInterval(intervalRef.current)
      }
    },
    [opts.fps, opts.maxFrames]
  )

  const stopRecording = useCallback((): string | null => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setIsRecording(false)

    let frames = framesRef.current
    if (!frames.length) return null

    if (opts.boomerang) {
      frames = [...frames, ...[...frames].reverse().slice(1)]
    }

    const delay = Math.round(1000 / (opts.fps ?? 8))
    const encoded = encodeGif(frames, delay)
    const blob = new Blob([encoded.buffer as ArrayBuffer], { type: 'image/gif' })
    return URL.createObjectURL(blob)
  }, [opts.fps, opts.boomerang])

  const reset = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    framesRef.current = []
    setIsRecording(false)
    setProgress(0)
  }, [])

  return { isRecording, progress, startRecording, stopRecording, reset }
}
