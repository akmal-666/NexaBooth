import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search, Camera, Clock, CheckCircle, XCircle } from 'lucide-react'
import type { Session } from '../types'
import { getSession } from '../lib/api'
import { formatIDR, formatDate, generateSessionCode } from '../lib/utils'
import Spinner from '../components/Spinner'

export default function Gallery() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('session') ?? '')
  const [result, setResult] = useState<Session | null>(null)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')

  // Auto-search if session param provided via QR code
  useEffect(() => {
    const sid = searchParams.get('session')
    if (sid) handleSearch(sid)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSearch(id?: string) {
    const target = (id ?? query).trim()
    if (!target) return
    setSearching(true)
    setError('')
    setResult(null)
    try {
      const session = await getSession(target)
      setResult(session)
    } catch {
      setError('Session not found. Check the code and try again.')
    } finally {
      setSearching(false)
    }
  }

  const statusIcon = (s: Session) => {
    if (s.status === 'completed') return <CheckCircle size={16} className="text-green-600" />
    if (s.status === 'expired')   return <XCircle     size={16} className="text-red-500"   />
    return <Clock size={16} className="text-yellow-500" />
  }

  const statusLabel: Record<string, string> = {
    pending:   'Awaiting Payment',
    paid:      'Ready to Shoot',
    capturing: 'In Progress',
    completed: 'Completed',
    expired:   'Expired',
  }

  return (
    <div className="min-h-full bg-surface">
      {/* Header */}
      <div className="bg-white px-5 pt-12 pb-5 shadow-sm">
        <h1 className="text-2xl font-bold text-primary-900 mb-1">Your Gallery</h1>
        <p className="text-sm text-primary-400 mb-4">Enter your session code or ID to view photos</p>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-400" />
            <input
              type="text"
              placeholder="Session code or ID ..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="input pl-11"
            />
          </div>
          <button
            onClick={() => handleSearch()}
            disabled={searching || !query.trim()}
            className="btn-primary px-5"
          >
            {searching ? <Spinner size="sm" /> : 'Search'}
          </button>
        </div>
      </div>

      <div className="px-5 py-5 space-y-4">
        {error && (
          <div className="card bg-red-50 border border-red-200 text-center py-6">
            <XCircle size={32} className="text-red-400 mx-auto mb-2" />
            <p className="text-red-700 font-medium text-sm">{error}</p>
          </div>
        )}

        {result && (
          <div className="card animate-fade-in space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-bold text-primary-900 text-lg">{result.frame_name}</p>
                <p className="text-sm text-primary-400 capitalize">{result.layout} · {result.photo_count} photos</p>
              </div>
              <div className="flex items-center gap-1.5 text-sm font-medium text-primary-700">
                {statusIcon(result)}
                {statusLabel[result.status]}
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-primary-400">Session code</span>
                <span className="font-mono font-bold text-primary-900">#{generateSessionCode(result.id)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-primary-400">Date</span>
                <span className="text-primary-700">{formatDate(result.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-primary-400">Amount</span>
                <span className="text-primary-700 font-semibold">{formatIDR(result.total_amount)}</span>
              </div>
              {result.paid_at && (
                <div className="flex justify-between">
                  <span className="text-primary-400">Paid at</span>
                  <span className="text-primary-700">{formatDate(result.paid_at)}</span>
                </div>
              )}
            </div>

            <div className="pt-2 grid grid-cols-2 gap-3">
              {result.status === 'completed' && (
                <button
                  onClick={() => navigate(`/print/${result.id}`)}
                  className="btn-primary col-span-2"
                >
                  View & Download Photos
                </button>
              )}
              {result.status === 'paid' && (
                <button
                  onClick={() => navigate(`/capture/${result.id}`)}
                  className="btn-primary col-span-2"
                >
                  <Camera size={18} /> Start Shooting
                </button>
              )}
              {result.status === 'pending' && (
                <button
                  onClick={() => navigate(`/payment/${result.id}`)}
                  className="btn-accent col-span-2"
                >
                  Complete Payment
                </button>
              )}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!result && !error && !searching && (
          <div className="flex flex-col items-center py-16 gap-4">
            <div className="h-24 w-24 rounded-full bg-primary-50 flex items-center justify-center">
              <Camera size={40} className="text-primary-300" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-primary-900">No photos yet</p>
              <p className="text-sm text-primary-400 mt-1">
                Enter your session code above, or scan the QR code from your print
              </p>
            </div>
            <button onClick={() => navigate('/frames')} className="btn-primary mt-2">
              Book a Session
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
