import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { handle } from 'hono/cloudflare-pages'

interface Env {
  DB: D1Database
  MIDTRANS_SERVER_KEY?: string
  MIDTRANS_CLIENT_KEY?: string
  ADMIN_PASSWORD?: string
}

type Variables = Record<string, never>

const app = new Hono<{ Bindings: Env; Variables: Variables }>().basePath('/api')

// ── CORS ──────────────────────────────────────────────────────────────────
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'x-admin-password'],
}))

// ── Helper ────────────────────────────────────────────────────────────────
function json<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// ── FRAMES ────────────────────────────────────────────────────────────────
app.get('/frames', async (c) => {
  const { results } = await c.env.DB
    .prepare('SELECT * FROM frames WHERE is_active = 1 ORDER BY sort_order ASC')
    .all()
  return c.json({ frames: results })
})

app.get('/frames/:id', async (c) => {
  const frame = await c.env.DB
    .prepare('SELECT * FROM frames WHERE id = ?')
    .bind(c.req.param('id'))
    .first()
  if (!frame) return c.json({ error: 'Frame not found' }, 404)
  return c.json({ frame })
})

// ── SESSIONS ──────────────────────────────────────────────────────────────
app.post('/sessions', async (c) => {
  const body = await c.req.json<{
    frameId?: string
    customerEmail?: string
    customerPhone?: string
  }>()
  const { frameId, customerEmail, customerPhone } = body

  if (!frameId) return c.json({ error: 'frameId required' }, 400)

  const frame = await c.env.DB
    .prepare('SELECT * FROM frames WHERE id = ? AND is_active = 1')
    .bind(frameId)
    .first<{ id: string; price: number }>()
  if (!frame) return c.json({ error: 'Frame not found' }, 404)

  const sessionId = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString()

  await c.env.DB
    .prepare(`
      INSERT INTO sessions
        (id, frame_id, status, payment_status, customer_email, customer_phone, total_amount, expires_at)
      VALUES (?, ?, 'pending', 'unpaid', ?, ?, ?, ?)
    `)
    .bind(sessionId, frameId, customerEmail ?? null, customerPhone ?? null, frame.price, expiresAt)
    .run()

  return c.json({ sessionId, expiresAt })
})

app.get('/sessions/:id', async (c) => {
  const session = await c.env.DB
    .prepare(`
      SELECT s.*,
             f.name        AS frame_name,
             f.layout      AS layout,
             f.photo_count AS photo_count,
             f.border_color AS border_color,
             f.accent_color AS accent_color
      FROM sessions s
      LEFT JOIN frames f ON s.frame_id = f.id
      WHERE s.id = ?
    `)
    .bind(c.req.param('id'))
    .first()
  if (!session) return c.json({ error: 'Session not found' }, 404)
  return c.json({ session })
})

app.patch('/sessions/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json<{
    status?: string
    paymentStatus?: string
    paymentRef?: string
    paymentMethod?: string
  }>()

  const session = await c.env.DB
    .prepare('SELECT id, status FROM sessions WHERE id = ?')
    .bind(id)
    .first()
  if (!session) return c.json({ error: 'Session not found' }, 404)

  const sets: string[] = []
  const vals: unknown[] = []

  if (body.status)        { sets.push('status = ?');         vals.push(body.status) }
  if (body.paymentStatus) { sets.push('payment_status = ?'); vals.push(body.paymentStatus) }
  if (body.paymentRef)    { sets.push('payment_ref = ?');    vals.push(body.paymentRef) }
  if (body.paymentMethod) { sets.push('payment_method = ?'); vals.push(body.paymentMethod) }

  if (body.status === 'paid' || body.paymentStatus === 'paid') {
    sets.push("paid_at = datetime('now')")
  }
  if (body.status === 'completed') {
    sets.push("completed_at = datetime('now')")
  }

  if (!sets.length) return c.json({ error: 'Nothing to update' }, 400)

  vals.push(id)
  await c.env.DB
    .prepare(`UPDATE sessions SET ${sets.join(', ')} WHERE id = ?`)
    .bind(...vals)
    .run()

  return c.json({ success: true })
})

