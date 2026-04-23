-- Seed default frames
INSERT OR IGNORE INTO frames (id, name, description, layout, photo_count, price, border_color, accent_color, sort_order) VALUES
  ('frame-solo',     'Solo Portrait',  'One perfect shot with an elegant frame',      'solo',     1, 25000, '#FFFFFF', '#1E2A6E', 1),
  ('frame-double',   'Double Take',    'Two memories, one frame',                     'double',   2, 35000, '#FFF8F0', '#FF7B54', 2),
  ('frame-strip',    'Classic Strip',  'Four shots in the iconic photobooth strip',   'strip',    4, 50000, '#F0F4FF', '#4B5FD6', 3),
  ('frame-quad',     'Quad Grid',      'Four photos arranged in a stylish 2x2 grid',  'quad',     4, 50000, '#F5FFF5', '#2D7D32', 4),
  ('frame-triptych', 'Triptych',       'Three moments side by side',                  'triptych', 3, 40000, '#FFF0F8', '#C2185B', 5);

INSERT OR IGNORE INTO settings (key, value) VALUES
  ('booth_name',       'NexaBooth'),
  ('currency',         'IDR'),
  ('mock_payment',     'true'),
  ('countdown_secs',   '3'),
  ('print_copies',     '1'),
  ('admin_password',   'admin123');
