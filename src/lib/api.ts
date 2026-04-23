import type { Frame, Session, Photo, PhotoFilter } from '../types'

const BASE = '/api'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })
  const json = await res.json() as Record<string, unknown>
  if (!res.ok) throw new Error((json.error as string) ?? `HTTP ${res.status}`)
  return json as T
}

// ── Frames ──────────────────────────────────────────────────────────────────

export async function getFrames(): Promise<Frame[]> {
  const data = await request<{ frames: Frame[] }>('/frames')
  return data.frames
}

export async function getFrame(id: string): Promise<Frame> {
  const data = await request<{ frame: Frame }>(`/frames/${id}`)
  return data.frame
}

// ── Sessions ─────────────────────────────────────────────────────────────────

export async function createSession(
  frameId: string,
  opts?: { customerEmail?: string; customerPhone?: string }
): Promise<{ sessionId: string; expiresAt: string }> {
  return request('/sessions', {
    method: 'POST',
    body: JSON.stringify({ frameId, ...opts }),
  })
}

export async function getSession(id: string): Promise<Session> {
  const data = await request<{ session: Session }>(`/sessions/${id}`)
  return data.session
}

export async function updateSession(
  id: string,
  patch: {
    status?: string
    paymentStatus?: string
    paymentRef?: string
    paymentMethod?: string
  }
): Promise<void> {
  await request(`/sessions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
}

// ── Photos ───────────────────────────────────────────────────────────────────

export async function uploadPhoto(
  sessionId: string,
  photoIndex: number,
  data: string,
  filter: PhotoFilter = 'normal'
): Promise<{ photoId: string }> {
  return request(`/sessions/${sessionId}/photos`, {
    method: 'POST',
    body: JSON.stringify({ photoIndex, data, filter }),
  })
}

export async function getPhotos(sessionId: string): Promise<Photo[]> {
  const result = await request<{ photos: Photo[] }>(`/sessions/${sessionId}/photos`)
  return result.photos
}

export async function getPhoto(sessionId: string, index: number): Promise<Photo> {
  const result = await request<{ photo: Photo }>(`/sessions/${sessionId}/photos/${index}`)
  return result.photo
}

// ── Payments ─────────────────────────────────────────────────────────────────

export type PaymentInitResult =
  | { mode: 'midtrans'; token: string; redirectUrl: string; clientKey: string }
  | { mode: 'mock'; sessionId: string; amount: number }

export async function createPayment(sessionId: string): Promise<PaymentInitResult> {
  return request('/payments/create', {
    method: 'POST',
    body: JSON.stringify({ sessionId }),
  })
}

export async function confirmMockPayment(sessionId: string): Promise<void> {
  await request('/payments/confirm-mock', {
    method: 'POST',
    body: JSON.stringify({ sessionId }),
  })
}

// ── Admin ─────────────────────────────────────────────────────────────────────

function adminHeaders(password: string) {
  return { 'x-admin-password': password }
}

export async function getAdminStats(password: string) {
  return request<{
    sessions: { total: number; paid: number }
    revenue: { total: number }
    today: { count: number }
  }>('/admin/stats', { headers: adminHeaders(password) })
}

export async function getAdminSessions(password: string, page = 1) {
  return request<{ sessions: Session[]; total: number; page: number; limit: number }>(
    `/admin/sessions?page=${page}`,
    { headers: adminHeaders(password) }
  )
}

export async function getAdminFrames(password: string) {
  return request<{ frames: Frame[] }>('/admin/frames', { headers: adminHeaders(password) })
}

export interface FramePayload {
  name?: string
  description?: string
  layout?: string
  photoCount?: number
  price?: number
  borderColor?: string
  accentColor?: string
  sortOrder?: number
  isActive?: number
}

export async function createAdminFrame(password: string, frame: FramePayload) {
  return request<{ id: string }>('/admin/frames', {
    method: 'POST',
    headers: adminHeaders(password),
    body: JSON.stringify(frame),
  })
}

export async function updateAdminFrame(password: string, id: string, patch: FramePayload) {
  await request(`/admin/frames/${id}`, {
    method: 'PUT',
    headers: adminHeaders(password),
    body: JSON.stringify(patch),
  })
}
