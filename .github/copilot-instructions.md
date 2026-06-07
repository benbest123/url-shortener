# Copilot Instructions

## Project

A full-stack link shortener with analytics. Next.js (App Router), TypeScript, Tailwind CSS. PostgreSQL and Redis will be added in later phases.

## Conventions

- Use TypeScript strict mode
- API routes live in `app/api/`, redirect handler in `app/[code]/route.ts`
- Use `async/await`, never `.then()` chains
- Zod for all input validation on API routes
- Meaningful error messages in API responses, not just status codes

## Current phase

Phase 3 — see PLAN.md

## Do not

- Install new dependencies without being asked
- Use `any` types
- Add comments that just restate what the code doesv