// ── PHOTOS ────────────────────────────────────────────────────────────────
app.post('/sessions/:id/photos', async (c) => {
  const sessionId = c.req.param('id')
  const body = await c.req.json<{
    photoIndex?: number
    data?: string
    filter?: string
  }>()
  const { photoIndex, data, filter = 'normal' } = body

  if (data === undefined || photoIndex === undefined) {
    return c.json({ error: 'photoIndex and data required' }, 400)
  }

  const session = await c.env.DB
    .prepare("SELECT id, status FROM sessions WHERE id = ? AND status IN ('pending','paid','capturing')")
    .bind(sessionId)
    .first<{ id: string; status: string }>()
  if (!session) return c.json({ error: 'Session not found or not eligible' }, 404)

  // Promote to 'capturing'
  if (session.status === 'paid') {
    await c.env.DB
      .prepare("UPDATE sessions SET status = 'capturing' WHERE id = ?")
      .bind(sessionId)
      .run()
  }

  // Upsert photo
  const photoId = crypto.randomUUID()
  await c.env.DB
    .prepare(`
      INSERT INTO photos (id, session_id, photo_index, data, filter)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(session_id, photo_index) DO UPDATE
        SET data = excluded.data, filter = excluded.filter
    `)
    .bind(photoId, sessionId, photoIndex, data, filter)
    .run()

  return c.json({ success: true, photoId })
})

app.get('/sessions/:id/photos', async (c) => {
  const { results } = await c.env.DB
    .prepare('SELECT * FROM photos WHERE session_id = ? ORDER BY photo_index ASC')
    .bind(c.req.param('id'))
    .all()
  return c.json({ photos: results })
})

app.get('/sessions/:id/photos/:index', async (c) => {
  const photo = await c.env.DB
    .prepare('SELECT * FROM photos WHERE session_id = ? AND photo_index = ?')
    .bind(c.req.param('id'), Number(c.req.param('index')))
    .first()
  if (!photo) return c.json({ error: 'Photo not found' }, 404)
  return c.json({ photo })
})

// ── PAYMENTS ──────────────────────────────────────────────────────────────
app.post('/payments/create', async (c) => {
  const { sessionId } = await c.req.json<{ sessionId?: string }>()
  if (!sessionId) return c.json({ error: 'sessionId required' }, 400)

  const session = await c.env.DB
    .prepare(`
      SELECT s.*, f.name AS frame_name
      FROM sessions s
      LEFT JOIN frames f ON s.frame_id = f.id
      WHERE s.id = ? AND s.payment_status = 'unpaid'
    `)
    .bind(sessionId)
    .first<{
      id: string; frame_id: string; frame_name: string
      total_amount: number; customer_email: string | null; customer_phone: string | null
    }>()
  if (!session) return c.json({ error: 'Session not found or already paid' }, 404)

  // Real Midtrans
  if (c.env.MIDTRANS_SERVER_KEY) {
    const isSandbox = c.env.MIDTRANS_SERVER_KEY.startsWith('SB-')
    const snapUrl = isSandbox
      ? 'https://app.sandbox.midtrans.com/snap/v1/transactions'
      : 'https://app.midtrans.com/snap/v1/transactions'

    const res = await fetch(snapUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${btoa(`${c.env.MIDTRANS_SERVER_KEY}:`)}`,
      },
      body: JSON.stringify({
        transaction_details: {
          order_id: session.id,
          gross_amount: session.total_amount,
        },
        item_details: [{
          id: session.frame_id,
          price: session.total_amount,
          quantity: 1,
          name: session.frame_name,
        }],
        customer_details: {
          email: session.customer_email ?? undefined,
          phone: session.customer_phone ?? undefined,
        },
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      return c.json({ error: 'Midtrans error', details: err }, 502)
    }

    const mt = await res.json<{ token: string; redirect_url: string }>()
    return c.json({
      mode: 'midtrans',
      token: mt.token,
      redirectUrl: mt.redirect_url,
      clientKey: c.env.MIDTRANS_CLIENT_KEY ?? '',
    })
  }

  // Mock mode
  return c.json({ mode: 'mock', sessionId, amount: session.total_amount })
})

app.post('/payments/confirm-mock', async (c) => {
  const { sessionId } = await c.req.json<{ sessionId?: string }>()
  if (!sessionId) return c.json({ error: 'sessionId required' }, 400)

  const ref = `MOCK-${Date.now()}`
  const { meta } = await c.env.DB
    .prepare(`
      UPDATE sessions
      SET payment_status = 'paid',
          status = 'paid',
          payment_ref = ?,
          payment_method = 'mock',
          paid_at = datetime('now')
      WHERE id = ? AND payment_status = 'unpaid'
    `)
    .bind(ref, sessionId)
    .run()

  if (!meta.changes) return c.json({ error: 'Session not found or already paid' }, 404)
  return c.json({ success: true, paymentRef: ref })
})

// Midtrans webhook
app.post('/payments/notify', async (c) => {
  const body = await c.req.json<{
    order_id?: string
    transaction_status?: string
    payment_type?: string
    transaction_id?: string
  }>()

  const { order_id, transaction_status, payment_type, transaction_id } = body

  if (!order_id || !transaction_status) return c.json({ ok: true })

  if (['capture', 'settlement'].includes(transaction_status)) {
    await c.env.DB
      .prepare(`
        UPDATE sessions
        SET payment_status = 'paid', status = 'paid',
            payment_ref = ?, payment_method = ?,
            paid_at = datetime('now')
        WHERE id = ? AND payment_status = 'unpaid'
      `)
      .bind(transaction_id ?? null, payment_type ?? null, order_id)
      .run()
  } else if (['deny', 'expire', 'cancel'].includes(transaction_status)) {
    await c.env.DB
      .prepare("UPDATE sessions SET payment_status = 'failed' WHERE id = ?")
      .bind(order_id)
      .run()
  }

  return c.json({ ok: true })
})

// ── ADMIN (password-gated) ────────────────────────────────────────────────
function checkAdmin(password: string | undefined, envPass: string | undefined): boolean {
  return !!password && password === (envPass ?? 'admin123')
}

app.get('/admin/stats', async (c) => {
  if (!checkAdmin(c.req.header('x-admin-password'), c.env.ADMIN_PASSWORD)) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const [sessions, revenue, today] = await Promise.all([
    c.env.DB.prepare(`
      SELECT COUNT(*) AS total,
             SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END) AS paid
      FROM sessions
    `).first<{ total: number; paid: number }>(),
    c.env.DB.prepare(`
      SELECT SUM(total_amount) AS total FROM sessions WHERE payment_status = 'paid'
    `).first<{ total: number }>(),
    c.env.DB.prepare(`
      SELECT COUNT(*) AS count
      FROM sessions
      WHERE date(created_at) = date('now') AND payment_status = 'paid'
    `).first<{ count: number }>(),
  ])
  return c.json({ sessions, revenue, today })
})

app.get('/admin/sessions', async (c) => {
  if (!checkAdmin(c.req.header('x-admin-password'), c.env.ADMIN_PASSWORD)) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const page  = Math.max(1, Number(c.req.query('page') ?? 1))
  const limit = 20
  const offset = (page - 1) * limit

  const [{ results }, count] = await Promise.all([
    c.env.DB.prepare(`
      SELECT s.*, f.name AS frame_name
      FROM sessions s
      LEFT JOIN frames f ON s.frame_id = f.id
      ORDER BY s.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(limit, offset).all(),
    c.env.DB.prepare('SELECT COUNT(*) AS total FROM sessions').first<{ total: number }>(),
  ])
  return c.json({ sessions: results, total: count?.total ?? 0, page, limit })
})

