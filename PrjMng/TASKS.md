# OEX — Task Backlog

Checkbox legend: `[ ]` todo · `[~]` in progress · `[x]` done

---

## Phase 0 — Planning & scaffolding

- [x] Write detailed design document
- [x] Define repository layout (project rule)
- [x] Create PrjMng tracking files
- [x] Cursor agent config (rules + skills: oex-coding, oex-backend, frontend-design)
- [x] Root `README.md` (setup & prerequisites)
- [x] Root `docker-compose.yml` (PostgreSQL: `oex` + hướng dẫn tạo `oex_test`)
- [x] Root `.env.example` + `.gitignore`
- [x] Scaffold `backend/` (Express + TypeScript + Prisma + Vitest + seed + test scripts)
- [x] Scaffold `frontend/` (Vue 3 + Vite + TypeScript)

---

## Phase 1 — Backend foundation

- [x] Prisma schema (all tables per design §8)
- [x] Test infrastructure (`tests/setup.ts`, Vitest, supertest, `.env.test`, `db:test:prepare`)
- [x] DB migrate + seed (full catalog: admin, teacher, 2 students, inactive user, subjects, questions, exams DRAFT/PUBLISHED/CLOSED, assignments)
- [x] Error envelope + validation (Zod) + global error handler
- [x] Auth: login, JWT middleware, `GET /auth/me` + tests
- [x] Admin: user CRUD API + tests

---

## Phase 2 — Question & exam API

- [x] Subject CRUD + tests
- [x] Question + options CRUD (single correct answer enforced) + tests
- [x] Exam CRUD + link questions + tests
- [x] Exam publish/close status + tests
- [x] Direct student assignment API + tests

---

## Phase 3 — Exam taking & grading

- [x] `POST /attempts/start` (rules: window, max attempts) + tests
- [x] Save answers + submit + auto-grade + tests
- [x] Timer expiry handling + tests
- [x] Results API (teacher + student views) + tests
- [x] Strip `is_correct` from in-progress student payloads (covered by attempt tests)

---

## Phase 4 — Frontend foundation

- [x] Vue Router + role guards
- [x] Pinia auth store + Axios client
- [x] Login page (English)
- [x] App layout + dashboard shell
- [x] Loading / empty / error states pattern

---

## Phase 5 — Teacher UI

- [x] Subject list & form
- [x] Question bank + question form
- [x] Exam list + create/edit + question picker
- [x] Assign students screen
- [x] Exam results table

---

## Phase 6 — Student UI

- [x] My Exams list
- [x] Exam taking screen (timer, navigator, submit)
- [x] Result detail view

---

## Phase 7 — Integration & release

- [x] Full backend regression (`npm run test` — 0 failures)
- [x] E2E: login → take exam → submit → view result
- [x] OpenAPI / Swagger doc
- [x] Production deploy notes
- [x] Final docs update

---

## Phase 8 — Project completion (gaps per `OEX_DetailedDesign_V2.md` §17)

- [x] Design doc V2 + PMHDV mapping (`docs/OEX_DetailedDesign_V2.md`)
- [x] Admin User Management UI (`/admin/users` — USR-*, GAP-01)
- [x] Change password API + UI (AUTH-05, GAP-02)
- [x] Teacher attempt detail view (RES-05, GAP-03 — "View Detail" on exam results)
- [x] Manual test checklist / demo script for defense (GAP-06)
- [x] Thesis document `.docx` (PMHDV format, GAP-05) — `docs/OEX_PMHDV_Thesis.docx`
- [ ] Optional: Playwright browser E2E (GAP-04)

---

## Deferred (v2+ product features)

- Excel import
- Anti-cheating (tab detection, fullscreen)
- Class/course module
- Question images
- Shuffle questions or options
