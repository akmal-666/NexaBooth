import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Search, MapPin, ChevronRight } from 'lucide-react'
import type { Frame } from '../types'
import { getFrames } from '../lib/api'
import { formatIDR } from '../lib/utils'
import FrameCard from '../components/FrameCard'
import Spinner from '../components/Spinner'

const LAYOUT_LABELS: Record<string, string> = {
  solo: 'Portrait',
  double: 'Double',
  strip: 'Strip',
  quad: 'Grid',
  triptych: 'Trio',
}

export default function Home() {
  const navigate = useNavigate()
  const [frames, setFrames] = useState<Frame[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    getFrames()
      .then(setFrames)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = frames.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.description?.toLowerCase().includes(search.toLowerCase())
  )

  const featured = filtered.slice(0, 2)
  const categories = Array.from(new Set(frames.map(f => f.layout)))

  return (
    <div className="min-h-full bg-surface">
      {/* Header */}
      <div className="bg-white px-5 pt-12 pb-6 shadow-sm">
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-sm text-primary-400 font-medium">Welcome to</p>
            <h1 className="text-2xl font-bold text-primary-900 leading-tight">
              NexaBooth
            </h1>
          </div>
          <button className="relative p-2.5 rounded-2xl bg-surface hover:bg-primary-50 transition">
            <Bell size={22} className="text-primary-900" />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-accent-500" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-400" />
          <input
            type="text"
            placeholder="Search frames ..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-11"
          />
        </div>
      </div>

      <div className="px-5 py-5 space-y-6">
        {/* Find location CTA */}
        <button
          onClick={() => navigate('/frames')}
          className="w-full rounded-3xl bg-primary-900 text-white p-5 flex items-center justify-between
                     shadow-lg hover:bg-primary-700 active:scale-[0.98] transition-all"
        >
          <div className="text-left">
            <p className="font-bold text-lg">Find Your Perfect</p>
            <p className="font-bold text-lg">Frame Now</p>
            <p className="text-primary-200 text-sm mt-1">Choose from {frames.length} layouts</p>
          </div>
          <div className="relative ml-4">
            {/* Radar rings */}
            <div className="absolute inset-0 rounded-full border-2 border-white/20 animate-pulse-ring" />
            <div className="absolute inset-0 rounded-full border-2 border-white/10 animate-pulse-ring [animation-delay:0.5s]" />
            <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center">
              <MapPin size={24} className="text-white" />
            </div>
          </div>
        </button>

        {/* Categories */}
        {!loading && categories.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-primary-900">Select a Category</h2>
              <button
                onClick={() => navigate('/frames')}
                className="flex items-center gap-1 text-sm text-primary-500 font-medium"
              >
                See all <ChevronRight size={14} />
              </button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {categories.map(cat => {
                const catFrames = frames.filter(f => f.layout === cat)
                const frame = catFrames[0]
                return (
                  <button
                    key={cat}
                    onClick={() => navigate('/frames')}
                    className="flex-shrink-0 relative w-40 h-28 rounded-2xl overflow-hidden
                               hover:scale-[1.02] active:scale-95 transition-all shadow-card"
                    style={{ backgroundColor: frame?.accent_color ?? '#4B5FD6' }}
                  >
                    <div className="absolute inset-0 p-3 flex flex-col justify-between">
                      <div className="flex gap-1 flex-wrap">
                        {frame?.layout === 'strip' && (
                          <div className="flex gap-0.5 h-full">
                            {[0,1,2,3].map(i => (
                              <div key={i} className="w-4 h-16 rounded bg-white/30" />
                            ))}
                          </div>
                        )}
                        {frame?.layout === 'quad' && (
                          <div className="grid grid-cols-2 gap-1 w-full">
                            {[0,1,2,3].map(i => <div key={i} className="h-8 rounded bg-white/30" />)}
                          </div>
                        )}
                        {['solo','double','triptych'].includes(frame?.layout ?? '') && (
                          <div className="w-full h-14 rounded-xl bg-white/30" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-white text-sm">{LAYOUT_LABELS[cat]}</p>
                        <p className="text-white/70 text-[10px]">{catFrames.length} option{catFrames.length !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {/* Featured frames */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-primary-900">Featured Packages</h2>
            <button
              onClick={() => navigate('/frames')}
              className="flex items-center gap-1 text-sm text-primary-500 font-medium"
            >
              View all <ChevronRight size={14} />
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-primary-400 py-8">No frames found</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {featured.map(f => <FrameCard key={f.id} frame={f} />)}
            </div>
          )}
        </section>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Frames', value: frames.length.toString() },
            { label: 'From', value: formatIDR(Math.min(...frames.map(f => f.price), 999999)) },
            { label: 'Instant', value: 'Print' },
          ].map(({ label, value }) => (
            <div key={label} className="card text-center py-3">
              <p className="font-bold text-primary-900">{value}</p>
              <p className="text-xs text-primary-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
