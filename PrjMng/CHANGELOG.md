# OEX — Implementation Changelog

Dated log of meaningful project changes (not every commit).

---

## 2025-06-23

- Created `docs/OEX_DetailedDesign_V1.md` — full system design (Vue + Node + PostgreSQL).
- Locked scope: single-answer MCQ, direct assignment, English UI, no import/anti-cheat v1.
- Added `.cursor/rules/oex-project-layout.mdc` — repository layout conventions.
- Initialized `PrjMng/` tracking files (`STATUS`, `TASKS`, `DECISIONS`, `CHANGELOG`).
- Added `.cursor/skills/oex-coding/` — shared coding discipline + skill routing.
- Split specialized skills: `oex-backend/` (API, tests, seed), `frontend-design/` (Vue UI).
- Backend quality gate: mandatory `npm run test` pass + full seed catalog.
- Added root `README.md` — prerequisites, setup steps, seed accounts.
- Reviewed `PrjMng/TASKS.md` — tests per phase, seed/test infra in Phase 1.

### Phase 0 + Phase 1 backend (same day)

- Root infra: `docker-compose.yml` (PostgreSQL 15), `.env.example`, `.gitignore`.
- Backend scaffold: Express 5 + TypeScript + Prisma 6 + Vitest + Supertest.
- Prisma schema: all tables per design §8 (users, subjects, questions, exams, assignments, attempts).
- Initial migration `20250623000000_init`.
- Seed catalog (`prisma/seed.ts` + `seed-data.ts`): admin, teacher, 2 students, inactive user, subject, 3 questions, DRAFT/PUBLISHED/CLOSED exams, assignments.
- API foundation: Zod validation, `AppError`, standard envelope (§9), JWT auth middleware, role guard.
- Auth endpoints: `POST /auth/login`, `GET /auth/me`.
- Admin user endpoints: list (filter by role/search), create, get, update, `PATCH /:id/status`.
- Tests: `auth.test.ts` (7), `users.test.ts` (11) — **18 passed**; `globalSetup` uses Docker Postgres when available, else embedded Postgres fallback.

### Phase 2 — Subject, Question, Exam API (same day)

- Subject CRUD (`/api/v1/subjects`) — teacher ownership, delete blocked when questions/exams exist.
- Question CRUD (`/api/v1/questions`) — filter by subject/difficulty/text; exactly one `isCorrect` enforced.
- Exam CRUD (`/api/v1/exams`) — draft-only edit/delete; set questions; publish/close status transitions.
- Assignment API — assign/list/remove students; duplicate assignment → 409; remove blocked after attempts.
- Exam results endpoint (`GET /exams/:id/results`) — attempts summary for teacher.
- Seed extended: `teacher2@oex.test`, empty subject, teacher2 subject (isolation tests).
- Tests: `subjects.test.ts` (9), `questions.test.ts` (10), `exams.test.ts` (19) — **56 total passed**.

### Phase 3 — Exam taking & grading (same day)

- Student endpoints: `GET /my-exams`, `POST /attempts/start`, `GET /attempts/:id`, `PUT /attempts/:id/answers`, `POST /attempts/:id/submit`, `GET /attempts/:id/result`.
- Start guards: published exam, time window, max attempts, no duplicate `IN_PROGRESS`.
- Grading in transaction; idempotent submit → 409; auto-expire on timeout → `EXPIRED`.
- Student payload strips `isCorrect` during `IN_PROGRESS`; review only when `showAnswersAfterSubmit`.
- Seed: stable question-option IDs, `SUBMITTED` attempt (student2, score 2/4), `EXPIRED` attempt (student1), closed-exam assignment.
- Tests: `attempts.test.ts` (15) — **71 total passed**.

### Phase 0 remainder + Phase 4 frontend (same day)

- Scaffold `frontend/`: Vue 3 + Vite + TypeScript + Pinia + Vue Router + Axios.
- API client (`src/api/client.ts`): JWT interceptor, 401 → logout, standard envelope unwrap.
- Pinia auth store: login, logout, session restore via `GET /auth/me`.
- Vue Router: role guards (`ADMIN` / `TEACHER` / `STUDENT`), login redirect, placeholder routes for Phase 5–6.
- Login page per design §10.2.1 (English copy, inactive account message).
- App layout: header, role-based sidebar, sign out.
- Dashboard shell: role-specific widgets (admin users, teacher subjects/exams, student upcoming exams) with loading/empty/error states.
- Shared UI: `LoadingState`, `EmptyState`, `ErrorState` components; `useAsyncData` composable.
- Design: exam-hall aesthetic — Source Serif 4 + IBM Plex Sans, paper cards with left margin accent.
- `npm run build` passes.

