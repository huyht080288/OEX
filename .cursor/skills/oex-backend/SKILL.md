---
name: oex-backend
description: >-
  Backend implementation standards for OEX (Online Examination System). Use when
  writing or editing code in backend/, prisma/, API routes, controllers,
  services, middleware, validators, or backend tests. Requires tests to pass
  and seed data for verification. Pair with oex-coding for shared workflow.
---

# OEX Backend

Technical guidance for **`backend/`** and **Prisma**. Always also follow:

1. `.cursor/rules/oex-project-layout.mdc` — layout, PrjMng workflow
2. [oex-coding/SKILL.md](../oex-coding/SKILL.md) — shared discipline and scope

Details and examples: [project-context.md](project-context.md).

---

## Stack

Node.js · Express · TypeScript · Prisma · PostgreSQL · Zod · JWT · bcrypt

**Reference:** `docs/OEX_DetailedDesign_V1.md` (§8 schema, §9 API)

---

## Layer rules

```
routes/       → HTTP mapping, call controller only
controllers/  → Parse request, call service, map response
services/     → Business logic, Prisma calls, transactions
middleware/   → auth, role guard, error handler
validators/   → Zod schemas per endpoint
```

No business logic in routes. No Prisma calls directly from controllers.

---

## Definition of done (mandatory)

**Backend work is not complete until tests pass.** Do not mark a task done or update `PrjMng` as complete without a green test run.

### Gate checklist

```
- [ ] Feature/fix has automated tests (unit and/or integration)
- [ ] Seed data covers the scenarios under test (see project-context)
- [ ] npm run test — exit code 0, 0 failed, 0 skipped (unless pre-approved)
- [ ] New/changed endpoints have at least: 1 happy path + 1 error path
- [ ] Regression: full suite still passes (no broken existing tests)
```

### Commands (run from `backend/`)

```bash
# 1. Migrate + seed test database
npm run db:test:prepare    # or: prisma migrate deploy && prisma db seed (test DB)

# 2. Run all tests — must pass before finishing
npm run test

# 3. Optional: typecheck + lint if configured
npm run build
```

If `db:test:prepare` or `test` scripts do not exist yet, add them when scaffolding `backend/`.

**Blocker:** If tests cannot run (no DB, missing deps), fix the environment first — do not skip the gate.

Details, seed catalog, and per-module test criteria: [project-context.md](project-context.md#testing).

---

## API contract

- Base path: `/api/v1`
- Envelope per design §9:

```typescript
// Success
{ success: true, data: T, message: string }

// Error
{ success: false, error: { code: string, message: string, details?: unknown[] } }
```

Use application codes from design §9.9 (`INVALID_CREDENTIALS`, `EXAM_NOT_AVAILABLE`, …).

---

## Critical domain rules

| Rule | Requirement |
|------|-------------|
| Auth | JWT + bcrypt; only Admin creates users |
| Questions | Exactly one `isCorrect: true` per question |
| Exam security | Student DTO omits `isCorrect` while attempt `IN_PROGRESS` |
| Attempt start | Published exam, in window, under max attempts, no other `IN_PROGRESS` |
| Submit | Grade in transaction; idempotent — second submit → 409 |
| Expiry | Reject save/submit after `expires_at`; auto-submit → `EXPIRED` |

---

## Task → verification (backend)

| User ask | Verifiable goal |
|----------|-----------------|
| Add login | Invalid → 401; valid → JWT + user; inactive blocked |
| Add question API | Second `isCorrect` → 400 |
| Start attempt | Outside window / max attempts → error; no `is_correct` in payload |
| Submit exam | Score matches manual count; status → `SUBMITTED` |

---

## Seed data (mandatory)

Every backend that touches the database must ship **`prisma/seed.ts`** with enough sample data to run integration tests and manual API checks without creating records by hand.

Minimum catalog: admin, teacher, 2 students, subject, questions, published exam, assignments. Full list: [project-context.md](project-context.md#seed-data).

Re-run seed after schema changes: `npx prisma db seed`.

---

## After implementation

1. **Run `npm run test` — all pass** (mandatory).
2. Follow oex-coding: update `PrjMng/TASKS.md`, `STATUS.md`, `CHANGELOG.md`.
