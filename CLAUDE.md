# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

This repo currently contains only a product spec (`init-dev.md`) — no code has been scaffolded yet. The first implementation task will be to bootstrap the Next.js app per the stack below. Read `init-dev.md` for the full feature spec (in Chinese); it is the source of truth for product requirements.

## Product overview

A frontend interview-prep study site. Core capabilities:
- **Question bank** with six item types: single-choice, multi-choice, fill-in-the-blank, coding, "print the output", and long-form Q&A. Coding problems require ≥3 test cases. Every question records its source.
- **Auto-grading + answer page** showing correctness, score, user-vs-reference diff, and per-test-case results.
- **Spaced-repetition study plans** generated strictly from the Ebbinghaus forgetting curve (auto weekly + daily plans; users can also create ad-hoc plans).
- **Mock interview** mode: random N questions or fixed-duration with timed scoring.
- **Analytics** by day/week/month and grouped by question type/category (accuracy bar charts, streaks, etc.).
- **Level assessment** mapping the user's history to industry rubrics (Alibaba P, Tencent T, Baidu T, internal 2-1 ~ 4-2).

## Tech stack (FIXED — do not substitute)

- React 18 + Next.js 15 **App Router** + TypeScript **strict mode**
- Tailwind CSS + shadcn/ui
- State: MobX **or** Redux for client state; TanStack Query for server state
- DB: SQLite + Prisma locally, schema designed to migrate to Postgres later
- Code editor: Monaco (`@monaco-editor/react`)
- Code runner: WebContainer sandbox — JS/TS only for MVP, no Node execution
- Markdown + syntax highlighting: `react-markdown` + `shiki`
- Testing: Vitest (unit) + Playwright (E2E, key paths only)
- Package manager: **pnpm** (use `pnpm`, not `npm`/`yarn`)

## Architectural notes for future work

- **Prisma schema is the migration boundary.** Avoid SQLite-only column types/features; keep the schema portable to Postgres.
- **Coding-question execution runs entirely in-browser** via WebContainer. Server never executes user code in MVP. Test-case runner and grader live on the client.
- **Two state layers, distinct responsibilities.** Server data (questions, attempts, plans) goes through TanStack Query; only genuinely client-only UI/session state belongs in MobX/Redux.
- **Question source is a first-class field** on every question record (see spec §题库来源).
- **Spaced repetition is not heuristic** — the plan generator must implement Ebbinghaus intervals literally, not an approximation.

## Question bank sources to ingest

Per `init-dev.md`, the seed content comes from these Feishu wiki pages (crawl ≤2 hops):
- https://y03l2iufsbl.feishu.cn/wiki/RDZlw5Atoi7MyrkZPFocMB8nnVg (general FE study material index)
- https://y03l2iufsbl.feishu.cn/wiki/HfUmwuOMSimjNokfq3ZcHv1JnuK (FE algorithm bank — 8 items + the "前端面试题宝典" mini-program)

Plus a portion of vibe-coding style problems.

## Commands

- `pnpm dev` — Next.js dev server (http://localhost:3000)
- `pnpm build` / `pnpm start` — production build + serve
- `pnpm lint` / `pnpm typecheck`
- `pnpm test` — Vitest (one-shot); `pnpm test:watch` for watch mode
- `pnpm test -- tests/unit/graders.test.ts` for a single file
- `pnpm test:e2e` — Playwright (requires `pnpm exec playwright install` once)
- `pnpm db:push` — push `prisma/schema.prisma` to SQLite without a migration
- `pnpm db:migrate` — create + apply a named migration
- `pnpm db:seed` — re-seed local DB from `prisma/seed.ts` (wipes attempts + questions)

## Project-specific notes

- `next.config.ts` sets COOP (`same-origin`) + COEP (`require-corp`) site-wide. WebContainer needs SharedArrayBuffer, which requires cross-origin isolation — do not weaken these headers. Side effect: external images/scripts need CORP headers or they will be blocked.
- All client-side code execution (CODING + PRINT) runs in WebContainer (`src/lib/runner/webcontainer.ts`). Server never executes user code; for CODING the client posts `{ code, results: TestCaseResult[] }` and `gradeCoding` only validates.
- `Question.payload` / `tags` / `relatedIds` and `Attempt.userAnswer` / `details` are JSON strings in SQLite — parse on read, stringify on write.
- MobX scope is intentionally narrow — only filter/sort UI state in `src/stores/`. Server data goes through TanStack Query.
- User model is hard-coded `userId = "local"` in MVP; schema keeps the column for future auth.
