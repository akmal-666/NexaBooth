import { useRef, useState, useCallback, useEffect } from 'react'

interface WebcamOptions {
  width?: number
  height?: number
  facingMode?: 'user' | 'environment'
  mirrored?: boolean
}

interface WebcamState {
  isReady: boolean
  error: string | null
  stream: MediaStream | null
}

export function useWebcam(options: WebcamOptions = {}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [state, setState] = useState<WebcamState>({
    isReady: false,
    error: null,
    stream: null,
  })

  const start = useCallback(async () => {
    try {
      setState(s => ({ ...s, error: null }))
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: options.width ?? 1280 },
          height: { ideal: options.height ?? 720 },
          facingMode: options.facingMode ?? 'user',
        },
        audio: false,
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      setState({ isReady: true, error: null, stream })
    } catch (err) {
      const msg =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access.'
          : err instanceof DOMException && err.name === 'NotFoundError'
          ? 'No camera found on this device.'
          : String(err)
      setState({ isReady: false, error: msg, stream: null })
    }
  }, [options.width, options.height, options.facingMode])

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setState({ isReady: false, error: null, stream: null })
  }, [])

  const capture = useCallback((): string | null => {
    const video = videoRef.current
    if (!video || !video.videoWidth) return null

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    if (options.mirrored !== false) {
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
    }

    ctx.drawImage(video, 0, 0)
    return canvas.toDataURL('image/jpeg', 0.92)
  }, [options.mirrored])

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [])

  return { videoRef, ...state, start, stop, capture }
}
