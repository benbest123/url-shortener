CREATE TABLE users (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   email TEXT UNIQUE NOT NULL,
   password_hash TEXT NOT NULL,
   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enforce case-insensitive email uniqueness at the DB layer (ADR 007). The app
-- lowercases emails before writing, but this guarantees no mixed-case duplicate
-- can slip in through any other code path (scripts, imports, future signup flows).
CREATE UNIQUE INDEX users_email_lower_key ON users (lower(email));

CREATE TABLE urls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_code TEXT UNIQUE NOT NULL,
  original_url TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NULL
);

-- Supports the per-user creation rate limit (ADR 012), which counts a user's
-- links in the last hour on every insert: WHERE user_id = $1 AND created_at >
-- NOW() - INTERVAL '1 hour'. Without this the count is a sequential scan of the
-- whole table per link creation; the composite (user_id, created_at) lets it be
-- an index range scan. Leading column user_id also serves the per-user link list.
CREATE INDEX idx_urls_user_created ON urls (user_id, created_at);

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