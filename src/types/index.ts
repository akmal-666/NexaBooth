export type FrameLayout = 'solo' | 'double' | 'strip' | 'quad' | 'triptych'

export type PhotoFilter =
  | 'normal'
  | 'grayscale'
  | 'sepia'
  | 'vivid'
  | 'cool'
  | 'warm'
  | 'fade'

export type SessionStatus = 'pending' | 'paid' | 'capturing' | 'completed' | 'expired'
export type PaymentStatus = 'unpaid' | 'paid' | 'failed' | 'refunded'

export interface Frame {
  id: string
  name: string
  description: string
  layout: FrameLayout
  photo_count: number
  price: number
  border_color: string
  accent_color: string
  is_active: number
  sort_order: number
  created_at: string
}

export interface Session {
  id: string
  frame_id: string
  frame_name?: string
  layout?: FrameLayout
  photo_count?: number
  border_color?: string
  accent_color?: string
  status: SessionStatus
  payment_status: PaymentStatus
  payment_method: string | null
  payment_ref: string | null
  customer_email: string | null
  customer_phone: string | null
  total_amount: number
  created_at: string
  paid_at: string | null
  completed_at: string | null
  expires_at: string | null
}

export interface Photo {
  id: string
  session_id: string
  photo_index: number
  data?: string
  filter: PhotoFilter
  created_at: string
}

export interface LayoutSlot {
  x: number
  y: number
  w: number
  h: number
}

export interface LayoutConfig {
  slots: LayoutSlot[]
  canvasWidth: number
  canvasHeight: number
  paperLabel: string
}

export const LAYOUT_CONFIGS: Record<FrameLayout, LayoutConfig> = {
  solo: {
    canvasWidth: 1200,
    canvasHeight: 1600,
    paperLabel: '4×5″',
    slots: [{ x: 60, y: 60, w: 1080, h: 1300 }],
  },
  double: {
    canvasWidth: 1200,
    canvasHeight: 1800,
    paperLabel: '4×6″',
    slots: [
      { x: 60, y: 60,  w: 1080, h: 790 },
      { x: 60, y: 950, w: 1080, h: 790 },
    ],
  },
  strip: {
    canvasWidth: 600,
    canvasHeight: 1800,
    paperLabel: '2×6″',
    slots: [
      { x: 30, y: 30,  w: 540, h: 390 },
      { x: 30, y: 440, w: 540, h: 390 },
      { x: 30, y: 850, w: 540, h: 390 },
      { x: 30, y: 1260,w: 540, h: 390 },
    ],
  },
  quad: {
    canvasWidth: 1800,
    canvasHeight: 1800,
    paperLabel: '6×6″',
    slots: [
      { x: 30,  y: 30,  w: 855, h: 855 },
      { x: 915, y: 30,  w: 855, h: 855 },
      { x: 30,  y: 915, w: 855, h: 855 },
      { x: 915, y: 915, w: 855, h: 855 },
    ],
  },
  triptych: {
    canvasWidth: 1800,
    canvasHeight: 1200,
    paperLabel: '6×4″',
    slots: [
      { x: 30,  y: 60, w: 560, h: 1080 },
      { x: 620, y: 60, w: 560, h: 1080 },
      { x: 1210,y: 60, w: 560, h: 1080 },
    ],
  },
}

export const FILTER_CSS: Record<PhotoFilter, string> = {
  normal:    'none',
  grayscale: 'grayscale(100%)',
  sepia:     'sepia(80%)',
  vivid:     'saturate(180%) contrast(110%)',
  cool:      'hue-rotate(20deg) saturate(120%)',
  warm:      'sepia(30%) saturate(140%) brightness(105%)',
  fade:      'contrast(85%) brightness(110%) saturate(80%)',
}

export const FILTER_LABELS: Record<PhotoFilter, string> = {
  normal:    'Normal',
  grayscale: 'B&W',
  sepia:     'Vintage',
  vivid:     'Vivid',
  cool:      'Cool',
  warm:      'Warm',
  fade:      'Fade',
}
