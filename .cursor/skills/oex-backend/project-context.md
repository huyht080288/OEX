# OEX — Backend Context

Pair with [SKILL.md](SKILL.md) and [oex-coding](../oex-coding/SKILL.md).

---

## Layer responsibilities

```
routes/       → HTTP mapping, call controller only
controllers/  → Parse request, call service, map response
services/     → Business logic, Prisma calls, transactions
middleware/   → auth, role guard, error handler
validators/   → Zod schemas per endpoint
```

---

## Auth & authorization

- `authMiddleware` — verify JWT, attach `req.user`.
- `requireRole('TEACHER')` — role guard.
- Ownership: teachers access only own `subjects`, `questions`, `exams` (`created_by` / `teacher_id`).
- Students access only own `exam_assignments` and `exam_attempts`.

---

## Validation

- Zod at controller boundary; never trust client input.
- Question create/update: reject if `options.filter(o => o.isCorrect).length !== 1`.

---

## Exam attempt rules (critical)

| Rule | Implementation |
|------|----------------|
| No answer leak | Student question DTO omits `isCorrect` on options while `status === IN_PROGRESS` |
| Start guards | Published exam, `now` in [open_at, close_at], attempts < max_attempts, no other `IN_PROGRESS` |
| Expiry | Reject save/submit when `now > expires_at`; set status `EXPIRED` on auto-submit |
| Grading | On submit: compare `selected_option_id` to option where `is_correct`; sum `questions.points` |
| Idempotent submit | Second submit on `SUBMITTED` attempt → 409 |

Grade inside a **transaction**: update `attempt_answers.is_correct`, `exam_attempts.score`, `status`, `submitted_at`.

---

## Prisma

- Schema matches `docs/OEX_DetailedDesign_V1.md` §8.
- Use `@@map` for snake_case table names if desired; stay consistent.
- Migrations via `prisma migrate`; **always** maintain `prisma/seed.ts`.
- Register seed in `package.json`: `"prisma": { "seed": "tsx prisma/seed.ts" }`.

---

## Seed data

Seed must be **idempotent** (safe to re-run): use `upsert` on unique keys (`email`, `(teacher_id, code)`, `(exam_id, student_id)`).

### Minimum catalog

| Entity | Count | Purpose |
|--------|-------|---------|
| `users` ADMIN | 1 | User CRUD, protected routes |
| `users` TEACHER | 1 | Subject/question/exam ownership |
| `users` STUDENT | 2 | Assignment, attempt, isolation tests |
| `users` inactive | 1 | Login blocked (`is_active = false`) |
| `subjects` | 1+ | Owned by seed teacher |
| `questions` + `question_options` | 3+ | 4 options each, exactly 1 `is_correct` |
| `exams` DRAFT | 1 | Not startable |
| `exams` PUBLISHED | 1 | Open window includes "now"; linked questions |
| `exams` CLOSED | 1 | Past `close_at` — start rejected |
| `exam_questions` | all published Qs | Ordered `order_index` |
| `exam_assignments` | 2 students → published exam | Student "My Exams" |
| `exam_attempts` | 0–1 optional | SUBMITTED sample for results API tests |

### Seed credentials (document in seed file + `backend/.env.example`)

Use predictable dev/test accounts (never production secrets):

```
admin@oex.test    / Password123!   ADMIN
teacher@oex.test  / Password123!   TEACHER
student1@oex.test / Password123!   STUDENT
student2@oex.test / Password123!   STUDENT
inactive@oex.test / Password123!   STUDENT (is_active=false)
```

Export stable IDs from seed (constants file `prisma/seed-data.ts` or env) so tests can reference `SEED_PUBLISHED_EXAM_ID` without hardcoding UUIDs in every test file.

### When adding a new table or API

1. Extend `prisma/seed.ts` with rows that exercise the new feature.
2. Add integration test(s) that use seed data — no inline `prisma.user.create` in tests unless testing creation itself.
3. Re-run `npm run db:test:prepare && npm run test`.

---

## Testing

### Test stack (target)

- **Runner:** Vitest or Jest
- **HTTP:** supertest against Express app (no server listen in tests)
- **DB:** separate test database (`DATABASE_URL` pointing to `oex_test` or `*_test` suffix)
- **Lifecycle:** migrate + seed before suite; truncate or transaction rollback per test file (pick one, stay consistent)

