import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Camera, RotateCcw, CheckCircle, FlipHorizontal } from 'lucide-react'
import type { Session } from '../types'
import { getSession, uploadPhoto } from '../lib/api'
import { useWebcam } from '../hooks/useWebcam'
import { useCountdown } from '../hooks/useCountdown'
import { sleep } from '../lib/utils'
import Spinner from '../components/Spinner'

export default function Capture() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [mirrored, setMirrored] = useState(true)
  const [photos, setPhotos] = useState<(string | null)[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [flashing, setFlashing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const uploadedRef = useRef<Set<number>>(new Set())

  const webcam = useWebcam({ mirrored, width: 1280, height: 720 })

  const handleCaptureDone = useCallback(async () => {
    const dataUrl = webcam.capture()
    if (!dataUrl || !sessionId) return

    // Flash effect
    setFlashing(true)
    await sleep(150)
    setFlashing(false)

    setPhotos(prev => {
      const next = [...prev]
      next[currentIndex] = dataUrl
      return next
    })

    // Upload in background
    if (!uploadedRef.current.has(currentIndex)) {
      uploadedRef.current.add(currentIndex)
      uploadPhoto(sessionId, currentIndex, dataUrl).catch(() =>
        uploadedRef.current.delete(currentIndex)
      )
    }

    if (session && currentIndex < (session.photo_count ?? 1) - 1) {
      setCurrentIndex(i => i + 1)
    }
  }, [webcam, sessionId, currentIndex, session])

  const countdown = useCountdown(3, { onComplete: handleCaptureDone })

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
    if (!loading && session) {
      webcam.start()
    }
    return () => webcam.stop()
  }, [loading]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDone() {
    if (!sessionId || !session) return
    const captured = photos.filter(Boolean)
    if (captured.length === 0) return

    setUploading(true)
    // Re-upload any missing
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
    setPhotos(prev => {
      const next = [...prev]
      next[index] = null
      return next
    })
    uploadedRef.current.delete(index)
  }

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
  const captureCount = photos.filter(Boolean).length

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-12 pb-3 z-10">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition">
          <ArrowLeft size={20} />
        </button>
        <div className="text-center">
          <p className="text-white font-semibold">Photo {Math.min(currentIndex + 1, session.photo_count ?? 1)} of {session.photo_count ?? 1}</p>
          <p className="text-white/50 text-xs">{session.frame_name}</p>
        </div>
        <button
          onClick={() => setMirrored(m => !m)}
          className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition"
        >
          <FlipHorizontal size={20} />
        </button>
      </div>

      {/* Camera view */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden mx-4 rounded-3xl bg-zinc-900">
        {webcam.error ? (
          <div className="flex flex-col items-center gap-3 px-6 text-center">
            <Camera size={48} className="text-white/30" />
            <p className="text-white/70">{webcam.error}</p>
            <button onClick={webcam.start} className="btn-primary mt-2">Retry</button>
          </div>
        ) : (
          <>
            <video
              ref={webcam.videoRef}
              className="w-full h-full object-cover"
              style={{ transform: mirrored ? 'scaleX(-1)' : 'none' }}
              playsInline
              muted
            />

            {/* Countdown overlay */}
            {countdown.running && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-3xl">
                <span
                  key={countdown.remaining}
                  className="text-white font-black animate-countdown"
                  style={{ fontSize: '7rem', lineHeight: 1 }}
                >
                  {countdown.remaining}
                </span>
              </div>
            )}

            {/* Flash effect */}
            {flashing && (
              <div className="absolute inset-0 bg-white animate-flash rounded-3xl pointer-events-none" />
            )}

            {/* Grid overlay */}
            <div className="absolute inset-0 pointer-events-none rounded-3xl"
              style={{
                backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
                backgroundSize: '33.33% 33.33%',
              }}
            />
          </>
        )}
      </div>

      {/* Thumbnails */}
      <div className="flex justify-center gap-3 px-4 py-4">
        {photos.map((photo, i) => (
          <button
            key={i}
            onClick={() => photo && handleRetake(i)}
            className={`relative rounded-xl overflow-hidden border-2 transition-all ${
              i === currentIndex && !allCaptured ? 'border-accent-500 scale-110' : 'border-white/20'
            }`}
            style={{ width: 52, height: 52 }}
          >
            {photo ? (
              <>
                <img src={photo} alt={`Shot ${i + 1}`} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition">
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

      {/* Controls */}
      <div className="pb-10 px-4 flex flex-col items-center gap-4">
        {!allCaptured ? (
          <button
            onClick={countdown.start}
            disabled={countdown.running || !webcam.isReady}
            className={`h-20 w-20 rounded-full border-4 border-white flex items-center justify-center transition-all
              ${countdown.running ? 'opacity-50' : 'hover:scale-105 active:scale-95'}`}
          >
            <div className="h-14 w-14 rounded-full bg-white flex items-center justify-center">
              <Camera size={28} className="text-primary-900" />
            </div>
          </button>
        ) : (
          <button
            onClick={handleDone}
            disabled={uploading}
            className="btn-accent px-10 py-4 text-base"
          >
            {uploading ? <Spinner size="sm" /> : 'Preview Photos →'}
          </button>
        )}

        <p className="text-white/40 text-xs text-center">
          {allCaptured
            ? `All ${session.photo_count} photos captured — tap thumbnails to retake`
            : countdown.running
            ? 'Stay still!'
            : `Tap the button · ${captureCount}/${session.photo_count} captured`}
        </p>
      </div>
    </div>
  )
}
