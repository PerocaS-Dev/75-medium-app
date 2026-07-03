# CLAUDE.md

This file is read automatically by Claude Code at the start of every session. It orients you so the user never has to re-explain the project.

## What this is
**75 Medium** — an accountability-first 75-day challenge tracker, built as a **PWA**, for ~100 users. Users define custom daily tasks, lock them at challenge start, and complete the challenge alongside friends who can see their progress. Full product rationale is in `docs/spec.md` — read it before building.

## Read these first (source of truth)
- `docs/spec.md` — the *what* and *why* (features, rules, privacy, v1/v2 scope). Stable.
- `docs/data-model.md` — entities and relationships. Stable.
- `docs/build-plan.md` — the *order* of work, chunk by chunk. Evolves as we build.
- **Design assets** — the visual target:
  - `style-files/tailwind.config.js` — the design tokens (colors, typography, spacing). Use this config when scaffolding the frontend.
  - `style-files/tokens.css` — CSS variables for the palette.
  - `style-files/style-screenshots/` — 10 screenshots of the intended screens. Reference these for layout; they are a visual target, not a precise spec.
  - Palette direction: warm brown/beige neutrals as the calm base, pastel pink/purple as accents/energy. "Quiet luxury, but playful."

## How to work here
- Build **one chunk at a time** from `build-plan.md`. Full context, bounded task. Do not attempt the whole app in one pass.
- The current gate: **v1 must be deployed and tested with real users before any v2 work begins.**

## Stack & conventions
- **Backend:** Spring Boot + Kotlin + Maven (Spring Web, Data JPA, Security, Flyway, PostgreSQL). In `backend/`.
- **Frontend:** React + TypeScript + Vite + Refine + Tailwind + TanStack Query. In `frontend/`. It's a PWA. When scaffolding, use the provided `style-files/tailwind.config.js` and `style-files/tokens.css` rather than generating a fresh palette — position them where Vite/Tailwind expect them.
- **Packaging:** the frontend build is served by Spring Boot from `resources/static` → **one fat JAR, one URL, no CORS.** Build the frontend, copy output into backend static resources, `mvn package`.
- **Storage:** progress photos live in R2/B2 object storage; Postgres stores only the object key + metadata. **Never store image blobs in Postgres.**
- **Time:** timestamps in UTC; per-user `time_zone` drives daily-close and deadline logic.

## Non-negotiables (from spec)
- Photos and journals are **private by default**; public is only ever an explicit choice.
- **POPIA:** explicit consent flow + delete-my-data path are v1 requirements.
- Photo protection ceiling is **signed URLs + watermarking + friction**, not true prevention (impossible on web) — don't over-promise it.
- A day is **met only if all tasks are checked** (binary). Streak logic reads counts, never *which* task.
- **Firm deadline, no grace window** — reminders are the safety net.

## Build commands
- Backend: `cd backend && ./mvnw package` (produces the fat JAR)
- Frontend: `cd frontend && npm install && npm run build`
- (Chunk 0 should wire a script that builds the frontend into the backend's static resources before packaging.)
