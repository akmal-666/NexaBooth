import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Printer, Download, Share2, QrCode, CheckCircle, Home } from 'lucide-react'
import QRCode from 'qrcode'
import type { Session, PhotoFilter } from '../types'
import { getSession, getPhotos, updateSession } from '../lib/api'
import { renderComposite, printImage } from '../lib/print'
import { dataURLtoBlob, downloadBlob, generateSessionCode } from '../lib/utils'
import Spinner from '../components/Spinner'
import PhotoStrip from '../components/PhotoStrip'

export default function PrintPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const [session, setSession] = useState<Session | null>(null)
  const [photos, setPhotos] = useState<(string | null)[]>([])
  const [filter, setFilter] = useState<PhotoFilter>('normal')
  const [composite, setComposite] = useState<string | null>(null)
  const [qrData, setQrData] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [rendering, setRendering] = useState(false)
  const [printing, setPrinting] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [error, setError] = useState('')
  const printRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    if (!sessionId) return
    Promise.all([getSession(sessionId), getPhotos(sessionId)])
      .then(async ([sess, dbPhotos]) => {
        setSession(sess)
        const arr: (string | null)[] = Array(sess.photo_count ?? dbPhotos.length).fill(null)
        dbPhotos.forEach(p => { if (p.data) arr[p.photo_index] = p.data })
        setPhotos(arr)
        if (dbPhotos[0]?.filter) setFilter(dbPhotos[0].filter as PhotoFilter)

        // Generate QR code
        const sessionUrl = `${window.location.origin}/gallery?session=${sess.id}`
        const qr = await QRCode.toDataURL(sessionUrl, { width: 200, margin: 1 })
        setQrData(qr)
      })
      .catch(() => setError('Could not load session'))
      .finally(() => setLoading(false))
  }, [sessionId])

  useEffect(() => {
    if (!session || photos.every(p => !p)) return
    setRendering(true)
    renderComposite(
      photos.filter(Boolean) as string[],
      session.layout ?? 'strip',
      {
        filter,
        borderColor: session.border_color ?? '#FFFFFF',
        accentColor: session.accent_color ?? '#1E2A6E',
        footerText: `NexaBooth · ${generateSessionCode(session.id)}`,
      }
    )
      .then(setComposite)
      .catch(() => setError('Could not render composite'))
      .finally(() => setRendering(false))
  }, [session, photos, filter]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handlePrint() {
    if (!composite) return
    setPrinting(true)
    try {
      printImage(composite)
      if (sessionId && !completed) {
        await updateSession(sessionId, { status: 'completed' })
        setCompleted(true)
      }
    } finally {
      setPrinting(false)
    }
  }

  async function handleDownload() {
    if (!composite) return
    const blob = dataURLtoBlob(composite)
    const code = generateSessionCode(sessionId ?? 'session')
    downloadBlob(blob, `nexabooth-${code}.jpg`)
    if (sessionId && !completed) {
      await updateSession(sessionId, { status: 'completed' })
      setCompleted(true)
    }
  }

  async function handleShare() {
    if (!composite) return
    const blob = dataURLtoBlob(composite)
    const file = new File([blob], 'nexabooth.jpg', { type: 'image/jpeg' })
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: 'My NexaBooth Photo' })
    } else {
      handleDownload()
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
      <button onClick={() => navigate('/')} className="btn-primary">Go Home</button>
    </div>
  )

  const sessionCode = generateSessionCode(session.id)

  return (
    <div className="min-h-screen bg-surface flex flex-col max-w-md mx-auto lg:max-w-2xl">
      {/* Header */}
      <div className="bg-white px-5 pt-12 pb-4 shadow-sm flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 rounded-2xl hover:bg-surface transition">
          <ArrowLeft size={20} className="text-primary-900" />
        </button>
        <div>
          <h1 className="font-bold text-xl text-primary-900">Your Photos</h1>
          <p className="text-xs text-primary-400">Session #{sessionCode}</p>
        </div>
        {completed && (
          <div className="ml-auto flex items-center gap-1 text-green-600 text-sm font-semibold">
            <CheckCircle size={16} />
            Done
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
        {/* Composite preview */}
        <div className="card flex flex-col items-center gap-4">
          {rendering ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <Spinner />
              <p className="text-sm text-primary-400">Rendering your photo…</p>
            </div>
          ) : composite ? (
            <>
              <img
                ref={printRef}
                src={composite}
                alt="Photo composite"
                className="max-w-full rounded-2xl shadow-card"
                style={{ maxHeight: 480, objectFit: 'contain' }}
              />
              {/* Hidden print area */}
              <div id="print-area" className="hidden">
                <img src={composite} alt="print" style={{ maxWidth: '100%' }} />
              </div>
            </>
          ) : (
            <PhotoStrip
              photos={photos}
              layout={session.layout ?? 'strip'}
              filter={filter}
              borderColor={session.border_color ?? '#FFFFFF'}
              accentColor={session.accent_color ?? '#1E2A6E'}
            />
          )}
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={handlePrint}
            disabled={!composite || printing}
            className="card flex flex-col items-center gap-2 py-4 hover:shadow-card-hover transition active:scale-95"
          >
            {printing ? <Spinner size="sm" /> : <Printer size={24} className="text-primary-900" />}
            <span className="text-xs font-semibold text-primary-900">Print</span>
          </button>
          <button
            onClick={handleDownload}
            disabled={!composite}
            className="card flex flex-col items-center gap-2 py-4 hover:shadow-card-hover transition active:scale-95"
          >
            <Download size={24} className="text-primary-900" />
            <span className="text-xs font-semibold text-primary-900">Download</span>
          </button>
          <button
            onClick={handleShare}
            disabled={!composite}
            className="card flex flex-col items-center gap-2 py-4 hover:shadow-card-hover transition active:scale-95"
          >
            <Share2 size={24} className="text-primary-900" />
            <span className="text-xs font-semibold text-primary-900">Share</span>
          </button>
        </div>

        {/* QR Code */}
        {qrData && (
          <div className="card flex flex-col items-center gap-3">
            <div className="flex items-center gap-2">
              <QrCode size={18} className="text-primary-700" />
              <h3 className="font-semibold text-primary-900">Scan to Download</h3>
            </div>
            <img src={qrData} alt="QR code" className="w-40 h-40 rounded-2xl" />
            <p className="text-xs text-primary-400 text-center">
              Scan with your phone to access your digital photos
            </p>
            <p className="font-mono text-sm font-bold text-primary-700 bg-primary-50 px-4 py-2 rounded-xl">
              #{sessionCode}
            </p>
          </div>
        )}

        {/* Canon printer tip */}
        <div className="card bg-primary-50 border border-primary-100">
          <h4 className="font-semibold text-primary-900 text-sm mb-1">Canon Printer Tip</h4>
          <p className="text-xs text-primary-500 leading-relaxed">
            For Canon SELPHY or PIXMA: tap <strong>Print</strong> above and select your Canon
            printer from the dialog. Set paper size to <strong>{session.layout === 'strip' ? '2×6″' : '4×6″'}</strong>
            {' '}and disable margins for best results. Canon SELPHY CP series supports AirPrint wirelessly.
          </p>
        </div>

        {error && (
          <p className="text-red-600 text-sm text-center bg-red-50 rounded-2xl p-3">{error}</p>
        )}
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-primary-100 px-5 py-4">
        <button
          onClick={() => navigate('/')}
          className="btn-ghost w-full"
        >
          <Home size={18} />
          Back to Home
        </button>
      </div>
    </div>
  )
}
