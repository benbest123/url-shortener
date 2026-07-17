# Architecture Decision Records

## ADR 001 — Redirect handler uses a Route Handler, not a page

**Date:** 6 June 2026
**Decision:** Short code redirects are handled via `app/[code]/route.ts` (a Next.js Route Handler) rather than a page component.
**Reason:** Redirects are pure HTTP responses with no UI. Route Handlers map directly to HTTP methods and carry no page-rendering overhead, making them the correct primitive for this use case.

## ADR 002 — use UUID rather than incremental ID for URL lookup table

**Date:** 6 June 2026
**Decision:** Use randomly generated UUID rather than incremental int for our URL table IDs.
**Reason:** Unpredictable, more "real-world" option, better if database is distributed, tradeoff slightly larger to store and slower to index.

## ADR 003 — cascade clicks table when a url is deleted

**Date:** 6 June 2026
**Decision:** We will use ON DELETE CASCADE on the click table FK so clicks are deleted if their url is deleted.
**Reason:** clicks without url are orphaned data, probable case is user wants url and its data deleted

## ADR 004 — include shortUrl in API responses rather than constructing it on the frontend

**Date:** 15 June 2026
**Decision:** Both `POST /api/urls` and `GET /api/urls` return a fully-formed `shortUrl` field computed server-side using `NEXT_PUBLIC_BASE_URL`.
**Reason:** Makes the API self-contained — any consumer gets a ready-to-use URL without needing to know the base URL or construction logic. Tradeoff is that the server must have `NEXT_PUBLIC_BASE_URL` set, which is enforced with an explicit 500 guard on both routes.

## ADR 005 — allow duplicate short codes for the same original URL

**Date:** 15 June 2026
**Decision:** No deduplication — submitting the same original URL multiple times creates a new short code each time.
**Reason:** Simpler implementation (no pre-insert lookup), and the correct deduplication scope depends on auth (per-user vs global), which isn't in place until Phase 4. Revisit once users own their links.

## ADR 006 — require authentication to create and list links

**Date:** 10 July 2026
**Decision:** The URL routes require a valid auth cookie. `POST /api/urls` rejects unauthenticated requests with 401 and stores the caller's `user_id` on every link; `GET /api/urls` returns only the caller's own links. Every link has exactly one owner.
**Reason:** Ownership stays unambiguous, which keeps list scoping (`WHERE user_id = $1`), deletion, and per-user analytics (Phase 7) simple. Directly satisfies the Phase 4 goal that links are owned by a user.
**Alternative rejected — anonymous links** (nullable `user_id`, auth optional): matches how real-world shorteners (bitly, tinyurl) work and removes signup friction on the core action, but `GET` has no coherent answer for an anonymous caller, orphan links accumulate with no one able to manage them, abuse control shifts to harder IP-based rate limiting, and "claim my anonymous links after signing up" becomes a non-trivial feature. We deliberately chose the simpler, ownership-clean model and deferred anonymous/claiming as out of scope. The schema keeps `user_id` nullable so this can be revisited without a migration.

## ADR 007 — normalize emails to lowercase

**Date:** 14 July 2026
**Decision:** Both register and login lowercase the email (via the Zod schema) before storing or querying. Accounts are therefore case-insensitive on email.
**Reason:** The `users.email` column is a case-sensitive `TEXT UNIQUE`. Without normalization, `Bob@x.com` and `bob@x.com` register as two distinct accounts, and a user who logs in with different casing than they signed up with fails auth despite valid credentials. Lowercasing at the edge keeps the stored value canonical.
**Enforcement:** Backed at the DB layer by a functional unique index, `CREATE UNIQUE INDEX users_email_lower_key ON users (lower(email))`, so no mixed-case duplicate can slip in via a code path that skips the Zod transform (scripts, imports, future signup flows). App-level lowercasing is kept because it canonicalizes the stored value and lets the exact-match login lookup (`WHERE email = $1`) use the existing `users_email_key` index. Chose the functional index over a `CITEXT` column type as the lighter change (no extension, no column-type migration).
**Consequence / migration note:** Existing rows are assumed already-lowercase (the DB predates this change and had no real accounts). If mixed-case rows ever exist, a one-off `UPDATE users SET email = lower(email)` (plus dedup of any collisions) is required before the unique index can be created.

## ADR 008 — only accept http(s) URLs for shortening