### Pass criteria (all required)

| # | Criterion | How to verify |
|---|-----------|---------------|
| 1 | Exit code 0 | `npm run test` returns 0 |
| 2 | Zero failures | No failing test files |
| 3 | No silent skips | Skipped tests only with `it.skip` + comment explaining why |
| 4 | Coverage of change | Every new endpoint/service method has ≥1 test |
| 5 | Happy + error | Auth and validation endpoints test both success and failure |
| 6 | Envelope contract | Assert `success`, `data`/`error.code` shape matches design §9 |
| 7 | Role guards | 401 without token; 403 wrong role |
| 8 | Exam security | Student in-progress payload has no `isCorrect` on options |
| 9 | Seed dependency | Tests pass on fresh DB after `db:test:prepare` only — no manual setup |
| 10 | No test pollution | Tests pass in any order; full suite run twice yields same result |

### Per-module minimum tests

| Module | Required cases |
|--------|----------------|
| Auth | valid login → JWT; wrong password → 401; inactive user → 401/403 |
| Users (admin) | create; duplicate email → 400; list filter by role |
| Subjects | teacher creates; other teacher cannot access |
| Questions | create with 1 correct; 0 or 2 correct → 400 |
| Exams | publish; student cannot start DRAFT/CLOSED/outside window |
| Attempts | start → no answer leak; submit → score; double submit → 409 |
| Assignments | student sees only assigned exams |

### Test file layout

```
backend/tests/
├── setup.ts              # DB connect, seed, app instance
├── helpers/
│   ├── auth.ts           # loginAs(role), bearer header
│   └── seed-refs.ts      # imported IDs from seed constants
├── auth.test.ts
├── subjects.test.ts
├── questions.test.ts
├── exams.test.ts
└── attempts.test.ts
```

### package.json scripts (required when scaffolding)

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "db:seed": "prisma db seed",
    "db:test:prepare": "dotenv -e .env.test -- prisma migrate deploy && dotenv -e .env.test -- prisma db seed"
  }
}
```

Adjust tool names to match stack; keep the **prepare → test** workflow.

### Anti-patterns

```typescript
// ❌ BAD — test depends on data you created manually in pgAdmin
const exam = await prisma.exam.findFirst(); // unknown state

// ✅ GOOD — use seed constants
import { SEED_PUBLISHED_EXAM_ID } from '../prisma/seed-data';
const res = await request(app)
  .post(`/api/v1/attempts/start`)
  .set('Authorization', student1Token)
  .send({ examId: SEED_PUBLISHED_EXAM_ID });

// ❌ BAD — marking task done without running tests

// ❌ BAD — mock entire Prisma for integration tests of API routes
```

---

## Errors

```typescript
// ✅ GOOD — explicit, mapped to envelope
throw new AppError(400, 'VALIDATION_ERROR', 'Select exactly one correct answer');

// ❌ BAD — raw stack trace to client
res.status(500).json({ error: err.message });
```

---

## Examples

### Question validation (service)

```typescript
// ✅ GOOD
const correctCount = options.filter((o) => o.isCorrect).length;
if (correctCount !== 1) {
  throw new AppError(400, 'VALIDATION_ERROR', 'Select exactly one correct answer');
}

// ❌ BAD — silent fix
if (correctCount > 1) options[0].isCorrect = false;
```

### Student question payload (service)

```typescript
// ✅ GOOD — strip sensitive fields
function toStudentQuestion(q: QuestionWithOptions) {
  return {
    id: q.id,
    content: q.content,
    points: q.points,
    options: q.options.map(({ id, label, content }) => ({ id, label, content })),
  };
}

// ❌ BAD — leaks answers during exam
return question; // includes isCorrect
```

---

## Backend layout

```
backend/
├── src/
│   ├── routes/
│   ├── controllers/
│   ├── services/
│   ├── middleware/
│   ├── validators/
│   └── index.ts
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── seed-data.ts      # exported IDs + credential constants for tests
├── tests/
│   ├── setup.ts
│   └── helpers/
├── .env.example
└── .env.test.example     # DATABASE_URL for test DB
```
