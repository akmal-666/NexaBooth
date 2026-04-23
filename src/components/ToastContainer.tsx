import { CheckCircle, XCircle, Info, X } from 'lucide-react'
import { cn } from '../lib/utils'
import type { Toast } from '../hooks/useToast'

const icons = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
}

const colors = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error:   'bg-red-50 border-red-200 text-red-800',
  info:    'bg-primary-50 border-primary-200 text-primary-800',
}

interface Props {
  toasts: Toast[]
  onRemove: (id: string) => void
}

export default function ToastContainer({ toasts, onRemove }: Props) {
  if (!toasts.length) return null
  return (
    <div className="fixed top-4 right-4 left-4 z-50 flex flex-col gap-2 max-w-md mx-auto">
      {toasts.map(t => {
        const Icon = icons[t.type]
        return (
          <div
            key={t.id}
            className={cn(
              'flex items-start gap-3 rounded-2xl border p-4 shadow-card animate-slide-up',
              colors[t.type]
            )}
          >
            <Icon size={18} className="shrink-0 mt-0.5" />
            <p className="flex-1 text-sm font-medium">{t.message}</p>
            <button onClick={() => onRemove(t.id)} className="shrink-0 opacity-60 hover:opacity-100">
              <X size={16} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
