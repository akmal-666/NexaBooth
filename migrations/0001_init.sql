-- NexaBooth D1 Schema

CREATE TABLE IF NOT EXISTS frames (
  id           TEXT    PRIMARY KEY,
  name         TEXT    NOT NULL,
  description  TEXT,
  layout       TEXT    NOT NULL CHECK(layout IN ('solo','double','strip','quad','triptych')),
  photo_count  INTEGER NOT NULL,
  price        INTEGER NOT NULL,
  border_color TEXT    NOT NULL DEFAULT '#FFFFFF',
  accent_color TEXT    NOT NULL DEFAULT '#1E2A6E',
  is_active    INTEGER NOT NULL DEFAULT 1,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id             TEXT    PRIMARY KEY,
  frame_id       TEXT    NOT NULL,
  status         TEXT    NOT NULL DEFAULT 'pending'
                         CHECK(status IN ('pending','paid','capturing','completed','expired')),
  payment_status TEXT    NOT NULL DEFAULT 'unpaid'
                         CHECK(payment_status IN ('unpaid','paid','failed','refunded')),
  payment_method TEXT,
  payment_ref    TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  total_amount   INTEGER NOT NULL,
  created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  paid_at        TEXT,
  completed_at   TEXT,
  expires_at     TEXT,
  FOREIGN KEY (frame_id) REFERENCES frames(id)
);

CREATE TABLE IF NOT EXISTS photos (
  id          TEXT    PRIMARY KEY,
  session_id  TEXT    NOT NULL,
  photo_index INTEGER NOT NULL,
  data        TEXT    NOT NULL,
  filter      TEXT    NOT NULL DEFAULT 'normal',
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (session_id) REFERENCES sessions(id),
  UNIQUE(session_id, photo_index)
);

CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_frame   ON sessions(frame_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status  ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_created ON sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_photos_session   ON photos(session_id);
