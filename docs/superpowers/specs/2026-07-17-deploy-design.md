# Deploy to Production — Design

**Date:** 17 July 2026
**Phase:** Deploy — Phase 9 in `docs/PLAN.md`, brought forward to run next. `PLAN.md` numbering is retained throughout this document; only the execution order changes.
**Goal:** Snip live at a public URL, with a demo login in the README, deploying automatically on merge to `main`.

## Context

Phases 1–4 are done: redirects, the Postgres data model, create/list links, and auth. The app works end to end locally and has tests, coverage in CI, ADRs, and a README.

It has never been deployed. `docs/PLAN.md` schedules Deploy as Phase 9 of 10, behind click tracking, Redis caching, the analytics dashboard, and Docker. That ordering is why there is no live URL: the single most valuable artefact sits behind four phases of unrelated work.

Nothing in Phases 5–8 is a prerequisite for deploying. The app is deployable as it stands.

## Why Deploy moves to the front

1. **An undeployed project is a repo, not a portfolio piece.** The README currently ships a screenshot where a link should be.
2. **The analytics phase needs real data.** Phase 5 (click tracking) records clicks; Phase 7 renders them. Deploying first means clicks accumulate while caching is built, so the dashboard renders real traffic instead of self-generated fakes. Same code, same effort, better demo.
3. **Deployment problems surface while the app is simple.** Debugging serverless config against four services at once is strictly harder than against one.
4. **Phase 10 (CI/CD) largely falls out for free.** Vercel's git integration gives auto-deploy-on-merge without a bespoke pipeline.

## Hosting decision

Free tier throughout — this is a learning project with no expected real users.

| Piece | Service | Free tier (verified 17 Jul 2026) |
|---|---|---|
| App | Vercel Hobby | 100 GB bandwidth, 100k function invocations/mo, 10s timeout, free custom domains, non-commercial only |
| Database | Neon | 0.5 GB storage, 100 CU-hrs/mo, scale-to-zero, no expiry |
| Cache (Phase 6) | Upstash Redis | 256 MB, 500k commands/mo |

**Supabase is explicitly rejected:** its free tier pauses projects after 7 days of inactivity, which is exactly the failure mode for a portfolio demo — an employer clicks the link weeks later and finds a dead app. Neon scales to zero and wakes on demand.

**Fly.io was considered and rejected:** it would have preserved a real Docker deploy, but its free tier was cut in 2024 (~$5/mo minimum, $8–12 with Postgres) — worse value than a Hetzner VPS at ~€4/mo, which teaches more.

**Accepted cost:** Vercel is serverless, so there is no reverse proxy, no VPS, and no HTTPS configuration. Phase 9's Nginx/VPS learning is forfeited, and Phase 8's Docker Compose becomes local-dev-only. This is a deliberate trade of learning for £0/yr.

**Domain:** deploying to the `.vercel.app` subdomain initially. Short links on a long subdomain undercut the product's one job, so a short domain (~£10/yr, free to attach on Hobby) remains an available upgrade. Nothing in this design blocks it — `NEXT_PUBLIC_BASE_URL` is the only coupling point.

## Scope

**In:** Neon provisioning, schema application, serverless connection pooling, Vercel project setup, environment variables, a seeded demo account, README demo credentials, link-expiry and creation-cap guard rails, auto-deploy on merge.

**Out (deferred to their own phases, `PLAN.md` numbering):** click tracking (Phase 5 — spec already written), Redis caching (Phase 6), analytics dashboard (Phase 7), Docker Compose (Phase 8), CI/CD confirmation (Phase 10), migration tooling (see Schema), Safe Browsing checks, custom domain.

## Environment variables

Set in the Vercel project, all three required:

| Var | Value | Notes |
|---|---|---|
| `DATABASE_URL` | Neon **pooled** connection string | Must be the `-pooler` host — see below |
| `JWT_SECRET` | Fresh secret, generated for production | Must **not** reuse the local `.env` value |
| `NEXT_PUBLIC_BASE_URL` | The production URL | Baked at **build time**, not runtime |

`NEXT_PUBLIC_BASE_URL` is deploy-critical: URL routes 500 if it is unset, and it is the base for every returned `shortUrl`. Because `NEXT_PUBLIC_*` values are inlined at build time, it must be set *before* the first production build, and changing it later (e.g. attaching a short domain) requires a redeploy, not just a config edit. Set it to the stable production URL — never to Vercel's per-deployment `VERCEL_URL`, which changes per deploy and would mint short links pointing at dead preview URLs.

## Connection pooling for serverless — ADR 011

`lib/db.ts` creates a module-scope `pg.Pool`:

```ts
const pool = new Pool({ connectionString, connectionTimeoutMillis: 3000 });
```

