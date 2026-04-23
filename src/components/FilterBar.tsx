import type { PhotoFilter } from '../types'
import { FILTER_LABELS, FILTER_CSS } from '../types'
import { cn } from '../lib/utils'

const FILTERS: PhotoFilter[] = ['normal', 'grayscale', 'sepia', 'vivid', 'cool', 'warm', 'fade']

interface Props {
  value: PhotoFilter
  onChange: (f: PhotoFilter) => void
  samplePhoto?: string
}

export default function FilterBar({ value, onChange, samplePhoto }: Props) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
      {FILTERS.map(f => (
        <button
          key={f}
          onClick={() => onChange(f)}
          className="flex-shrink-0 flex flex-col items-center gap-1.5"
        >
          <div
            className={cn(
              'w-16 h-16 rounded-2xl overflow-hidden border-2 transition-all',
              value === f ? 'border-primary-900 scale-105' : 'border-transparent opacity-70'
            )}
          >
            {samplePhoto ? (
              <img
                src={samplePhoto}
                alt={f}
                className="w-full h-full object-cover"
                style={{ filter: FILTER_CSS[f] }}
              />
            ) : (
              <div
                className="w-full h-full"
                style={{
                  background: 'linear-gradient(135deg,#4B5FD6,#FF7B54)',
                  filter: FILTER_CSS[f],
                }}
              />
            )}
          </div>
          <span className={cn(
            'text-[10px] font-semibold',
            value === f ? 'text-primary-900' : 'text-primary-400'
          )}>
            {FILTER_LABELS[f]}
          </span>
        </button>
      ))}
    </div>
  )
}
