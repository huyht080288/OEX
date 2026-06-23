---
name: oex-coding
description: >-
  Shared coding standards and workflow for OEX (Online Examination System).
  Use when writing or editing code in backend/ or frontend/, prisma/, tests,
  scaffolding, bug fixes, or refactoring. Always pair with oex-backend for
  backend/ work and frontend-design for frontend/ work.
---

# OEX Coding (shared)

Behavioral and workflow guidance for **all** OEX implementation — backend and frontend.

**Stack:** Vue.js 3 · Node.js · Express · PostgreSQL · Prisma · TypeScript  
**UI language:** English  
**Design reference:** `docs/OEX_DetailedDesign_V1.md`  
**Locked decisions:** `PrjMng/DECISIONS.md`

## Mandatory: project rule

Always follow `.cursor/rules/oex-project-layout.mdc` (always applied):

- Read `PrjMng/STATUS.md` before implementing or resuming work
- Code only in `backend/` or `frontend/`; never in `Ref/` or task files in `docs/`
- Update `PrjMng/TASKS.md`, `STATUS.md`, `CHANGELOG.md` after meaningful progress
- Respect v1 scope cuts in `DECISIONS.md`

## Skill routing

| You are working in | Also read |
|--------------------|-----------|
| `backend/`, `prisma/`, API tests | [oex-backend/SKILL.md](../oex-backend/SKILL.md) |
| `frontend/`, FE components, views, styles | [frontend-design/SKILL.md](../frontend-design/SKILL.md) |
| Both in one task | Both specialized skills above |

This skill (`oex-coding`) is the **base layer** for every coding task. Specialized skills add technical and domain rules; they do not replace this one.

---

## Before writing code

1. Read `PrjMng/STATUS.md` — current phase and **next action**.
2. Read the matching section in `docs/OEX_DetailedDesign_V1.md`.
3. Confirm the task is **in scope v1** (no Excel import, anti-cheat, class module).
4. Load the specialized skill for the folder you will touch.

---

## General coding discipline

Các hướng dẫn hành vi nhằm giảm thiểu những sai sót lập trình phổ biến của LLM. Hãy kết hợp với skill chuyên biệt khi cần.

**Đánh đổi:** Thiên về cẩn trọng hơn tốc độ. Tác vụ vụn vặt có thể linh hoạt.

### 1. Suy nghĩ trước khi lập trình

- Nêu rõ giả định; nếu chưa chắc, hỏi.
- Nhiều cách hiểu → trình bày, đừng tự chọn im lặng.
- Có cách đơn giản hơn → nói ra.
- Điểm mơ hồ → dừng lại, hỏi.

### 2. Ưu tiên sự đơn giản

- Không thêm tính năng ngoài yêu cầu.
- Không abstraction cho code dùng một lần.
- Không xử lý lỗi cho tình huống không thể xảy ra.
- 200 dòng khi 50 dòng đủ → viết lại.

### 3. Thay đổi có chọn lọc

- Không "cải tiến" code lân cận không liên quan.
- Không refactor phần không hỏng.
- Tuân style hiện tại.
- Xóa import/biến thừa do **thay đổi của bạn** tạo ra; không tự xóa dead code cũ.

### 4. Thực thi theo mục tiêu

Chuyển task thành tiêu chí xác minh:

- "Thêm xác thực" → test input không hợp lệ → pass
- "Sửa bug" → test tái hiện bug → pass
- "Refactor X" → test pass trước và sau
- **Backend feature** → `npm run test` exit 0 + seed data đủ (xem `oex-backend`)

---

## OEX scope (shared)

| Area | Rule |
|------|------|
| Scope | Single-answer MCQ only; direct exam → student assignment |
| Secrets | `.env` only; never commit credentials |
| UI copy | English only (enforced in frontend-design) |
| API base | `/api/v1` with standard envelope (enforced in oex-backend) |
| Exam security | Never expose `is_correct` during `IN_PROGRESS` attempt (enforced in oex-backend + frontend-design) |

Full out-of-scope list: [project-context.md](project-context.md).

---

## After implementation

1. Mark task in `PrjMng/TASKS.md`.
2. Update `PrjMng/STATUS.md` if phase changes.
3. Append entry to `PrjMng/CHANGELOG.md` with date and summary.

**Backend only:** complete steps 1–3 only after `npm run test` passes (see `oex-backend`).

---

## Related resources

| Resource | When |
|----------|------|
| `.cursor/rules/oex-project-layout.mdc` | File placement, repo map — **always** |
| `.cursor/skills/oex-backend/` | `backend/`, Prisma, API |
| `.cursor/skills/frontend-design/` | `frontend/`, UI, styling |
| `docs/OEX_DetailedDesign_V1.md` | API contracts, DB schema, screen specs |