### Phase 5 — Teacher UI (same day)

- Backend: `GET /api/v1/students` (teacher-only) — search active students for exam assignment.
- Tests: `students.test.ts` (3) — **74 total** (attempt tests may need DB reset on persistent embedded Postgres).
- Teacher routes per design §10.1: `/subjects`, `/subjects/:id/questions`, `/questions/new`, `/questions/:id/edit`, `/exams`, `/exams/new`, `/exams/:id`, `/exams/:id/results`.
- Views: subject list + modal form; question bank with filters; question form (A–F options, single correct); exam list; create exam; exam detail (tabs: Details, Questions, Assign); results table.
- API modules: `subjects.ts`, `questions.ts`, `exams.ts`, `students.ts`; types in `types/teacher.ts`.
- UI: `StatusBadge`, `ToastContainer`, table/form/tab styles; toast copy per §10.4.
- `npm run build` passes.

### Phase 6 — Student UI (same day)

- Backend: `GET /my-exams` extended with `subjectName`, `lastCompletedAttemptId`; `examTitle` on start/get attempt; review includes option labels.
- Seed/test: cleanup stray attempts on re-seed and `beforeAll` in `attempts.test.ts` — **74 tests pass**.
- Routes: `/my-exams`, `/take/:attemptId` (fullscreen), `/results/:attemptId`.
- Views: `MyExamsView` (status badges, Start/Resume/View Result), `TakeExamView` (timer, navigator, autosave, submit modal, beforeunload warning), `ResultView` (score + optional review).
- `npm run build` passes.

### Phase 7 — Integration & release (same day)

- E2E smoke test `tests/e2e-student-flow.test.ts` — login → my-exams → start → save → submit → result (`npm run test:e2e`).
- Full regression: **76 tests pass** (`npm run test`).
- OpenAPI 3.0: `docs/api/openapi.yaml` (all v1 endpoints).
- Production deploy guide: `docs/DEPLOY.md`.
- README updated: current setup, demo flows, doc links.

### Design V2 + PMHDV alignment (same day)

- Added `docs/OEX_DetailedDesign_V2.md` — supersedes V1; §17 implementation status; Appendix C mapping to PMHDV thesis overview.
- Phase 8 backlog in `PrjMng/TASKS.md` for remaining gaps (admin UI, teacher attempt detail, thesis docx).

### Phase 8 — Project completion (same day)

- **GAP-01** Admin User Management UI (`/admin/users`): list, search, create, edit, activate/deactivate.
- **GAP-02** `POST /auth/change-password` + Account page (`/account`).
- **GAP-03** `GET /exams/:id/attempts/:attemptId` + teacher **View Detail** on results table.
- **GAP-06** `docs/MANUAL_TEST_CHECKLIST.md` — defense demo script.
- **GAP-05** `docs/OEX_PMHDV_Thesis.docx` — PMHDV thesis draft (`docs/scripts/generate-thesis.mjs`).
- OpenAPI updated for new endpoints. Backend: **81 tests pass**; frontend build OK.

### Development port standardization — 2026-07-17

- Standardized local ports: frontend `5001`, backend/Swagger `5002`, Prisma Studio `5003`, PostgreSQL host `5005`.
- Updated Vite proxy, Express defaults/CORS, Docker mapping, environment templates, test configuration, OpenAPI, scripts, and documentation.
- Added `npm run db:studio` with fixed port `5003`.
- PostgreSQL container recreated with persistent data volume; **86 backend tests pass**, backend and frontend builds pass.
- Added Vitest V8 coverage support and `npm run test:coverage`; current application
  coverage: **91.09% statements/lines, 75.11% branches, 98.31% functions**.
- Added valid and invalid exam-window update tests; `src/validators` now has 100%
  coverage on all metrics.
- Coverage explicitly measures `src/**/*.ts` and `prisma/seed-data.ts`; runtime-external
  `prisma/seed.ts` is excluded and remains verified through integration test preparation.
- Exposed a development-only coverage viewer at `/testcoverage.html` with Back/Forward/Home/Reload and links to Swagger/OEX.
- Expanded Frontend Vitest coverage to **95 tests / 16 test files** across API modules,
  auth, router, composables, shared components, and Admin/Teacher/Student workflows.
- Whole-app frontend coverage is **88.46% statements, 82.59% branches, 77.53% functions,
  and 90.45% lines**; a 75% threshold on every metric prevents silent regression.
- Frontend HTML coverage remains available through the navigable viewer at
  `http://localhost:5001/testcoverage.html`.
