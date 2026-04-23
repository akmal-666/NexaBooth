import { useEffect, useState } from 'react'
import { Search, SlidersHorizontal } from 'lucide-react'
import type { Frame, FrameLayout } from '../types'
import { getFrames } from '../lib/api'
import FrameCard from '../components/FrameCard'
import Spinner from '../components/Spinner'

const LAYOUT_LABELS: Record<FrameLayout, string> = {
  solo: 'Portrait',
  double: 'Double',
  strip: 'Strip',
  quad: 'Grid',
  triptych: 'Trio',
}

const ALL = 'all' as const
type Filter = FrameLayout | typeof ALL

export default function FrameList() {
  const [frames, setFrames] = useState<Frame[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>(ALL)

  useEffect(() => {
    getFrames()
      .then(setFrames)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const layouts = Array.from(new Set(frames.map(f => f.layout))) as FrameLayout[]

  const visible = frames.filter(f => {
    const matchSearch =
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      (f.description ?? '').toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === ALL || f.layout === filter
    return matchSearch && matchFilter
  })

  return (
    <div className="min-h-full bg-surface">
      {/* Header */}
      <div className="bg-white px-5 pt-12 pb-4 shadow-sm">
        <h1 className="text-2xl font-bold text-primary-900 mb-4">Choose a Frame</h1>

        <div className="relative mb-3">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-400" />
          <input
            type="text"
            placeholder="Search frames ..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-11"
          />
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setFilter(ALL)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
              filter === ALL
                ? 'bg-primary-900 text-white'
                : 'bg-surface text-primary-500'
            }`}
          >
            All
          </button>
          {layouts.map(l => (
            <button
              key={l}
              onClick={() => setFilter(l)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                filter === l
                  ? 'bg-primary-900 text-white'
                  : 'bg-surface text-primary-500'
              }`}
            >
              {LAYOUT_LABELS[l]}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 py-5">
        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : visible.length === 0 ? (
          <div className="text-center py-20">
            <SlidersHorizontal size={48} className="text-primary-200 mx-auto mb-3" />
            <p className="text-primary-400 font-medium">No frames match your search</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {visible.map(f => <FrameCard key={f.id} frame={f} />)}
          </div>
        )}
      </div>
    </div>
  )
}
