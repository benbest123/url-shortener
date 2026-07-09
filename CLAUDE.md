# CLAUDE.md

## Response style

Be concise. Skip preamble and restating the question. No filler or bullet-point padding. Give reasoning when it matters. Override per-prompt when I ask for depth.

## Project

**Snip** — full-stack URL shortener, a learning project built across 10 phases (`docs/PLAN.md`). Next.js 16 (App Router), React 19, TypeScript strict, Tailwind v4, PostgreSQL via `pg` (raw SQL, no ORM), Zod validation, JWT auth (httpOnly cookie, `bcryptjs`), Vitest + Codecov CI on PRs to `main`.

Env: `DATABASE_URL`, `JWT_SECRET`, `NEXT_PUBLIC_BASE_URL` (base for returned `shortUrl`; URL routes 500 if unset).

## Conventions

- No `any`; `async/await` only (no `.then()`); Zod on all API input with meaningful error messages.
- Red-green TDD: test before implementation.
- Read `docs/DECISIONS.md` before changing the data model or API shape.
- UI: Tailwind utilities only (no custom CSS, `style={{}}`, hex, or component library); inline SVG icons; **zinc** neutrals, `red-600` errors, `green-*` success; card = `rounded-xl border border-zinc-200 bg-white p-6 shadow-sm`. Never `alert()`/`confirm()`.
