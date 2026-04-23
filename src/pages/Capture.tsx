import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Camera, RotateCcw, CheckCircle,
  FlipHorizontal, Scissors, Eye, EyeOff,
} from 'lucide-react'
import type { Session } from '../types'
import { getSession, uploadPhoto } from '../lib/api'
import { useWebcam } from '../hooks/useWebcam'
import { useCountdown } from '../hooks/useCountdown'
import { useGifRecorder } from '../hooks/useGifRecorder'
import { useVideoRecorder } from '../hooks/useVideoRecorder'
import { useChromaKey, type ChromaColor } from '../hooks/useChromaKey'
import ModeSelector, { type CaptureMode } from '../components/ModeSelector'
import BackgroundPicker, { VIRTUAL_BACKGROUNDS, type VirtualBg } from '../components/BackgroundPicker'
import Spinner from '../components/Spinner'
import { sleep } from '../lib/utils'

export default function Capture() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()

  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [mirrored, setMirrored] = useState(true)
  const [mode, setMode] = useState<CaptureMode>('photo')
  const [chromaColor, setChromaColor] = useState<ChromaColor>('none')
  const [selectedBg, setSelectedBg] = useState<VirtualBg>(VIRTUAL_BACKGROUNDS[0])
  const [showBgPicker, setShowBgPicker] = useState(false)

  const [photos, setPhotos] = useState<(string | null)[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [flashing, setFlashing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const uploadedRef = useRef<Set<number>>(new Set())

  const webcam = useWebcam({ mirrored, width: 1280, height: 720 })
  const gifRec = useGifRecorder({ fps: 8, boomerang: mode === 'boomerang', maxFrames: 24 })
  const vidRec = useVideoRecorder()

  const chroma = useChromaKey(webcam.videoRef, {
    color: chromaColor,
    background: selectedBg.value,
    threshold: 80,
    spill: 0.3,
  })

  /* ── helpers ─────────────────────────────────────────────────────────── */
  const captureFrame = useCallback((): string | null => {
    if (chroma.active) return chroma.capture()
    return webcam.capture()
  }, [chroma, webcam])

  const getImageData = useCallback(() => {
    if (chroma.active) return chroma.getImageData()
    const video = webcam.videoRef.current
    if (!video) return null
    const c = document.createElement('canvas')
    c.width = video.videoWidth; c.height = video.videoHeight
    const ctx = c.getContext('2d', { willReadFrequently: true })!
    if (mirrored) { ctx.translate(c.width, 0); ctx.scale(-1, 1) }
    ctx.drawImage(video, 0, 0)
    return ctx.getImageData(0, 0, c.width, c.height)
  }, [chroma, webcam.videoRef, mirrored])

  /* ── photo capture ───────────────────────────────────────────────────── */
  const handlePhotoCapture = useCallback(async () => {
    const dataUrl = captureFrame()
    if (!dataUrl || !sessionId) return

    setFlashing(true)
    await sleep(150)
    setFlashing(false)

    setPhotos(prev => {
      const next = [...prev]
      next[currentIndex] = dataUrl
      return next
    })

    if (!uploadedRef.current.has(currentIndex)) {
      uploadedRef.current.add(currentIndex)
      uploadPhoto(sessionId, currentIndex, dataUrl).catch(() =>
        uploadedRef.current.delete(currentIndex)
      )
    }

    if (session && currentIndex < (session.photo_count ?? 1) - 1) {
      setCurrentIndex(i => i + 1)
    }
  }, [captureFrame, sessionId, currentIndex, session])

  /* ── GIF / boomerang capture ─────────────────────────────────────────── */
  const handleGifStart = useCallback(() => {
    const totalMs = (mode === 'boomerang' ? 1500 : 2500)
    gifRec.startRecording(
      () => getImageData(),
      totalMs
    )
    setTimeout(async () => {
      const url = gifRec.stopRecording()
      if (!url || !sessionId) return

      setFlashing(true)
      await sleep(150)
      setFlashing(false)

      setPhotos(prev => {
        const next = [...prev]
        next[currentIndex] = url
        return next
      })

      uploadPhoto(sessionId, currentIndex, url).catch(() => {})
      if (session && currentIndex < (session.photo_count ?? 1) - 1) {
        setCurrentIndex(i => i + 1)
      }
    }, totalMs + 100)
  }, [gifRec, getImageData, mode, sessionId, currentIndex, session])

  /* ── video capture ───────────────────────────────────────────────────── */
  const handleVideoStart = useCallback(() => {
    if (!webcam.stream) return
    vidRec.startRecording(webcam.stream, 15)
  }, [webcam.stream, vidRec])

  const handleVideoStop = useCallback(async () => {
    const url = await vidRec.stopRecording()
    if (!url || !sessionId) return

    setPhotos(prev => {
      const next = [...prev]
      next[currentIndex] = url
      return next
    })
    uploadPhoto(sessionId, currentIndex, url).catch(() => {})
    if (session && currentIndex < (session.photo_count ?? 1) - 1) {
      setCurrentIndex(i => i + 1)
    }
  }, [vidRec, sessionId, currentIndex, session])

  const countdown = useCountdown(3, { onComplete: handlePhotoCapture })

  /* ── session load ────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!sessionId) return
    getSession(sessionId)
      .then(s => {
        if (s.payment_status !== 'paid' && s.status !== 'capturing') {
          navigate(`/payment/${sessionId}`, { replace: true })
          return
        }
        setSession(s)
        setPhotos(Array(s.photo_count).fill(null))
      })
      .catch(() => setError('Session not found'))
      .finally(() => setLoading(false))
  }, [sessionId, navigate])

  useEffect(() => {
    if (!loading && session) webcam.start()
    return () => webcam.stop()
  }, [loading]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── chroma sync ─────────────────────────────────────────────────────── */
  useEffect(() => {
    if (chromaColor !== 'none') chroma.enable()
    else chroma.disable()
  }, [chromaColor]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── done flow ───────────────────────────────────────────────────────── */
  async function handleDone() {
    if (!sessionId || !session) return
    setUploading(true)
    for (let i = 0; i < photos.length; i++) {
      if (photos[i] && !uploadedRef.current.has(i)) {
        await uploadPhoto(sessionId, i, photos[i]!)
        uploadedRef.current.add(i)
      }
    }
    navigate(`/preview/${sessionId}`)
  }

  function handleRetake(index: number) {
    setCurrentIndex(index)
    setPhotos(prev => { const n = [...prev]; n[index] = null; return n })
    uploadedRef.current.delete(index)
  }

  /* ── render guards ───────────────────────────────────────────────────── */
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <Spinner size="lg" className="border-white/30 border-t-white" />
    </div>
  )

  if (error || !session) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black gap-4 px-6">
      <p className="text-white/70 text-center">{error || 'Session not found.'}</p>
      <button onClick={() => navigate('/frames')} className="btn-primary">Back to Frames</button>
    </div>
  )

  const allCaptured = photos.every(Boolean)
  const isGifMode = mode === 'gif' || mode === 'boomerang'
  const isVideoMode = mode === 'video'

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 pt-10 pb-3 gap-2">
        <button onClick={() => navigate(-1)}
          className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition">
          <ArrowLeft size={20} />
        </button>
        <div className="text-center flex-1">
          <p className="text-white font-semibold text-sm">
            {isVideoMode
              ? `Video — ${vidRec.elapsed}s / 15s`
              : `Photo ${Math.min(currentIndex + 1, session.photo_count ?? 1)} of ${session.photo_count ?? 1}`}
          </p>
          <p className="text-white/40 text-xs">{session.frame_name}</p>
        </div>
        <button onClick={() => setMirrored(m => !m)}
          className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition">
          <FlipHorizontal size={20} />
        </button>
      </div>

      {/* ── Mode selector ── */}
      <div className="px-4 pb-2">
        <ModeSelector value={mode} onChange={m => { setMode(m); gifRec.reset(); vidRec.reset() }} />
      </div>

      {/* ── Camera view ── */}
      <div className="relative flex-1 mx-4 rounded-3xl overflow-hidden bg-zinc-900 min-h-0">
        {webcam.error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <Camera size={48} className="text-white/30" />
            <p className="text-white/70 text-sm">{webcam.error}</p>
            <button onClick={webcam.start} className="btn-primary mt-2">Retry</button>
          </div>
        ) : (
          <>
            {/* Raw video (shown when chroma inactive) */}
            <video
              ref={webcam.videoRef}
              className={`absolute inset-0 w-full h-full object-cover ${chroma.active ? 'opacity-0' : 'opacity-100'}`}
              style={{ transform: mirrored ? 'scaleX(-1)' : 'none' }}
              playsInline muted
            />

            {/* Chroma-keyed canvas (shown when chroma active) */}
            <canvas
              ref={chroma.canvasRef}
              className={`absolute inset-0 w-full h-full object-cover ${chroma.active ? 'opacity-100' : 'opacity-0'}`}
              style={{ transform: mirrored ? 'scaleX(-1)' : 'none' }}
            />

            {/* Countdown overlay */}
            {countdown.running && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <span key={countdown.remaining} className="text-white font-black animate-countdown"
                  style={{ fontSize: '7rem', lineHeight: 1 }}>
                  {countdown.remaining}
                </span>
              </div>
            )}

            {/* Video timer */}
            {vidRec.isRecording && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2
                              bg-red-600 text-white px-4 py-1.5 rounded-full text-sm font-bold">
                <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                {vidRec.elapsed}s / 15s
              </div>
            )}

            {/* GIF progress */}
            {gifRec.isRecording && (
              <div className="absolute inset-x-4 bottom-4">
                <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-accent-500 rounded-full transition-all"
                    style={{ width: `${gifRec.progress}%` }} />
                </div>
                <p className="text-white/70 text-xs text-center mt-1">
                  {mode === 'boomerang' ? 'Recording boomerang…' : 'Recording GIF…'}
                </p>
              </div>
            )}

            {/* Flash */}
            {flashing && (
              <div className="absolute inset-0 bg-white animate-flash pointer-events-none" />
            )}

            {/* Grid overlay */}
            <div className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
                backgroundSize: '33.33% 33.33%',
              }} />
          </>
        )}
      </div>

      {/* ── Green screen controls ── */}
      <div className="px-4 pt-3 space-y-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBgPicker(v => !v)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              chromaColor !== 'none'
                ? 'bg-accent-500 text-white'
                : 'bg-white/10 text-white/60'
            }`}
          >
            <Scissors size={13} />
            Green Screen
          </button>

          {chromaColor === 'none' ? (
            <button onClick={() => setChromaColor('green')}
              className="px-3 py-1.5 rounded-xl bg-green-600/30 text-green-300 text-xs font-semibold hover:bg-green-600/50 transition">
              Green
            </button>
          ) : (
            <>
              <button
                onClick={() => setChromaColor(c => c === 'green' ? 'blue' : 'green')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  chromaColor === 'green' ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'
                }`}
              >
                {chromaColor === 'green' ? 'Green' : 'Blue'}
              </button>
              <button onClick={() => setChromaColor('none')}
                className="p-1.5 rounded-xl bg-white/10 text-white/60 hover:bg-white/20 transition">
                {chroma.active ? <Eye size={13} /> : <EyeOff size={13} />}
              </button>
            </>
          )}
        </div>

        {showBgPicker && chromaColor !== 'none' && (
          <BackgroundPicker
            selectedId={selectedBg.id}
            onSelect={bg => setSelectedBg(bg)}
          />
        )}
      </div>

      {/* ── Thumbnails ── */}
      <div className="flex justify-center gap-3 px-4 py-3">
        {photos.map((photo, i) => (
          <button key={i} onClick={() => photo && handleRetake(i)}
            className={`relative rounded-xl overflow-hidden border-2 transition-all ${
              i === currentIndex && !allCaptured ? 'border-accent-500 scale-110' : 'border-white/20'
            }`} style={{ width: 52, height: 52 }}>
            {photo ? (
              <>
                <img src={photo} alt={`Shot ${i + 1}`}
                  className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 flex items-center justify-center transition">
                  <RotateCcw size={14} className="text-white" />
                </div>
                <CheckCircle size={14} className="absolute top-1 right-1 text-green-400" />
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                <span className="text-white/40 text-xs font-bold">{i + 1}</span>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* ── Capture controls ── */}
      <div className="pb-10 px-4 flex flex-col items-center gap-3">
        {!allCaptured ? (
          <>
            {/* Photo / GIF shutter */}
            {!isVideoMode && (
              <button
                onClick={() => {
                  if (isGifMode) handleGifStart()
                  else countdown.start()
                }}
                disabled={countdown.running || gifRec.isRecording || !webcam.isReady}
                className={`h-20 w-20 rounded-full border-4 border-white flex items-center justify-center transition-all
                  ${(countdown.running || gifRec.isRecording) ? 'opacity-50' : 'hover:scale-105 active:scale-95'}`}
              >
                <div className={`h-14 w-14 rounded-full flex items-center justify-center ${
                  isGifMode ? 'bg-accent-500' : 'bg-white'
                }`}>
                  <Camera size={28} className={isGifMode ? 'text-white' : 'text-primary-900'} />
                </div>
              </button>
            )}

            {/* Video controls */}
            {isVideoMode && (
              <div className="flex items-center gap-4">
                {!vidRec.isRecording ? (
                  <button onClick={handleVideoStart}
                    className="h-20 w-20 rounded-full border-4 border-red-500 flex items-center justify-center
                               hover:scale-105 active:scale-95 transition-all"
                    disabled={!webcam.isReady}>
                    <div className="h-14 w-14 rounded-full bg-red-500 flex items-center justify-center">
                      <span className="h-6 w-6 rounded-sm bg-white" />
                    </div>
                  </button>
                ) : (
                  <button onClick={handleVideoStop}
                    className="h-20 w-20 rounded-full border-4 border-red-500 bg-red-500/20 flex items-center justify-center
                               hover:scale-105 active:scale-95 transition-all animate-pulse">
                    <span className="h-7 w-7 rounded bg-red-500" />
                  </button>
                )}
              </div>
            )}

            <p className="text-white/40 text-xs text-center">
              {isGifMode ? `Tap to record ${mode}` : isVideoMode ? 'Tap to start/stop recording' : 'Tap to countdown'}
            </p>
          </>
        ) : (
          <button onClick={handleDone} disabled={uploading} className="btn-accent px-10 py-4 text-base">
            {uploading ? <Spinner size="sm" /> : 'Preview Photos →'}
          </button>
        )}
      </div>
    </div>
  )
}
