import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Maximize2 } from 'lucide-react'

const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: 8 + Math.random() * 20,
  dur: 4 + Math.random() * 6,
  delay: Math.random() * 4,
  opacity: 0.06 + Math.random() * 0.14,
}))

export default function Kiosk() {
  const navigate = useNavigate()
  const [idle, setIdle] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)

  const resetIdle = useCallback(() => setIdle(false), [])

  // Return to idle after 30s of inactivity
  useEffect(() => {
    if (!idle) {
      const t = setTimeout(() => setIdle(true), 30_000)
      return () => clearTimeout(t)
    }
  }, [idle])

  // Hide cursor after 3s idle
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>
    const onMove = () => {
      document.body.style.cursor = 'default'
      clearTimeout(t)
      t = setTimeout(() => { document.body.style.cursor = 'none' }, 3000)
    }
    window.addEventListener('mousemove', onMove)
    return () => { window.removeEventListener('mousemove', onMove); clearTimeout(t) }
  }, [])

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setFullscreen(true)
    } else {
      document.exitFullscreen()
      setFullscreen(false)
    }
  }

  return (
    <div
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden select-none"
      style={{ background: 'linear-gradient(135deg, #1E2A6E 0%, #0f0c29 50%, #302b63 100%)' }}
      onClick={() => { resetIdle(); navigate('/frames') }}
    >
      {/* Animated particles */}
      {PARTICLES.map(p => (
        <div
          key={p.id}
          className="absolute rounded-full bg-white pointer-events-none"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
            animation: `float-particle ${p.dur}s ease-in-out ${p.delay}s infinite alternate`,
          }}
        />
      ))}

      {/* Radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(75,95,214,0.3) 0%, transparent 70%)',
        }}
      />

      {/* Center content */}
      <div className="relative z-10 flex flex-col items-center gap-8 px-8 text-center">
        {/* Logo / camera icon */}
        <div className="relative">
          <div
            className="absolute inset-0 rounded-full border-2 border-white/30"
            style={{ animation: 'pulse-ring 2s ease-out infinite' }}
          />
          <div
            className="absolute inset-0 rounded-full border-2 border-white/15"
            style={{ animation: 'pulse-ring 2s ease-out 0.7s infinite' }}
          />
          <div className="h-32 w-32 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
            <Camera size={52} className="text-white" strokeWidth={1.5} />
          </div>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-white font-black text-5xl md:text-7xl tracking-tight leading-none mb-3">
            NexaBooth
          </h1>
          <p className="text-white/60 text-xl md:text-2xl font-light">
            Your perfect photobooth experience
          </p>
        </div>

        {/* CTA */}
        <div
          className="mt-4 px-10 py-5 rounded-full border-2 border-white/40 bg-white/10 backdrop-blur-sm
                     text-white font-bold text-xl tracking-wide"
          style={{ animation: 'pulse 2.5s ease-in-out infinite' }}
        >
          Tap anywhere to start ✨
        </div>

        {/* Features pills */}
        <div className="flex flex-wrap justify-center gap-3 mt-2">
          {['📸 Photo', '🎞️ GIF', '⏪ Boomerang', '🎥 Video', '🖨️ Instant Print'].map(f => (
            <span
              key={f}
              className="px-4 py-1.5 rounded-full bg-white/10 text-white/70 text-sm font-medium border border-white/10"
            >
              {f}
            </span>
          ))}
        </div>
      </div>

      {/* Corner controls */}
      <button
        onClick={e => { e.stopPropagation(); toggleFullscreen() }}
        className="absolute top-5 right-5 z-20 p-3 rounded-2xl bg-white/10 text-white/60 hover:bg-white/20 transition"
        title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
      >
        <Maximize2 size={18} />
      </button>

      <button
        onClick={e => { e.stopPropagation(); navigate('/admin') }}
        className="absolute bottom-5 right-5 z-20 text-white/20 hover:text-white/50 text-xs transition px-3 py-2"
      >
        Admin
      </button>

      {/* Floating animation CSS */}
      <style>{`
        @keyframes float-particle {
          0%   { transform: translateY(0px) scale(1); }
          100% { transform: translateY(-30px) scale(1.1); }
        }
      `}</style>
    </div>
  )
}
