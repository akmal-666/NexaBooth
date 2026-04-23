import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Images, Tag, ShoppingCart } from 'lucide-react'
import type { Frame } from '../types'
import { getFrame, createSession } from '../lib/api'
import { formatIDR } from '../lib/utils'
import { LAYOUT_CONFIGS } from '../types'
import Spinner from '../components/Spinner'
import PhotoStrip from '../components/PhotoStrip'

export default function FrameDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [frame, setFrame] = useState<Frame | null>(null)
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    getFrame(id)
      .then(setFrame)
      .catch(() => setError('Frame not found'))
      .finally(() => setLoading(false))
  }, [id])

  async function handleBook() {
    if (!frame) return
    setBooking(true)
    setError('')
    try {
      const { sessionId } = await createSession(frame.id)
      navigate(`/payment/${sessionId}`)
    } catch {
      setError('Failed to create session. Please try again.')
      setBooking(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <Spinner size="lg" />
    </div>
  )

  if (!frame) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-surface px-6">
      <p className="text-primary-400 text-center">Frame not found.</p>
      <button onClick={() => navigate('/frames')} className="btn-primary">Back to Frames</button>
    </div>
  )

  const cfg = LAYOUT_CONFIGS[frame.layout]
  const tags = [frame.layout, `${frame.photo_count} photos`, cfg.paperLabel]

  return (
    <div className="min-h-full bg-surface">
      {/* Hero */}
      <div
        className="relative px-5 pt-12 pb-8 flex flex-col items-center"
        style={{ backgroundColor: frame.accent_color }}
      >
        <button
          onClick={() => navigate(-1)}
          className="absolute top-12 left-5 p-2 rounded-full bg-white/20 text-white hover:bg-white/30 transition"
        >
          <ArrowLeft size={20} />
        </button>

        <h2 className="text-white font-bold text-xl mb-6">{frame.name}</h2>

        <PhotoStrip
          photos={Array(frame.photo_count).fill(null)}
          layout={frame.layout}
          borderColor={frame.border_color}
          accentColor={frame.accent_color}
          className="max-w-[220px]"
        />
      </div>

      {/* Details */}
      <div className="px-5 py-6 space-y-5">
        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          {tags.map(t => (
            <span key={t} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-primary-200 text-sm text-primary-700 font-medium">
              <Tag size={12} />
              {t}
            </span>
          ))}
        </div>

        {/* Description */}
        <div className="card">
          <h3 className="font-semibold text-primary-900 mb-2">About this package</h3>
          <p className="text-primary-500 text-sm leading-relaxed">{frame.description}</p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-primary-50 flex items-center justify-center">
                <Images size={18} className="text-primary-700" />
              </div>
              <div>
                <p className="text-xs text-primary-400">Photos</p>
                <p className="font-semibold text-primary-900">{frame.photo_count} shots</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-primary-50 flex items-center justify-center">
                <Tag size={18} className="text-primary-700" />
              </div>
              <div>
                <p className="text-xs text-primary-400">Paper</p>
                <p className="font-semibold text-primary-900">{cfg.paperLabel}</p>
              </div>
            </div>
          </div>
        </div>

        {/* What's included */}
        <div className="card">
          <h3 className="font-semibold text-primary-900 mb-3">What's included</h3>
          {[
            `${frame.photo_count} digital photo${frame.photo_count > 1 ? 's' : ''}`,
            'Instant print on photo paper',
            'QR code for digital download',
            'Choice of 7 filters',
            'Professional frame overlay',
          ].map(item => (
            <div key={item} className="flex items-center gap-3 py-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-accent-500 shrink-0" />
              <p className="text-sm text-primary-700">{item}</p>
            </div>
          ))}
        </div>

        {error && (
          <p className="text-red-600 text-sm text-center">{error}</p>
        )}
      </div>

      {/* Sticky footer */}
      <div className="sticky bottom-0 bg-white border-t border-primary-100 px-5 py-4 flex items-center gap-4">
        <div>
          <p className="text-xs text-primary-400">Total price</p>
          <p className="text-xl font-bold text-primary-900">{formatIDR(frame.price)}</p>
        </div>
        <button
          onClick={handleBook}
          disabled={booking}
          className="btn-primary flex-1"
        >
          {booking ? <Spinner size="sm" /> : <><ShoppingCart size={18} /> Book Now</>}
        </button>
      </div>
    </div>
  )
}
