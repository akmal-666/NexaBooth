import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart3, Users, DollarSign, TrendingUp,
  ChevronRight, Plus, Pencil, ToggleLeft, ToggleRight, Lock,
  Download, Settings, Star, Monitor, SlidersHorizontal,
} from 'lucide-react'
import type { Frame, Session, Analytics, AppSettings } from '../types'
import {
  getAdminStats, getAdminSessions, getAdminFrames,
  updateAdminFrame, createAdminFrame,
  getAnalytics, exportCsv, getSettings, updateSettings,
} from '../lib/api'
import { formatIDR, formatDate, generateSessionCode } from '../lib/utils'
import Spinner from '../components/Spinner'

type Tab = 'dashboard' | 'sessions' | 'frames' | 'analytics' | 'settings'

interface Stats {
  sessions: { total: number; paid: number }
  revenue:  { total: number }
  today:    { count: number }
}

const STATUS_BADGE: Record<string, string> = {
  pending:   'badge-pending',
  paid:      'badge-info',
  capturing: 'badge-info',
  completed: 'badge-success',
  expired:   'badge-error',
}

export default function Admin() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState('')
  const [tab, setTab] = useState<Tab>('dashboard')
  const [stats, setStats] = useState<Stats | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [frames, setFrames] = useState<Frame[]>([])
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [loading, setLoading] = useState(false)
  const [showFrameForm, setShowFrameForm] = useState(false)
  const [editFrame, setEditFrame] = useState<Frame | null>(null)
  const [exportingCsv, setExportingCsv] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setAuthError('')
    try {
      const data = await getAdminStats(password)
      setStats(data)
      sessionStorage.setItem('adminPw', password)
      setAuthed(true)
    } catch {
      setAuthError('Invalid password')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!authed) return
    if (tab === 'dashboard') loadStats()
    if (tab === 'sessions')  loadSessions()
    if (tab === 'frames')    loadFrames()
    if (tab === 'analytics') loadAnalytics()
    if (tab === 'settings')  loadSettings()
  }, [authed, tab]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadStats() {
    setLoading(true)
    try { setStats(await getAdminStats(password)) }
    finally { setLoading(false) }
  }

  async function loadSessions() {
    setLoading(true)
    try {
      const data = await getAdminSessions(password)
      setSessions(data.sessions)
    } finally { setLoading(false) }
  }

  async function loadFrames() {
    setLoading(true)
    try {
      const data = await getAdminFrames(password)
      setFrames(data.frames)
    } finally { setLoading(false) }
  }

  async function loadAnalytics() {
    setLoading(true)
    try { setAnalytics(await getAnalytics(password)) }
    finally { setLoading(false) }
  }

  async function loadSettings() {
    setLoading(true)
    try { setSettings(await getSettings(password)) }
    finally { setLoading(false) }
  }

  async function toggleFrame(frame: Frame) {
    await updateAdminFrame(password, frame.id, { isActive: frame.is_active ? 0 : 1 })
    loadFrames()
  }

  async function handleExportCsv() {
    setExportingCsv(true)
    try {
      const csv = await exportCsv(password)
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `nexabooth-sessions-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Export failed')
    } finally {
      setExportingCsv(false)
    }
  }

  async function handleSaveSettings() {
    if (!settings) return
    setSavingSettings(true)
    try {
      await updateSettings(password, settings)
    } finally {
      setSavingSettings(false)
    }
  }

  // ── Login screen ──────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-5">
        <div className="card w-full max-w-sm space-y-5">
          <div className="flex flex-col items-center gap-2">
            <div className="h-14 w-14 rounded-2xl bg-primary-900 flex items-center justify-center">
              <Lock size={24} className="text-white" />
            </div>
            <h1 className="font-bold text-xl text-primary-900">Admin Access</h1>
            <p className="text-sm text-primary-400 text-center">Enter your admin password to continue</p>
          </div>
          <form onSubmit={handleAuth} className="space-y-3">
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="input"
              autoFocus
            />
            {authError && <p className="text-red-600 text-sm text-center">{authError}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? <Spinner size="sm" /> : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dash',      icon: <BarChart3 size={14} /> },
    { id: 'sessions',  label: 'Sessions',  icon: <Users size={14} /> },
    { id: 'frames',    label: 'Frames',    icon: <Monitor size={14} /> },
    { id: 'analytics', label: 'Analytics', icon: <TrendingUp size={14} /> },
    { id: 'settings',  label: 'Settings',  icon: <Settings size={14} /> },
  ]

  // ── Main admin UI ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-full bg-surface">
      {/* Header */}
      <div className="bg-white px-5 pt-12 pb-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-bold text-xl text-primary-900">Admin Dashboard</h1>
          <button
            onClick={() => { setAuthed(false); sessionStorage.removeItem('adminPw') }}
            className="text-sm text-primary-400 hover:text-primary-700"
          >
            Sign out
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-surface rounded-2xl p-1 overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-shrink-0 flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                tab === t.id ? 'bg-white text-primary-900 shadow-sm' : 'text-primary-400'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 py-5 space-y-4">
        {/* ── Dashboard ── */}
        {tab === 'dashboard' && stats && (
          <>
            <div className="grid grid-cols-2 gap-4">
              {[
                {
                  icon: DollarSign, label: 'Total Revenue', color: 'bg-green-100 text-green-700',
                  value: formatIDR(stats.revenue.total ?? 0),
                },
                {
                  icon: Users, label: 'Total Sessions', color: 'bg-blue-100 text-blue-700',
                  value: String(stats.sessions.total ?? 0),
                },
                {
                  icon: TrendingUp, label: 'Paid Sessions', color: 'bg-purple-100 text-purple-700',
                  value: String(stats.sessions.paid ?? 0),
                },
                {
                  icon: BarChart3, label: 'Today', color: 'bg-orange-100 text-orange-700',
                  value: String(stats.today.count ?? 0),
                },
              ].map(({ icon: Icon, label, color, value }) => (
                <div key={label} className="card">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
                    <Icon size={20} />
                  </div>
                  <p className="text-xl font-bold text-primary-900">{value}</p>
                  <p className="text-xs text-primary-400 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            <div className="card">
              <h3 className="font-semibold text-primary-900 mb-3">Quick Actions</h3>
              {[
                { label: 'Manage Frames', action: () => setTab('frames') },
                { label: 'View Sessions', action: () => setTab('sessions') },
                { label: 'Analytics', action: () => setTab('analytics') },
                { label: 'Slideshow', action: () => window.open('/slideshow', '_blank') },
                { label: 'Kiosk Mode', action: () => window.open('/kiosk', '_blank') },
              ].map(({ label, action }) => (
                <button
                  key={label}
                  onClick={action}
                  className="w-full flex items-center justify-between py-3 border-b border-surface last:border-0"
                >
                  <span className="font-medium text-primary-900 text-sm">{label}</span>
                  <ChevronRight size={16} className="text-primary-400" />
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── Sessions ── */}
        {tab === 'sessions' && (
          <>
            <button
              onClick={handleExportCsv}
              disabled={exportingCsv}
              className="btn-ghost w-full flex items-center gap-2"
            >
              {exportingCsv ? <Spinner size="sm" /> : <Download size={16} />}
              Export CSV
            </button>
            {loading ? (
              <div className="flex justify-center py-12"><Spinner /></div>
            ) : sessions.length === 0 ? (
              <p className="text-center text-primary-400 py-12">No sessions yet</p>
            ) : (
              <div className="space-y-3">
                {sessions.map(s => (
                  <button
                    key={s.id}
                    onClick={() => navigate(`/print/${s.id}`)}
                    className="card w-full text-left hover:shadow-card-hover transition active:scale-[0.98]"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-primary-900">{s.frame_name}</p>
                        <p className="text-xs text-primary-400 font-mono">#{generateSessionCode(s.id)}</p>
                      </div>
                      <span className={STATUS_BADGE[s.status] ?? 'badge badge-info'}>
                        {s.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-primary-400">
                      <span>{formatDate(s.created_at)}</span>
                      <span className="font-semibold text-primary-700">{formatIDR(s.total_amount)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Frames ── */}
        {tab === 'frames' && (
          <>
            <button
              onClick={() => { setEditFrame(null); setShowFrameForm(true) }}
              className="btn-primary w-full"
            >
              <Plus size={18} /> Add New Frame
            </button>

            {loading ? (
              <div className="flex justify-center py-12"><Spinner /></div>
            ) : (
              <div className="space-y-3">
                {frames.map(f => (
                  <div key={f.id} className="card">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div
                          className="h-12 w-12 rounded-xl flex-shrink-0"
                          style={{ backgroundColor: f.accent_color }}
                        />
                        <div>
                          <p className="font-semibold text-primary-900">{f.name}</p>
                          <p className="text-xs text-primary-400 capitalize">{f.layout} · {f.photo_count} photos</p>
                          <p className="text-sm font-bold text-primary-700 mt-0.5">{formatIDR(f.price)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setEditFrame(f); setShowFrameForm(true) }}
                          className="p-2 rounded-xl hover:bg-surface transition"
                        >
                          <Pencil size={16} className="text-primary-500" />
                        </button>
                        <button onClick={() => toggleFrame(f)} className="p-2 rounded-xl hover:bg-surface transition">
                          {f.is_active
                            ? <ToggleRight size={22} className="text-green-500" />
                            : <ToggleLeft  size={22} className="text-primary-300" />}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Analytics ── */}
        {tab === 'analytics' && (
          <>
            {loading ? (
              <div className="flex justify-center py-12"><Spinner /></div>
            ) : analytics ? (
              <>
                {/* Rating summary */}
                {analytics.ratings.total > 0 && (
                  <div className="card flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-yellow-100 flex items-center justify-center">
                      <Star size={24} className="text-yellow-500 fill-yellow-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-primary-900">
                        {analytics.ratings.avg.toFixed(1)}
                        <span className="text-sm text-primary-400 font-normal"> / 5</span>
                      </p>
                      <p className="text-xs text-primary-400">{analytics.ratings.total} reviews</p>
                    </div>
                  </div>
                )}

                {/* Daily revenue chart */}
                <div className="card">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-primary-900">Daily Revenue (last 14 days)</h3>
                    <button
                      onClick={handleExportCsv}
                      disabled={exportingCsv}
                      className="flex items-center gap-1 text-xs text-primary-500 hover:text-primary-900"
                    >
                      <Download size={14} />
                      CSV
                    </button>
                  </div>
                  {analytics.daily.length === 0 ? (
                    <p className="text-primary-400 text-sm text-center py-6">No data yet</p>
                  ) : (
                    <div className="space-y-2">
                      {(() => {
                        const maxRevenue = Math.max(...analytics.daily.map(d => d.revenue), 1)
                        return analytics.daily.map(d => (
                          <div key={d.date} className="flex items-center gap-3">
                            <span className="text-xs text-primary-400 w-20 flex-shrink-0">
                              {new Date(d.date).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })}
                            </span>
                            <div className="flex-1 bg-surface rounded-full h-5 overflow-hidden">
                              <div
                                className="h-full bg-accent rounded-full flex items-center px-2 transition-all"
                                style={{ width: `${(d.revenue / maxRevenue) * 100}%`, minWidth: d.revenue > 0 ? '2rem' : 0 }}
                              >
                                {d.revenue > 0 && (
                                  <span className="text-white text-[9px] font-bold truncate">
                                    {d.count}×
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="text-xs font-semibold text-primary-700 w-24 text-right flex-shrink-0">
                              {formatIDR(d.revenue)}
                            </span>
                          </div>
                        ))
                      })()}
                    </div>
                  )}
                </div>

                {/* Top frames */}
                {analytics.topFrames.length > 0 && (
                  <div className="card">
                    <h3 className="font-semibold text-primary-900 mb-4">Top Frames</h3>
                    <div className="space-y-3">
                      {analytics.topFrames.map((f, i) => (
                        <div key={f.frame_name} className="flex items-center gap-3">
                          <span className="h-7 w-7 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                            {i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-primary-900 text-sm truncate">{f.frame_name}</p>
                            <p className="text-xs text-primary-400">{f.count} sessions</p>
                          </div>
                          <span className="text-sm font-bold text-primary-700 flex-shrink-0">
                            {formatIDR(f.revenue)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-center text-primary-400 py-12">No analytics data</p>
            )}
          </>
        )}

        {/* ── Settings ── */}
        {tab === 'settings' && (
          <>
            {loading ? (
              <div className="flex justify-center py-12"><Spinner /></div>
            ) : settings ? (
              <>
                {/* Watermark */}
                <div className="card space-y-4">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal size={18} className="text-primary-500" />
                    <h3 className="font-semibold text-primary-900">Watermark / Branding</h3>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-primary-900">Enable watermark</span>
                    <button
                      onClick={() => setSettings(s => s ? { ...s, watermark_enabled: s.watermark_enabled === '1' ? '0' : '1' } : s)}
                      className="p-1"
                    >
                      {settings.watermark_enabled === '1'
                        ? <ToggleRight size={26} className="text-green-500" />
                        : <ToggleLeft  size={26} className="text-primary-300" />}
                    </button>
                  </div>

                  {settings.watermark_enabled === '1' && (
                    <>
                      <div>
                        <label className="text-xs font-semibold text-primary-500 uppercase tracking-wide">Watermark text</label>
                        <input
                          value={settings.watermark_text}
                          onChange={e => setSettings(s => s ? { ...s, watermark_text: e.target.value } : s)}
                          className="input mt-1"
                          placeholder="NexaBooth"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-primary-500 uppercase tracking-wide">
                          Opacity: {Math.round(Number(settings.watermark_opacity) * 100)}%
                        </label>
                        <input
                          type="range"
                          min="0.05"
                          max="0.8"
                          step="0.05"
                          value={settings.watermark_opacity}
                          onChange={e => setSettings(s => s ? { ...s, watermark_opacity: e.target.value } : s)}
                          className="w-full mt-2 accent-accent"
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Delivery settings */}
                <div className="card space-y-4">
                  <div className="flex items-center gap-2">
                    <Settings size={18} className="text-primary-500" />
                    <h3 className="font-semibold text-primary-900">Delivery Features</h3>
                  </div>

                  {[
                    { key: 'email_enabled' as keyof AppSettings, label: 'Email delivery' },
                    { key: 'sms_enabled'   as keyof AppSettings, label: 'SMS / WhatsApp delivery' },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-primary-900">{label}</span>
                      <button
                        onClick={() => setSettings(s => s ? { ...s, [key]: s[key] === '1' ? '0' : '1' } : s)}
                        className="p-1"
                      >
                        {settings[key] === '1'
                          ? <ToggleRight size={26} className="text-green-500" />
                          : <ToggleLeft  size={26} className="text-primary-300" />}
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  className="btn-primary w-full"
                >
                  {savingSettings ? <Spinner size="sm" /> : 'Save Settings'}
                </button>
              </>
            ) : (
              <p className="text-center text-primary-400 py-12">Failed to load settings</p>
            )}
          </>
        )}
      </div>

      {/* Frame form modal */}
      {showFrameForm && (
        <FrameFormModal
          frame={editFrame}
          password={password}
          onClose={() => setShowFrameForm(false)}
          onSaved={() => { setShowFrameForm(false); loadFrames() }}
        />
      )}
    </div>
  )
}

// ── Frame form modal ───────────────────────────────────────────────────────
interface FrameFormProps {
  frame: Frame | null
  password: string
  onClose: () => void
  onSaved: () => void
}

function FrameFormModal({ frame, password, onClose, onSaved }: FrameFormProps) {
  const [name, setName]               = useState(frame?.name ?? '')
  const [description, setDescription] = useState(frame?.description ?? '')
  const [layout, setLayout]           = useState(frame?.layout ?? 'strip')
  const [photoCount, setPhotoCount]   = useState(frame?.photo_count ?? 4)
  const [price, setPrice]             = useState(frame?.price ?? 50000)
  const [borderColor, setBorderColor] = useState(frame?.border_color ?? '#FFFFFF')
  const [accentColor, setAccentColor] = useState(frame?.accent_color ?? '#1E2A6E')
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState('')

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (frame) {
        await updateAdminFrame(password, frame.id, {
          name, description, layout: layout as Frame['layout'],
          photoCount, price, borderColor, accentColor,
        })
      } else {
        await createAdminFrame(password, {
          name, description, layout: layout as Frame['layout'],
          photoCount, price, borderColor, accentColor,
        })
      }
      onSaved()
    } catch {
      setError('Failed to save frame')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="px-5 pt-5 pb-3 flex items-center justify-between">
          <h2 className="font-bold text-lg text-primary-900">{frame ? 'Edit Frame' : 'Add Frame'}</h2>
          <button onClick={onClose} className="text-primary-400 hover:text-primary-700">✕</button>
        </div>

        <form onSubmit={handleSave} className="px-5 pb-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-primary-500 uppercase tracking-wide">Name</label>
            <input value={name} onChange={e => setName(e.target.value)} className="input mt-1" required />
          </div>
          <div>
            <label className="text-xs font-semibold text-primary-500 uppercase tracking-wide">Description</label>
            <input value={description} onChange={e => setDescription(e.target.value)} className="input mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-primary-500 uppercase tracking-wide">Layout</label>
              <select value={layout} onChange={e => setLayout(e.target.value as Frame['layout'])} className="input mt-1">
                {['solo','double','strip','quad','triptych'].map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-primary-500 uppercase tracking-wide">Photos</label>
              <input type="number" min={1} max={6} value={photoCount}
                onChange={e => setPhotoCount(Number(e.target.value))} className="input mt-1" required />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-primary-500 uppercase tracking-wide">Price (IDR)</label>
            <input type="number" min={1000} step={1000} value={price}
              onChange={e => setPrice(Number(e.target.value))} className="input mt-1" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-primary-500 uppercase tracking-wide">Border</label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={borderColor} onChange={e => setBorderColor(e.target.value)}
                  className="h-10 w-10 rounded-xl border border-primary-200 cursor-pointer" />
                <input value={borderColor} onChange={e => setBorderColor(e.target.value)} className="input flex-1 text-sm" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-primary-500 uppercase tracking-wide">Accent</label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)}
                  className="h-10 w-10 rounded-xl border border-primary-200 cursor-pointer" />
                <input value={accentColor} onChange={e => setAccentColor(e.target.value)} className="input flex-1 text-sm" />
              </div>
            </div>
          </div>

          {error && <p className="text-red-600 text-sm text-center">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? <Spinner size="sm" /> : 'Save Frame'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
