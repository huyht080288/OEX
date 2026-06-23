# OEX — Shared Context

Pair with [SKILL.md](SKILL.md). Backend details → [oex-backend/project-context.md](../oex-backend/project-context.md). Frontend details → [frontend-design/project-context.md](../frontend-design/project-context.md).

---

## File placement (both tiers)

| What | Where |
|------|-------|
| New API route | `backend/src/routes/` + controller + service + validator |
| New page | `frontend/src/views/` |
| Shared UI | `frontend/src/components/` |
| Shared API types | `frontend/src/types/` |
| Backend tests | `backend/tests/` |
| Frontend tests | `frontend/src/**/*.spec.ts` |

Do not add application code to `Ref/` or `docs/`.

---

## Out of scope v1 — do not implement unless asked

- Excel / CSV import
- Tab-switch / fullscreen anti-cheat
- Class / course module
- Multiple correct answers per question
- Question images
- Shuffle questions or options
- OAuth / SSO
- Vietnamese UI

---

## Cross-tier contracts

- Frontend types in `frontend/src/types/` mirror backend DTOs.
- Error codes from design §9.9 must match between API and UI handling.
- Student in-progress exam payloads: no `isCorrect` on options (backend strips; frontend must not assume it).
