import { useEffect, useState, useCallback } from 'react'
import { Play, Pause, X, ChevronLeft, ChevronRight, Monitor } from 'lucide-react'
import { getAdminSessions } from '../lib/api'
import Spinner from '../components/Spinner'

interface SlidePhoto {
  sessionId: string
  frameId: string
  frameName: string
  photoData: string
}

export default function Slideshow() {
  const [photos, setPhotos] = useState<SlidePhoto[]>([])
  const [current, setCurrent] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [loading, setLoading] = useState(true)
  const [interval, setIntervalSec] = useState(5)
  const [password] = useState(() => sessionStorage.getItem('adminPw') ?? '')

  const loadPhotos = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getAdminSessions(password)
      const completed = data.sessions.filter(s => s.status === 'completed')

      // For each completed session, fetch one composite photo
      const slides: SlidePhoto[] = []
      for (const s of completed.slice(0, 30)) {
        try {
          const res = await fetch(`/api/sessions/${s.id}/photos`)
          const json = await res.json() as { photos: { data?: string; photo_index: number }[] }
          const p = json.photos.find(ph => ph.data)
          if (p?.data) {
            slides.push({
              sessionId: s.id,
              frameId: s.frame_id,
              frameName: s.frame_name ?? 'Photo',
              photoData: p.data,
            })
          }
        } catch { /* skip */ }
      }
      setPhotos(slides)
    } finally {
      setLoading(false)
    }
  }, [password])

  useEffect(() => { loadPhotos() }, [loadPhotos])

  // Auto-advance
  useEffect(() => {
    if (!playing || photos.length < 2) return
    const t = setTimeout(() => {
      setCurrent(c => (c + 1) % photos.length)
    }, interval * 1000)
    return () => clearTimeout(t)
  }, [playing, photos.length, interval, current])

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setCurrent(c => (c + 1) % Math.max(photos.length, 1))
      if (e.key === 'ArrowLeft')  setCurrent(c => (c - 1 + photos.length) % Math.max(photos.length, 1))
      if (e.key === ' ')          setPlaying(p => !p)
      if (e.key === 'Escape')     window.close()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [photos.length])

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <Spinner size="lg" className="border-white/20 border-t-white" />
    </div>
  )

  if (!photos.length) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
      <Monitor size={48} className="text-white/30" />
      <p className="text-white/50 text-center">No completed photos yet.<br />Complete a session first.</p>
      <button onClick={window.close} className="btn-ghost text-white border-white/20 mt-4">
        Close
      </button>
    </div>
  )

  const photo = photos[current]

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Photo */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden">
        <img
          key={photo.photoData}
          src={photo.photoData}
          alt={photo.frameName}
          className="max-h-screen max-w-full object-contain animate-fade-in"
        />

        {/* Overlay info */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-6">
          <p className="text-white font-semibold text-lg">{photo.frameName}</p>
          <p className="text-white/50 text-sm">{current + 1} / {photos.length}</p>
        </div>

        {/* Nav arrows */}
        <button
          onClick={() => setCurrent(c => (c - 1 + photos.length) % photos.length)}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition"
        >
          <ChevronLeft size={28} />
        </button>
        <button
          onClick={() => setCurrent(c => (c + 1) % photos.length)}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition"
        >
          <ChevronRight size={28} />
        </button>
      </div>

      {/* Controls bar */}
      <div className="bg-zinc-900 px-6 py-3 flex items-center gap-4">
        <button
          onClick={() => setPlaying(p => !p)}
          className="p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition"
        >
          {playing ? <Pause size={20} /> : <Play size={20} />}
        </button>

        {/* Dots */}
        <div className="flex gap-1.5 flex-1 overflow-x-auto">
          {photos.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-1.5 rounded-full flex-shrink-0 transition-all ${
                i === current ? 'w-6 bg-white' : 'w-1.5 bg-white/30'
              }`}
            />
          ))}
        </div>

        {/* Interval */}
        <div className="flex items-center gap-2 text-white/60 text-xs">
          <span>Speed</span>
          <select
            value={interval}
            onChange={e => setIntervalSec(Number(e.target.value))}
            className="bg-white/10 text-white rounded-lg px-2 py-1 text-xs"
          >
            {[3, 5, 8, 10, 15].map(s => (
              <option key={s} value={s}>{s}s</option>
            ))}
          </select>
        </div>

        <button onClick={window.close} className="p-2 rounded-xl text-white/40 hover:text-white transition">
          <X size={20} />
        </button>
      </div>
    </div>
  )
}