**Date:** 14 July 2026
**Decision:** `POST /api/urls` validates that the submitted URL's scheme is `http:` or `https:`, rejecting everything else (`javascript:`, `data:`, `file:`, `ftp:`, …) with a 400.
**Reason:** `z.url()` accepts any valid-URI scheme, which the redirect handler would then emit as a `Location`. Browsers won't execute `javascript:`/`data:` from a redirect, so this is not XSS, but a link shortener has no reason to store and serve arbitrary schemes, and doing so is a needless abuse surface. An allowlist is the conservative default.

## ADR 009 — retry short-code generation on collision

**Date:** 14 July 2026
**Decision:** On a `short_code` UNIQUE violation (`23505`), `POST /api/urls` retries with a freshly generated code, up to 5 attempts, before returning a 500.
**Reason:** Codes are random (7 chars over a 62-char alphabet), so collisions are astronomically rare, but a collision is a transient, retryable condition — not a server error. Retrying turns a would-be 500 into a successful create. The attempt cap bounds the work and still surfaces a genuine, persistent failure. Relates to ADR 002 (random codes) and ADR 005 (no dedup — the same original URL may legitimately map to many codes).

## ADR 010 — auth hardening: constant-time login, algorithm pinning, misconfig as 500

**Date:** 14 July 2026
**Decision:** (a) Login always runs a bcrypt compare — against a dummy hash when the email is unknown — so response latency does not reveal whether an account exists. (b) `jwt.verify` pins `algorithms: ["HS256"]`. (c) A missing `JWT_SECRET` is treated as a 500 (server misconfiguration) everywhere, including the auth-guarded routes, rather than a silent 401.
**Reason:** Closes a user-enumeration timing side-channel on login, removes JWT algorithm-confusion as a class of risk, and makes a misconfigured deploy fail loudly and consistently instead of masquerading as "everyone is logged out." Note the register route's `409 "email already in use"` still leaks account existence directly; that is accepted for now as the cost of a usable signup error, and revisiting it (e.g. generic messaging + email verification) is out of scope.

## ADR 011 — cap the pg pool at one connection per serverless instance

**Context.** `lib/db.ts` builds a `pg.Pool` at module scope. That assumes one
long-lived process. On Vercel the app runs as many short-lived, concurrent
function instances; each evaluates the module and opens its own pool. With
`pg`'s default `max: 10`, N instances can demand 10N connections against a
database that accepts far fewer. The failure is load-dependent, so it does not
appear in local development or in tests.

**Decision.** Two parts:

1. Point `DATABASE_URL` at Neon's **pooled** endpoint (the `-pooler` host),
   which fronts Postgres with PgBouncer and absorbs many short-lived clients.
2. Set `max: 1`. An instance serves one request at a time, so pooling within an
   instance buys nothing and only multiplies the connection count. Connection
   reuse is PgBouncer's job now, not `pg`'s.

TLS is set explicitly (`ssl: { rejectUnauthorized: true }`) when the connection
string carries `sslmode=require`, rather than relying on `pg` to interpret the
URL — its handling of `sslmode` has varied across versions, and a silent
downgrade is worse than a loud failure.

**Consequences.** Local development is unaffected (no `sslmode` in the local
URL, and one connection is plenty). If Snip ever moves back to a long-lived
server, `max: 1` becomes a bottleneck and must be revisited — the setting is a
consequence of the serverless runtime, not a general preference.

## ADR 012 — cap link creation per user, in Postgres

**Context.** Deploying publicly makes Snip an abuse target — phishing and spam
redirects, which risk the Vercel account under the Hobby terms and any future
domain's reputation. ADR 006 requires auth to create links, which stops
drive-by abuse, but registration stays open so a visitor can exercise the real
signup flow. An account is therefore not a barrier to a script.

**Decision.** Cap creation at 20 links per rolling hour per user, counted with
`SELECT count(*) FROM urls WHERE user_id = $1 AND created_at > NOW() - INTERVAL
'1 hour'`, rejected with `429`. Paired with a 30-day default expiry, which caps
the useful life of anything that does get through.

Postgres rather than Redis: Upstash does not arrive until Phase 6, and one
indexed count per creation is cheap. Revisit if creation ever gets hot — it is
one extra round trip on the write path.

A count error fails **closed** (`500`), not open: an unavailable database would
fail the insert regardless, and failing open would let anything that can break
the query bypass the limiter.

**Consequences.** The number is a guard rail, not a product decision —
generous for a human, ruinous for a script. It is not a global rate limit: a
determined abuser can register more accounts. Real defence (Safe Browsing,
per-IP limits) is deferred until Snip has a domain worth protecting.
