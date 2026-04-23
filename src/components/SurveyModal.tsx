import { useState } from 'react'
import { Star, X } from 'lucide-react'
import { submitSurvey } from '../lib/api'
import Spinner from './Spinner'

interface Props {
  sessionId: string
  onClose: () => void
}

export default function SurveyModal({ sessionId, onClose }: Props) {
  const [rating, setRating]   = useState(0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState('')
  const [email, setEmail]     = useState('')
  const [saving, setSaving]   = useState(false)
  const [done, setDone]       = useState(false)

  async function handleSubmit() {
    if (!rating) return
    setSaving(true)
    try {
      await submitSurvey(sessionId, { rating, comment, email })
      setDone(true)
      setTimeout(onClose, 1800)
    } catch {
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const labels = ['', 'Poor', 'Fair', 'Good', 'Great', 'Amazing!']

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-5">
      <div className="bg-white rounded-3xl w-full max-w-sm animate-slide-up shadow-xl">
        {done ? (
          <div className="flex flex-col items-center gap-3 p-8">
            <div className="text-5xl">🎉</div>
            <p className="font-bold text-xl text-primary-900">Thank you!</p>
            <p className="text-primary-400 text-sm text-center">Your feedback means a lot to us.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <h2 className="font-bold text-lg text-primary-900">How was your experience?</h2>
              <button onClick={onClose} className="text-primary-300 hover:text-primary-700">
                <X size={20} />
              </button>
            </div>

            <div className="px-5 pb-6 space-y-4">
              {/* Stars */}
              <div className="flex flex-col items-center gap-2">
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      onMouseEnter={() => setHovered(n)}
                      onMouseLeave={() => setHovered(0)}
                      onClick={() => setRating(n)}
                    >
                      <Star
                        size={36}
                        className="transition-colors"
                        fill={(hovered || rating) >= n ? '#FF7B54' : 'none'}
                        stroke={(hovered || rating) >= n ? '#FF7B54' : '#D1D5DB'}
                        strokeWidth={1.5}
                      />
                    </button>
                  ))}
                </div>
                <span className="text-sm font-semibold text-primary-500 min-h-[20px]">
                  {labels[hovered || rating]}
                </span>
              </div>

              <textarea
                placeholder="Tell us more (optional)"
                value={comment}
                onChange={e => setComment(e.target.value)}
                className="input resize-none text-sm"
                rows={3}
              />

              <input
                type="email"
                placeholder="Email for promotions (optional)"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input text-sm"
              />

              <div className="flex gap-3">
                <button onClick={onClose} className="btn-ghost flex-1 py-3 text-sm">
                  Skip
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!rating || saving}
                  className="btn-accent flex-1 py-3 text-sm"
                >
                  {saving ? <Spinner size="sm" /> : 'Submit'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
