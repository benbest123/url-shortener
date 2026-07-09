# Frontend Auth UI — Design

**Date:** 10 July 2026
**Phase:** 4 (Auth) — final increment
**Goal:** Make the app usable end-to-end through the browser. Users can register, log in, see only their own links, and log out. Unauthenticated users are redirected to login.

## Context

The API side of Phase 4 is done: `POST`/`GET /api/urls` are gated and user-scoped, and `POST /api/auth/logout` clears the cookie. But there is no UI to authenticate, so every browser request 401s with no recovery. The JWT lives in an **httpOnly cookie**, so client JS cannot read auth state directly — we detect it via a server endpoint.

## Scope

**In:** `/login` and `/register` pages, a `GET /api/auth/me` endpoint, a home-page auth guard, and an identity/logout header on the home page.

**Out (deferred):** Next.js middleware route protection, server-component auth, "remember me", password reset, email verification. Noted as future hardening.

## New endpoint — `GET /api/auth/me`

- Reads the cookie via `getUserIdFromCookie(req)`. Null → `401 { error: "unauthorized" }`.
- Otherwise `SELECT email FROM users WHERE id = $1`. If no row (user deleted but token still valid) → `401`.
- Success → `200 { email }`.
- The JWT holds only `user_id`, so email comes from the DB, not the token.

## Pages & components

All client components (`"use client"`), reusing existing UI conventions (zinc neutrals, `red-600` errors, card pattern, disabled-button-with-text-swap while submitting). No `alert()`.

### `app/login/page.tsx`
- Email + password fields, submit button.
- Submits `POST /api/auth/login`. On success → redirect to `/` (`router.push`). On failure → inline `red-600` error ("Invalid email or password").
- Link to `/register`.

### `app/register/page.tsx`
- Same shape, submits `POST /api/auth/register`. On success → redirect to `/`. On failure → inline error (e.g. email in use / password too weak).
- Link to `/login`.

### `app/frontend/components/AuthForm.tsx` (shared)
- Login and register are the same form (email, password, submit, error). Extract one `AuthForm` component parameterized by: submit URL, button label, and the error message to show on failure.
- Keeps the two pages tiny and avoids duplicated form logic. Each page renders `<AuthForm ... />` plus its cross-link.

### `app/frontend/components/AuthHeader.tsx`
- Presentational client component on the home page. Receives `email` as a prop (the home page owns the `/me` fetch — see Data flow).
- Renders "Signed in as *email*" + a **Logout** button.
- Logout button → `POST /api/auth/logout` → `router.push("/login")`. Owns only the logout action, not auth-state fetching.

## Home page (`app/page.tsx`) auth guard

- On mount, determine auth state via `/api/auth/me` (owned by `AuthHeader`, which lifts the result up, or the page fetches once and passes down — see Data flow).
- If unauthenticated (401) → `router.replace("/login")` and render nothing (or a spinner) meanwhile.
- If authenticated → render `AuthHeader`, `ShortenForm`, `LinkResult`, `LinkList` as today.

## Data flow (auth state)

To avoid two `/me` calls, the **home page** owns the single `/api/auth/me` fetch on mount:
- `loading` → render a spinner/blank.
- `401` → `router.replace("/login")`.
- `{ email }` → pass `email` to `AuthHeader` as a prop; render the rest.

`AuthHeader` becomes a presentational component (receives `email`, owns only the logout action). This keeps one source of truth for auth state and one network call.

## Error handling

- Network/500 on `/me`: treat as unauthenticated → redirect to `/login` (fail safe; user can retry logging in).
- Login/register failures: inline `red-600` message, form stays put, button re-enabled.
- Logout failure (rare): still redirect to `/login` — the cookie clear is best-effort and the user intent is to leave.

## Testing

Follows existing patterns (Vitest, mock the boundary).

- **`GET /api/auth/me`** (route test, mock `@/lib/db` + `@/lib/auth`): 401 when unauthenticated; 401 when user row missing; 200 `{ email }` on success; asserts the `SELECT ... WHERE id = $1` query + params.
- **Component tests are out of scope** for this project (no frontend test setup today) — consistent with the current "routes unit-tested, UI not" coverage story. Manual verification: register → see home with email → create link → see only own links → logout → redirected → login works.

## Follow-ups (not now)

- Middleware-based route protection (learning exercise; the "proper" guard).
- Redirect already-logged-in users away from `/login`/`/register`.
- Consider putting `email` in the JWT to avoid the `/me` DB lookup (tradeoff: staleness).
