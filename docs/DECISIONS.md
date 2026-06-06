# Architecture Decision Records

## ADR 001 — Redirect handler uses a Route Handler, not a page

**Date:** 6 June 2026
**Decision:** Short code redirects are handled via `app/[code]/route.ts` (a Next.js Route Handler) rather than a page component.
**Reason:** Redirects are pure HTTP responses with no UI. Route Handlers map directly to HTTP methods and carry no page-rendering overhead, making them the correct primitive for this use case.
