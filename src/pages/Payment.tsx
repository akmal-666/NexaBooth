import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, CreditCard, Smartphone, Wallet, CheckCircle } from 'lucide-react'
import type { Session } from '../types'
import { getSession, createPayment, confirmMockPayment } from '../lib/api'
import { formatIDR, formatDate } from '../lib/utils'
import Spinner from '../components/Spinner'

type Step = 'summary' | 'method' | 'processing' | 'done'
type Method = 'card' | 'ewallet' | 'transfer' | 'mock'

export default function Payment() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<Step>('summary')
  const [method, setMethod] = useState<Method>('mock')
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!sessionId) return
    getSession(sessionId)
      .then(s => {
        if (s.payment_status === 'paid') {
          navigate(`/capture/${sessionId}`, { replace: true })
          return
        }
        setSession(s)
      })
      .catch(() => setError('Session not found'))
      .finally(() => setLoading(false))
  }, [sessionId, navigate])

  async function handlePay() {
    if (!sessionId || !session) return
    setProcessing(true)
    setError('')
    setStep('processing')

    try {
      const result = await createPayment(sessionId)

      if (result.mode === 'midtrans') {
        // Load Midtrans Snap script and open popup
        const snap = (window as unknown as { snap?: { pay: (token: string, opts: unknown) => void } }).snap
        if (snap) {
          snap.pay(result.token, {
            onSuccess: () => navigate(`/capture/${sessionId}`),
            onPending: () => navigate(`/capture/${sessionId}`),
            onError: () => { setError('Payment failed'); setStep('method') },
            onClose: () => { setStep('method') },
          })
        } else {
          window.location.href = result.redirectUrl
        }
        return
      }

      // Mock payment flow
      await new Promise(r => setTimeout(r, 1500))
      await confirmMockPayment(sessionId)
      setStep('done')
    } catch {
      setError('Payment failed. Please try again.')
      setStep('method')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <Spinner size="lg" />
    </div>
  )

  if (!session) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-surface px-6">
      <p className="text-primary-400 text-center">{error || 'Session not found.'}</p>
      <button onClick={() => navigate('/frames')} className="btn-primary">Back to Frames</button>
    </div>
  )

  return (
    <div className="min-h-screen bg-surface flex flex-col max-w-md mx-auto">
      {/* Header */}
      <div className="bg-white px-5 pt-12 pb-5 shadow-sm flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 rounded-2xl hover:bg-surface transition">
          <ArrowLeft size={20} className="text-primary-900" />
        </button>
        <h1 className="font-bold text-xl text-primary-900">
          {step === 'done' ? 'Payment Complete' : 'Checkout'}
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        {/* Order summary */}
        <div className="card">
          <h2 className="font-semibold text-primary-900 mb-3">Order Summary</h2>
          <div className="flex items-center justify-between py-2 border-b border-surface">
            <div>
              <p className="font-medium text-primary-900">{session.frame_name}</p>
              <p className="text-sm text-primary-400 capitalize">{session.layout} layout · {session.photo_count} photos</p>
            </div>
            <p className="font-semibold text-primary-900">{formatIDR(session.total_amount)}</p>
          </div>
          <div className="flex items-center justify-between pt-3">
            <p className="font-bold text-primary-900">Total</p>
            <p className="font-bold text-xl text-primary-900">{formatIDR(session.total_amount)}</p>
          </div>
        </div>

        {/* Session info */}
        <div className="card space-y-2">
          <h3 className="font-semibold text-primary-900 mb-1">Session Details</h3>
          <div className="flex justify-between text-sm">
            <span className="text-primary-400">Session ID</span>
            <span className="font-mono text-primary-700 text-xs">{session.id.slice(-8).toUpperCase()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-primary-400">Created</span>
            <span className="text-primary-700">{formatDate(session.created_at)}</span>
          </div>
          {session.expires_at && (
            <div className="flex justify-between text-sm">
              <span className="text-primary-400">Expires</span>
              <span className="text-primary-700">{formatDate(session.expires_at)}</span>
            </div>
          )}
        </div>

        {/* Payment method */}
        {(step === 'summary' || step === 'method') && (
          <div className="card space-y-3">
            <h3 className="font-semibold text-primary-900">Payment Method</h3>

            {([
              { id: 'mock',     icon: Wallet,      label: 'Demo / Test Payment',   sub: 'Skip payment — for testing'  },
              { id: 'card',     icon: CreditCard,   label: 'Credit / Debit Card',   sub: 'Visa, Mastercard, JCB'       },
              { id: 'ewallet',  icon: Smartphone,   label: 'E-Wallet',              sub: 'GoPay, OVO, Dana, ShopeePay' },
              { id: 'transfer', icon: Wallet,        label: 'Bank Transfer',         sub: 'BCA, Mandiri, BNI, BRI'      },
            ] as const).map(({ id, icon: Icon, label, sub }) => (
              <button
                key={id}
                onClick={() => setMethod(id as Method)}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                  method === id
                    ? 'border-primary-900 bg-primary-50'
                    : 'border-primary-100 hover:border-primary-300'
                }`}
              >
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                  method === id ? 'bg-primary-900 text-white' : 'bg-surface text-primary-400'
                }`}>
                  <Icon size={20} />
                </div>
                <div>
                  <p className="font-semibold text-primary-900 text-sm">{label}</p>
                  <p className="text-xs text-primary-400">{sub}</p>
                </div>
                <div className={`ml-auto h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                  method === id ? 'border-primary-900' : 'border-primary-200'
                }`}>
                  {method === id && <div className="h-2.5 w-2.5 rounded-full bg-primary-900" />}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Processing */}
        {step === 'processing' && (
          <div className="card flex flex-col items-center py-10 gap-4">
            <Spinner size="lg" />
            <p className="font-semibold text-primary-900">Processing payment…</p>
            <p className="text-sm text-primary-400">Please wait</p>
          </div>
        )}

        {/* Done */}
        {step === 'done' && (
          <div className="card flex flex-col items-center py-10 gap-4 animate-fade-in">
            <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle size={40} className="text-green-600" />
            </div>
            <p className="font-bold text-xl text-primary-900">Payment Successful!</p>
            <p className="text-primary-400 text-center text-sm">
              Your session is ready. Let's take some photos!
            </p>
            <button
              onClick={() => navigate(`/capture/${sessionId}`)}
              className="btn-primary w-full mt-2"
            >
              Start Photo Session
            </button>
          </div>
        )}

        {error && (
          <p className="text-red-600 text-sm text-center bg-red-50 rounded-2xl p-3">{error}</p>
        )}
      </div>

      {/* Pay button */}
      {(step === 'summary' || step === 'method') && (
        <div className="bg-white border-t border-primary-100 px-5 py-4">
          <button
            onClick={handlePay}
            disabled={processing}
            className="btn-accent w-full text-base"
          >
            {processing ? <Spinner size="sm" /> : <>Pay {formatIDR(session.total_amount)}</>}
          </button>
        </div>
      )}
    </div>
  )
}
