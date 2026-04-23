-- Feature additions: modes, surveys, settings expansion

-- Add capture mode to sessions
ALTER TABLE sessions ADD COLUMN mode TEXT NOT NULL DEFAULT 'photo'
  CHECK(mode IN ('photo','gif','boomerang','video'));

-- Add media type for non-photo output
ALTER TABLE sessions ADD COLUMN media_type TEXT;

-- Survey / feedback table
CREATE TABLE IF NOT EXISTS surveys (
  id          TEXT    PRIMARY KEY,
  session_id  TEXT    NOT NULL,
  rating      INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
  comment     TEXT,
  email       TEXT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

CREATE INDEX IF NOT EXISTS idx_surveys_session ON surveys(session_id);
CREATE INDEX IF NOT EXISTS idx_surveys_rating  ON surveys(rating);

-- New settings
INSERT OR IGNORE INTO settings (key, value) VALUES
  ('watermark_enabled',  'false'),
  ('watermark_text',     'NexaBooth'),
  ('watermark_position', 'bottom-right'),
  ('watermark_opacity',  '0.7'),
  ('kiosk_title',        'Tap to Start'),
  ('kiosk_subtitle',     'Your perfect photobooth experience'),
  ('kiosk_bg_color',     '#1E2A6E'),
  ('resend_api_key',     ''),
  ('from_email',         'noreply@nexabooth.com'),
  ('twilio_account_sid', ''),
  ('twilio_auth_token',  ''),
  ('twilio_from_number', ''),
  ('slideshow_interval', '5'),
  ('survey_enabled',     'true'),
  ('email_enabled',      'false'),
  ('sms_enabled',        'false');