This assumes one long-lived process. Vercel gives many short-lived concurrent function instances, each evaluating the module and opening its own pool. `pg`'s default `max` is 10, so N instances can demand 10N connections against a database that accepts far fewer — connection exhaustion under even light traffic, and the failure is load-dependent, so it will not appear in local testing.

**Fix, two parts:**

1. **Use Neon's pooled endpoint** (the `-pooler` hostname), which fronts Postgres with PgBouncer and absorbs many short-lived clients.
2. **Set `max: 1`** on the pool. Each ephemeral instance needs exactly one connection; pooling *within* an instance buys nothing and multiplies the connection count.

**Also verify:** Neon requires TLS. `pg` does not reliably honour `sslmode=require` from the connection string across versions, so confirm SSL is negotiated rather than assumed — a plaintext connection attempt will fail at Neon, but the error will not obviously name TLS as the cause.

**Also:** the `pool.on("connect", () => console.log("db connected"))` handler fires on every cold start. Harmless but noisy; drop it or demote it.

This is the one non-mechanical part of the phase and warrants ADR 011.

## Schema

`db/schema.sql` already models `users`, `urls`, and `clicks` — including the click columns Phase 5 needs and the `expires_at` column this phase starts using. **No schema change is required by Phases 5, 6, or 7.**

Therefore: apply `db/schema.sql` to Neon once, by hand. Do not add migration tooling yet — it would be infrastructure for a change that is not coming.

**Revisit trigger:** the first genuine schema change. By then production holds real click data, and hand-editing it is the point at which a migration tool stops being ceremony and starts being necessary. This is a deliberate deferral with a named trigger, not an oversight.

## Demo access and abuse

The app is public, and a public URL shortener is an abuse target — phishing and spam redirects, which risk both the Vercel account (Hobby terms) and any future domain's reputation. ADR 006 already requires auth to create links, which rules out drive-by abuse.

**Demo account.** Seed one account with credentials in the README, so an employer can use the app without signing up. Non-obvious requirement: the demo account must survive a database reset, so seeding is a script (`db/seed.ts` or similar), not a manual insert.

**Registration stays open**, so a visitor can exercise the real signup flow — it is part of what the project demonstrates.

**Guard rails, both cheap and using existing schema:**
- **Default link expiry: 30 days.** `urls.expires_at` exists and is unused. Default new links to `NOW() + 30 days`, which caps the value of any abusive link and exercises the expiry path the redirect handler already checks. Long enough that an employer's demo link still works weeks later; short enough that abandoned spam dies.
- **Per-user creation cap: 20 links per rolling hour.** `SELECT count(*) FROM urls WHERE user_id = $1 AND created_at > NOW() - INTERVAL '1 hour'`, rejected over the limit with a meaningful error. Postgres-backed, since Upstash does not arrive until Phase 6. The number is a guard rail, not a product decision — generous for a human, ruinous for a script.

**Deferred:** Safe Browsing / URL blocklisting. Proportionate for an undiscovered `.vercel.app` subdomain; revisit when attaching a real domain.

## Continuous deployment

- Existing GitHub Actions continues running tests and coverage on PRs to `main`.
- Vercel's git integration builds and deploys on merge to `main`, and builds preview deployments per PR.
- No bespoke deploy pipeline. Phase 10 reduces to confirming this works and documenting it.

**Preview deployments share the production database** unless separately configured. Acceptable at this scale, but it means a PR preview can write to production data — note it, and revisit if it bites.

## Verification — definition of done

Done when, from a clean browser with no local state:

1. The production URL loads.
2. Logging in with the README demo credentials succeeds.
3. Shortening a URL returns a `shortUrl` on the production origin (not `localhost`, not a preview URL).
4. Visiting that short link redirects to the target.
5. An expired link does not redirect.
6. Creating links past the cap is rejected with a meaningful error.
7. CI is green, and a merge to `main` deploys automatically.

Steps 1–4 are the demo an employer will actually perform, so they are verified by doing them, not by inference from tests passing.

## Risks

| Risk | Mitigation |
|---|---|
| Connection exhaustion under concurrency | Pooled endpoint + `max: 1` (ADR 011); load-dependent, so will not show locally |
| `NEXT_PUBLIC_BASE_URL` wrong at build time | Set before first production build; verified by DoD step 3 |
| Neon cold start on first hit after idle | Accepted this phase; Phase 6's Redis cache is the fix, and this makes that phase genuinely motivated rather than a tutorial exercise |
| Abuse of the public shortener | Auth required (ADR 006), default expiry, creation cap; Safe Browsing deferred |
| Demo account lost on DB reset | Seeded by script, not by hand |
| Reusing the local `JWT_SECRET` in production | Generate a fresh one; local `.env` is not a source of production secrets |

## Follow-on

Phase order after this: click tracking (spec already written, `2026-07-15-click-tracking-design.md`) → Redis caching → analytics dashboard → Docker Compose (local dev) → confirm CD.
