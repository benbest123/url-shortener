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

Phase 3 — see PLAN.md

## Do not

- Install new dependencies without being asked
- Use `any` types
- Add comments that just restate what the code does

## UI Design — shadcn/ui

### Stack

- **Component library:** shadcn/ui (Radix UI primitives + Tailwind CSS)
- **Styling:** Tailwind utility classes only; never write custom CSS unless a component genuinely cannot be built with utilities
- **Icons:** `lucide-react` (already a shadcn peer dep)

---

### Component usage

Always reach for a shadcn component before writing a custom one:

```
Button, Input, Label, Textarea         – all form controls
Card, Separator                        – layout and grouping
Dialog, Sheet, Popover, Tooltip        – overlays and contextual UI
Select, Combobox, RadioGroup, Checkbox – choice controls
Table                                  – tabular data
Badge, Alert, Toast (Sonner)           – status and feedback
Skeleton                               – loading states
```

Import from the local components path, not the npm package:

```ts
// ✅
import { Button } from "@/components/ui/button";

// ❌
import { Button } from "shadcn/ui";
```

---

### Layout conventions

- **Page wrapper:** `max-w-screen-lg mx-auto px-4 py-8` (or `px-6` on md+)
- **Vertical rhythm:** use `space-y-*` on parent containers; avoid ad-hoc `mb-*` on individual children
- **Section grouping:** wrap related UI in `<Card>` with `<CardHeader>`, `<CardContent>`, `<CardFooter>` — don't build raw `div` wrappers when a Card fits
- **Responsive:** mobile-first; use `sm:`, `md:`, `lg:` prefixes. Never hard-code pixel widths.

---

### Colour & theme

- Use CSS variable tokens (`bg-background`, `text-foreground`, `text-muted-foreground`, `border`, `ring`) — not raw Tailwind colour scales like `bg-gray-100`
- Semantic variants on `Button`: `default`, `secondary`, `outline`, `ghost`, `destructive` — pick the one that matches intent, don't override with arbitrary colours
- Destructive actions (delete, remove) must use the `destructive` variant
- Never hardcode `#hex` values in JSX; extend the theme in `tailwind.config.ts` if a custom colour is genuinely needed

---

### Typography

- Headings: `text-2xl font-semibold tracking-tight` (h1), `text-xl font-medium` (h2)
- Body: `text-sm text-foreground` (default), `text-sm text-muted-foreground` (secondary/helper text)
- Labels: always use the shadcn `<Label>` component paired with its control via `htmlFor` / `id`
- Avoid `font-bold` on body copy; reserve weight for headings and CTAs

---

### Forms

- Every field needs a `<Label>` and, on error, a `<p className="text-sm text-destructive">` below the input
- Use `react-hook-form` + Zod for validation; wire shadcn inputs through the `<FormField>` / `<FormItem>` / `<FormMessage>` pattern from shadcn's Form component
- Disabled states: pass `disabled` prop to the component — don't fake it with `opacity-50 pointer-events-none` on a wrapper

---

### Feedback & states

| Situation                    | Component                                                                             |
| ---------------------------- | ------------------------------------------------------------------------------------- |
| Async action in progress     | `Button` with `disabled` + spinner icon (e.g. `<Loader2 className="animate-spin" />`) |
| Success / error after action | `Toast` via `useToast()` or Sonner                                                    |
| Blocking confirmation        | `AlertDialog`                                                                         |
| Inline field error           | `<FormMessage>` / `text-destructive` paragraph                                        |
| Content loading              | `<Skeleton>` matching the shape of the real content                                   |

Never use `alert()` or `confirm()` — always use the shadcn equivalents.

---

### Accessibility defaults

- `Dialog` and `Sheet` trap focus automatically — don't add manual focus management
- Every icon-only `Button` needs an `aria-label`
- Use `asChild` when composing shadcn components into other elements (e.g. wrapping a `Link` inside a `Button`)
- Colour contrast: stick to the token system; the default shadcn theme is WCAG AA compliant

---

### What NOT to do

- Don't wrap shadcn components in unnecessary extra `div`s just to apply spacing — use `className` on the component itself
- Don't mix Tailwind colour scales (`gray-*`, `blue-*`) with theme tokens in the same component
- Don't build a custom modal, drawer, or dropdown — shadcn has all of these
- Don't use `style={{}}` inline styles
- Don't install a second component library alongside shadcn
