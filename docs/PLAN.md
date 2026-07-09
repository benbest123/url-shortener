# Link Shortener — Project Plan

## Phase 1 — Core redirect (MVP)

Set up a Next.js app with a single API route that handles redirects. Hardcode a couple of URLs in memory just to prove the mechanic works. No database yet.

**Goal:** visit `/abc1234` and get redirected.

---

## Phase 2 — Database

Add PostgreSQL. Create the two tables (`urls`, `clicks`). Wire up the redirect route to query the DB instead of hardcoded values. Manually insert a row and test the redirect.

**Goal:** understand the data model before adding complexity on top.

---

## Phase 3 — Create & list links

Build API routes to create a short link and list existing ones. Build a minimal frontend UI — a form to paste a long URL and get a short one back.

**Goal:** the app is usable end to end without touching the database manually.

---

## Phase 4 — Auth

Add user registration and login with JWT tokens. Lock the create/list routes behind auth.

**Goal:** links are now owned by a user.

---

## Phase 5 — Click tracking

When a redirect happens, record a click event (device, referrer, timestamp) asynchronously so it doesn't slow down the redirect.

**Goal:** data starts accumulating for the analytics phase.

---

## Phase 6 — Caching with Redis

Add Redis in front of Postgres for redirect lookups. Implement the check-cache → fallback-to-DB → warm-cache pattern.

**Goal:** understand caching firsthand and see why it matters for read-heavy workloads.

---

## Phase 7 — Analytics dashboard

Build a frontend dashboard showing click counts over time, by device, by referrer. The data is already there from Phase 5.

**Goal:** the app looks impressive and demonstrates the full stack.

---

## Phase 8 — Dockerise

Wrap the app, Postgres, and Redis in Docker Compose so the whole thing runs with one command. Add DB migrations.

**Goal:** environment parity between local and production.

---

## Phase 9 — Deploy

Provision a VPS, get the app running there, add Nginx as a reverse proxy, and set up HTTPS.

**Goal:** a real live URL you can show people.

---

## Phase 10 — CI/CD

Add a GitHub Actions pipeline that lints, type-checks, and auto-deploys on every push to main.

**Goal:** any change you push goes live automatically.
