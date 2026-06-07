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
- Add comments that just restate what the code doesv
