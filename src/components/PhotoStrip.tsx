import type { FrameLayout, PhotoFilter } from '../types'
import { LAYOUT_CONFIGS, FILTER_CSS } from '../types'
import { cn } from '../lib/utils'

interface Props {
  photos: (string | null)[]
  layout: FrameLayout
  filter?: PhotoFilter
  borderColor?: string
  accentColor?: string
  className?: string
  /** index of photo currently being captured */
  activeIndex?: number
}

export default function PhotoStrip({
  photos,
  layout,
  filter = 'normal',
  borderColor = '#FFFFFF',
  accentColor = '#1E2A6E',
  className,
  activeIndex,
}: Props) {
  const cfg = LAYOUT_CONFIGS[layout]

  // Compute display dimensions scaled to a max of 360px width
  const maxW = 360
  const scale = maxW / cfg.canvasWidth
  const dispW = cfg.canvasWidth * scale
  const dispH = cfg.canvasHeight * scale

  return (
    <div
      className={cn('relative mx-auto rounded-2xl overflow-hidden shadow-card', className)}
      style={{ width: dispW, height: dispH, backgroundColor: borderColor }}
    >
      {cfg.slots.map((slot, i) => {
        const px = slot.x * scale
        const py = slot.y * scale
        const pw = slot.w * scale
        const ph = slot.h * scale
        const photo = photos[i]
        const isActive = activeIndex === i

        return (
          <div
            key={i}
            className={cn(
              'absolute overflow-hidden rounded-xl transition-all',
              isActive && 'ring-4 ring-accent-500'
            )}
            style={{ left: px, top: py, width: pw, height: ph }}
          >
            {photo ? (
              <img
                src={photo}
                alt={`Photo ${i + 1}`}
                className="w-full h-full object-cover"
                style={{ filter: FILTER_CSS[filter] }}
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ backgroundColor: accentColor + '22' }}
              >
                <span className="text-xs font-semibold" style={{ color: accentColor + '88' }}>
                  {i + 1}
                </span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
