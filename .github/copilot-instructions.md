# Copilot Instructions

## Project

A full-stack link shortener with analytics. Next.js (App Router), TypeScript, Tailwind CSS. PostgreSQL and Redis will be added in later phases.

## Conventions

- Use TypeScript strict mode
- API routes live in `app/api/`, redirect handler in `app/[code]/route.ts`
- Use `async/await`, never `.then()` chains
- Zod for all input validation on API routes
- Meaningful error messages in API responses, not just status codes
- Follow a red-green testing framework, where we add our tests before implementing the feature.
- As this is a learning exercise, by default you should only explain WHAT and HOW needs to be done rather than just writing the code, and give me PSEUDOCODE where applicable. If I want you to write the code, I will specify. The exception here is unit tests, typically you can write the tests.

## Current phase

Phase 4 — see PLAN.md

## Do not

- Use `any` types
- Add comments that just restate what the code does

## UI Design

### Stack

- **Styling:** Tailwind utility classes only; never write custom CSS unless a component genuinely cannot be built with utilities
- **Icons:** inline SVGs only — no icon library installed

---

### Layout conventions

- **Page wrapper:** `max-w-screen-lg mx-auto px-4 py-8` (or `px-6` on md+)
- **Vertical rhythm:** use `space-y-*` on parent containers; avoid ad-hoc `mb-*` on individual children
- **Section grouping:** use `rounded-xl border border-zinc-200 bg-white p-6 shadow-sm` as the card pattern
- **Responsive:** mobile-first; use `sm:`, `md:`, `lg:` prefixes. Never hard-code pixel widths.

---

### Colour

- Use the zinc scale for neutrals: `zinc-50` backgrounds, `zinc-900` headings, `zinc-500` secondary text, `zinc-200/300` borders
- Red (`red-600`) for errors, green (`green-50/200/700`) for success states
- Never hardcode `#hex` values in JSX

---

### Typography

- Headings: `text-2xl font-semibold tracking-tight text-zinc-900` (h1), `text-xl font-medium text-zinc-900` (h2)
- Body: `text-sm text-zinc-900` (default), `text-sm text-zinc-500` (secondary/helper text)
- Labels: plain `<label>` with `htmlFor` paired with its control via `id`
- Avoid `font-bold` on body copy; reserve weight for headings and CTAs

---

### Forms

- Every field needs a `<label>` and, on error, a `<p className="text-sm text-red-600">` below the input
- Use native validation (`required`, `type="url"` etc.) plus Zod on the API
- Disabled states: pass `disabled` prop directly — don't fake it with `opacity-50 pointer-events-none` on a wrapper

---

### Feedback & states

| Situation                | Approach                                                  |
| ------------------------ | --------------------------------------------------------- |
| Async action in progress | `disabled` button + text change (e.g. "Shortening…")      |
| Success after action     | Green-tinted banner (`bg-green-50 border-green-200`)      |
| Inline field error       | `<p className="text-sm text-red-600">` below the input    |
| Content loading          | `animate-pulse` div(s) matching the shape of real content |

Never use `alert()` or `confirm()`.

---

### What NOT to do

- Don't install a component library
- Don't mix zinc neutrals with other Tailwind colour scales in the same component
- Don't use `style={{}}` inline styles
