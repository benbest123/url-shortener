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
