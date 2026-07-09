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

## ADR 007 — detect auth state with a `/api/auth/me` endpoint and a client-side guard

**Date:** 10 July 2026
**Decision:** The frontend determines whether the user is logged in by calling `GET /api/auth/me` on mount. The home page redirects to `/login` on a 401 and otherwise renders. Route protection is client-side, not enforced by middleware.
**Reason:** The JWT lives in an httpOnly cookie, so client JS cannot read auth state directly — it needs a server round-trip. A single `/me` endpoint is the smallest step that fits the existing all-client-component UI, and it doubles as the source of the logged-in email for the header. Real security is already enforced server-side on the data routes (ADR 006); the client guard is only for UX (what to show / where to send the user).
**Alternatives rejected:** _Next.js middleware_ — the "proper" edge route-guard, but more machinery and still needs a `/me` lookup to display the email; deferred as a future hardening/learning exercise. _Server Components reading the cookie_ — cleanest in theory but the UI is currently all client components, so it would be a larger restructure. **Known limitation:** the client guard causes a brief blank render while `/me` resolves; middleware or SSR would remove that flash.

## ADR 008 — `/api/auth/me` looks up the email from the DB rather than embedding it in the JWT

**Date:** 10 July 2026
**Decision:** The JWT payload holds only `user_id`. `/api/auth/me` verifies the token, then runs `SELECT email FROM users WHERE id = $1` to return the email.
**Reason:** Keeps the token minimal and avoids stale data — if the email ever changes, the lookup always reflects the current value, whereas an email baked into a 24h token could go stale. A missing row (user deleted while a token is still valid) is treated as unauthenticated (401).
**Tradeoff:** one extra DB query per `/me` call. Acceptable because `/me` is low-frequency (page load, not the redirect hot path); if it became hot, the email could be cached or added to the token.
