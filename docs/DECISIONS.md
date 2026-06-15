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
