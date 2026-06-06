CREATE TABLE urls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_code TEXT UNIQUE NOT NULL,
  original_url TEXT NOT NULL,
  user_id UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NULL
);

CREATE TABLE clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url_id UUID REFERENCES urls(id) ON DELETE CASCADE,
  device TEXT NULL,
  browser TEXT NULL,
  referrer TEXT NULL,
  ip_hash TEXT,
  country TEXT NULL,
  city TEXT NULL,
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_clicks_url_id ON clicks(url_id);