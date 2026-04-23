import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Wand2, RotateCcw, ChevronRight } from 'lucide-react'
import type { Session, PhotoFilter } from '../types'
import { getSession, getPhotos, uploadPhoto } from '../lib/api'
import PhotoStrip from '../components/PhotoStrip'
import FilterBar from '../components/FilterBar'
import Spinner from '../components/Spinner'

export default function Preview() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const [session, setSession] = useState<Session | null>(null)
  const [photos, setPhotos] = useState<(string | null)[]>([])
  const [filter, setFilter] = useState<PhotoFilter>('normal')
  const [loading, setLoading] = useState(true)
  const [rendering, setRendering] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!sessionId) return
    Promise.all([getSession(sessionId), getPhotos(sessionId)])
      .then(([sess, dbPhotos]) => {
        if (sess.status === 'pending') {
          navigate(`/payment/${sessionId}`, { replace: true })
          return
        }
        setSession(sess)
        // Build photo array ordered by index
        const arr: (string | null)[] = Array(sess.photo_count ?? dbPhotos.length).fill(null)
        dbPhotos.forEach(p => { if (p.data) arr[p.photo_index] = p.data })
        setPhotos(arr)
        if (dbPhotos[0]?.filter) setFilter(dbPhotos[0].filter as PhotoFilter)
      })
      .catch(() => setError('Could not load photos'))
      .finally(() => setLoading(false))
  }, [sessionId, navigate])

  const handleProceed = useCallback(async () => {
    if (!session || !sessionId) return
    setRendering(true)
    try {
      // Save filter for all photos
      await Promise.all(
        photos.map((data, i) => {
          if (!data) return Promise.resolve()
          return uploadPhoto(sessionId, i, data, filter)
        })
      )
      navigate(`/print/${sessionId}`)
    } catch {
      setError('Failed to save. Please try again.')
    } finally {
      setRendering(false)
    }
  }, [session, sessionId, photos, filter, navigate])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <Spinner size="lg" />
    </div>
  )

  if (!session) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-surface px-6">
      <p className="text-primary-400 text-center">{error || 'Session not found.'}</p>
      <button onClick={() => navigate('/frames')} className="btn-primary">Back to Frames</button>
    </div>
  )

  const samplePhoto = photos.find(Boolean) ?? undefined

  return (
    <div className="min-h-screen bg-surface flex flex-col max-w-md mx-auto lg:max-w-2xl">
      {/* Header */}
      <div className="bg-white px-5 pt-12 pb-4 shadow-sm flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 rounded-2xl hover:bg-surface transition">
          <ArrowLeft size={20} className="text-primary-900" />
        </button>
        <div>
          <h1 className="font-bold text-xl text-primary-900">Preview</h1>
          <p className="text-xs text-primary-400">{session.frame_name}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
        {/* Photo strip preview */}
        <div className="flex justify-center">
          <PhotoStrip
            photos={photos}
            layout={session.layout ?? 'strip'}
            filter={filter}
            borderColor={session.border_color ?? '#FFFFFF'}
            accentColor={session.accent_color ?? '#1E2A6E'}
          />
        </div>

        {/* Filter selection */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Wand2 size={18} className="text-primary-700" />
            <h3 className="font-semibold text-primary-900">Apply Filter</h3>
          </div>
          <FilterBar
            value={filter}
            onChange={setFilter}
            samplePhoto={typeof samplePhoto === 'string' ? samplePhoto : undefined}
          />
        </div>

        {/* Actions */}
        <div className="card space-y-3">
          <h3 className="font-semibold text-primary-900 mb-1">Options</h3>
          <button
            onClick={() => navigate(`/capture/${sessionId}`)}
            className="btn-ghost w-full"
          >
            <RotateCcw size={18} />
            Retake All Photos
          </button>
        </div>

        {error && (
          <p className="text-red-600 text-sm text-center bg-red-50 rounded-2xl p-3">{error}</p>
        )}
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-primary-100 px-5 py-4">
        <button
          onClick={handleProceed}
          disabled={rendering || photos.every(p => !p)}
          className="btn-primary w-full text-base"
        >
          {rendering ? <Spinner size="sm" /> : <>Continue to Print <ChevronRight size={18} /></>}
        </button>
      </div>
    </div>
  )
}
