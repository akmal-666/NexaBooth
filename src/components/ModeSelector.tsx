import { Camera, Film, Repeat, Video } from 'lucide-react'
import { cn } from '../lib/utils'

export type CaptureMode = 'photo' | 'gif' | 'boomerang' | 'video'

interface Props {
  value: CaptureMode
  onChange: (m: CaptureMode) => void
}

const MODES: { id: CaptureMode; icon: typeof Camera; label: string; sub: string }[] = [
  { id: 'photo',     icon: Camera, label: 'Photo',     sub: 'Still shot'      },
  { id: 'gif',       icon: Film,   label: 'GIF',        sub: 'Animated loop'   },
  { id: 'boomerang', icon: Repeat, label: 'Boomerang',  sub: 'Fwd + reverse'   },
  { id: 'video',     icon: Video,  label: 'Video',      sub: 'Up to 15 sec'    },
]

export default function ModeSelector({ value, onChange }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {MODES.map(({ id, icon: Icon, label, sub }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={cn(
            'flex-shrink-0 flex flex-col items-center gap-1 px-4 py-2.5 rounded-2xl border-2 transition-all',
            value === id
              ? 'border-white bg-white/20 text-white'
              : 'border-white/20 text-white/60 hover:border-white/40'
          )}
        >
          <Icon size={18} strokeWidth={value === id ? 2.5 : 1.8} />
          <span className="text-xs font-bold">{label}</span>
          <span className="text-[9px] opacity-70">{sub}</span>
        </button>
      ))}
    </div>
  )
}
