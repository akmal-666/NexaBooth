import { cn } from '../lib/utils'

export interface VirtualBg {
  id: string
  label: string
  value: string // CSS gradient or image URL
  preview: string // CSS background for the chip
}

export const VIRTUAL_BACKGROUNDS: VirtualBg[] = [
  { id: 'none',     label: 'None',      value: '',
    preview: 'repeating-conic-gradient(#ccc 0% 25%, #eee 0% 50%) 0 0/16px 16px' },
  { id: 'galaxy',   label: 'Galaxy',    value: 'linear-gradient(135deg,#0f0c29,#302b63,#24243e)',
    preview: 'linear-gradient(135deg,#0f0c29,#302b63,#24243e)' },
  { id: 'sunset',   label: 'Sunset',    value: 'linear-gradient(180deg,#FF7B54,#FFB26B,#FFD56B)',
    preview: 'linear-gradient(180deg,#FF7B54,#FFB26B,#FFD56B)' },
  { id: 'ocean',    label: 'Ocean',     value: 'linear-gradient(135deg,#43cea2,#185a9d)',
    preview: 'linear-gradient(135deg,#43cea2,#185a9d)' },
  { id: 'forest',   label: 'Forest',    value: 'linear-gradient(180deg,#134e5e,#71b280)',
    preview: 'linear-gradient(180deg,#134e5e,#71b280)' },
  { id: 'studio',   label: 'Studio',    value: 'linear-gradient(135deg,#232526,#414345)',
    preview: 'linear-gradient(135deg,#232526,#414345)' },
  { id: 'bloom',    label: 'Bloom',     value: 'linear-gradient(135deg,#f093fb,#f5576c)',
    preview: 'linear-gradient(135deg,#f093fb,#f5576c)' },
  { id: 'skyline',  label: 'Skyline',   value: 'linear-gradient(180deg,#2193b0,#6dd5ed)',
    preview: 'linear-gradient(180deg,#2193b0,#6dd5ed)' },
]

interface Props {
  selectedId: string
  onSelect: (bg: VirtualBg) => void
}

export default function BackgroundPicker({ selectedId, onSelect }: Props) {
  return (
    <div className="flex gap-2.5 overflow-x-auto pb-1">
      {VIRTUAL_BACKGROUNDS.map(bg => (
        <button
          key={bg.id}
          onClick={() => onSelect(bg)}
          title={bg.label}
          className={cn(
            'flex-shrink-0 flex flex-col items-center gap-1.5 transition-transform',
            selectedId === bg.id && 'scale-110'
          )}
        >
          <div
            className={cn(
              'w-12 h-12 rounded-xl border-2 transition-all',
              selectedId === bg.id ? 'border-white' : 'border-white/20'
            )}
            style={{ background: bg.preview }}
          />
          <span className={cn(
            'text-[9px] font-semibold',
            selectedId === bg.id ? 'text-white' : 'text-white/50'
          )}>
            {bg.label}
          </span>
        </button>
      ))}
    </div>
  )
}
