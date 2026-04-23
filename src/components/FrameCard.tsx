import { useNavigate } from 'react-router-dom'
import { Images, ArrowRight } from 'lucide-react'
import type { Frame } from '../types'
import { formatIDR } from '../lib/utils'

const LAYOUT_PREVIEW: Record<string, JSX.Element> = {
  solo: (
    <div className="w-full h-full p-2">
      <div className="w-full h-full rounded-xl bg-white/30" />
    </div>
  ),
  double: (
    <div className="w-full h-full p-2 flex flex-col gap-1">
      <div className="flex-1 rounded-xl bg-white/30" />
      <div className="flex-1 rounded-xl bg-white/30" />
    </div>
  ),
  strip: (
    <div className="w-full h-full p-2 flex flex-col gap-0.5">
      {[0,1,2,3].map(i => (
        <div key={i} className="flex-1 rounded-lg bg-white/30" />
      ))}
    </div>
  ),
  quad: (
    <div className="w-full h-full p-2 grid grid-cols-2 gap-1">
      {[0,1,2,3].map(i => (
        <div key={i} className="rounded-xl bg-white/30" />
      ))}
    </div>
  ),
  triptych: (
    <div className="w-full h-full p-2 flex gap-1">
      {[0,1,2].map(i => (
        <div key={i} className="flex-1 rounded-xl bg-white/30" />
      ))}
    </div>
  ),
}

interface Props {
  frame: Frame
  compact?: boolean
}

export default function FrameCard({ frame, compact = false }: Props) {
  const navigate = useNavigate()

  return (
    <button
      onClick={() => navigate(`/frames/${frame.id}`)}
      className="card text-left w-full hover:shadow-card-hover transition-shadow active:scale-[0.98]"
    >
      {/* Preview area */}
      <div
        className="rounded-2xl mb-3 overflow-hidden"
        style={{
          backgroundColor: frame.accent_color,
          aspectRatio: compact ? '4/3' : '3/2',
        }}
      >
        {LAYOUT_PREVIEW[frame.layout]}
      </div>

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-primary-900 truncate">{frame.name}</h3>
          {!compact && (
            <p className="text-sm text-primary-400 mt-0.5 line-clamp-1">{frame.description}</p>
          )}
          <div className="flex items-center gap-2 mt-1.5">
            <Images size={13} className="text-primary-400" />
            <span className="text-xs text-primary-400">{frame.photo_count} photo{frame.photo_count > 1 ? 's' : ''}</span>
          </div>
        </div>
        <div className="flex-shrink-0 text-right">
          <p className="font-bold text-primary-900">{formatIDR(frame.price)}</p>
          <ArrowRight size={16} className="text-primary-400 mt-1 ml-auto" />
        </div>
      </div>
    </button>
  )
}