app.get('/admin/frames', async (c) => {
  if (!checkAdmin(c.req.header('x-admin-password'), c.env.ADMIN_PASSWORD)) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const { results } = await c.env.DB
    .prepare('SELECT * FROM frames ORDER BY sort_order ASC')
    .all()
  return c.json({ frames: results })
})

app.post('/admin/frames', async (c) => {
  if (!checkAdmin(c.req.header('x-admin-password'), c.env.ADMIN_PASSWORD)) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const body = await c.req.json<{
    name?: string; description?: string; layout?: string
    photoCount?: number; price?: number
    borderColor?: string; accentColor?: string; sortOrder?: number
  }>()
  const { name, description, layout, photoCount, price, borderColor, accentColor, sortOrder } = body

  if (!name || !layout || !photoCount || !price) {
    return c.json({ error: 'name, layout, photoCount, price are required' }, 400)
  }

  const id = crypto.randomUUID()
  await c.env.DB
    .prepare(`
      INSERT INTO frames
        (id, name, description, layout, photo_count, price, border_color, accent_color, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(id, name, description ?? null, layout, photoCount, price,
      borderColor ?? '#FFFFFF', accentColor ?? '#1E2A6E', sortOrder ?? 0)
    .run()

  return c.json({ id })
})

app.put('/admin/frames/:id', async (c) => {
  if (!checkAdmin(c.req.header('x-admin-password'), c.env.ADMIN_PASSWORD)) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const id = c.req.param('id')
  const body = await c.req.json<Record<string, unknown>>()

  const map: Record<string, string> = {
    name: 'name', description: 'description', layout: 'layout',
    photoCount: 'photo_count', price: 'price',
    borderColor: 'border_color', accentColor: 'accent_color',
    isActive: 'is_active', sortOrder: 'sort_order',
  }

  const sets: string[] = []
  const vals: unknown[] = []
  for (const [k, col] of Object.entries(map)) {
    if (body[k] !== undefined) { sets.push(`${col} = ?`); vals.push(body[k]) }
  }
  if (!sets.length) return c.json({ error: 'Nothing to update' }, 400)

  vals.push(id)
  await c.env.DB
    .prepare(`UPDATE frames SET ${sets.join(', ')} WHERE id = ?`)
    .bind(...vals)
    .run()

  return c.json({ success: true })
})

export const onRequest = handle(app)
