# OEX — Frontend Context

Pair with [SKILL.md](SKILL.md) and [oex-coding](../oex-coding/SKILL.md).

---

## Domain (visual grounding)

OEX is an **online examination system**. Draw distinctive choices from this world:

- **Materials:** exam papers, answer sheets, timers, score reports, question banks
- **Rhythms:** exam windows, countdown, submit deadline, graded vs in-progress
- **Artifacts:** subjects, MCQ options (A/B/C/D), attempt status, score breakdown

Avoid generic SaaS clichés unrelated to exams (random analytics cards, stock education icons with no meaning).

## Audience & tone

| Role | Needs | UI tone |
|------|-------|---------|
| Admin | User management | Clear hierarchy, confirm destructive actions |
| Teacher | Question bank, exams, results | Efficient, scannable tables |
| Student | Take exam, view results | Focused, minimal distraction during exam |

**Language:** English only for all UI copy.

| Avoid | Prefer |
|-------|--------|
| Submit | Sign in / Save Question / Submit Exam |
| An error occurred | Could not load exams. Try again. |
| No data | No exams yet. Create your first exam. |
| Webhook / payload | (never expose implementation terms) |

Action verb must match across button, dialog, and toast.

---

## Implementation stack

- Vue 3 **Composition API** + `<script setup lang="ts">`
- Pinia stores: `auth`, domain stores as needed (avoid one giant store)
- Axios instance in `src/api/client.ts` — attach JWT, handle 401 → logout
- Vue Router navigation guards by `meta.role`
- Types in `src/types/` mirror backend DTOs
- Do not expect `isCorrect` on options in in-progress attempt responses

---

## Data views (required)

Every view that fetches data implements:

1. **Loading** — skeleton or contextual spinner (`Loading exams…`)
2. **Empty** — what happened + primary action
3. **Error** — what failed + retry
4. **Success** — toast on mutations

---

## Exam taking screen

- Timer from server `expiresAt` (do not rely only on client clock for submit deadline)
- Confirm modal before submit: *"Are you sure you want to submit? You cannot change answers after submission."*
- On timeout: call submit API, toast *"Time is up. Your exam has been submitted."*
- Question navigator: answered vs unanswered state
- No answer leak: never display or infer `isCorrect` during in-progress attempt

---

## Layout patterns

**Dashboard / list screens:** Primary action top-right. Filters collapse on small viewports. Tables become cards below `768px` when row density suffers.

**Detail screens:** Title + status first; metadata grouped; primary action sticky on mobile.

**Forms:** One column on mobile; section headings describe the task ("Exam settings", "Assign students"), not DB table names.

**Exam taking:** Full focus mode — minimal chrome, prominent timer, clear question navigation.

---

## File organization

```
frontend/
├── src/
│   ├── api/          # Axios client + API modules
│   ├── components/   # shared UI
│   ├── views/        # route-level pages
│   ├── router/
│   ├── stores/       # Pinia
│   └── types/
└── public/
```

Match existing structure if the repo already diverges.

---

## Design token placeholder

```text
Color: ink #0c1222, paper #f4f1ec, elevated #ffffff, primary #1a4fd8, accent #c45c26, success #1d7a5f, danger #b42318
Type: display Source Serif 4 / body IBM Plex Sans / data IBM Plex Mono
Layout: exam-hall shell — sidebar nav + paper cards with left margin accent (exam sheet motif)
Signature: left border accent on cards and login panel (ruled margin mark)
```

---

## Task → verification (frontend)

| User ask | Verifiable goal |
|----------|-----------------|
| Login page | Invalid → error message; valid → redirect by role |
| Exam list | Loading / empty / error states present |
| Exam taking | Timer counts down; submit shows confirmation modal |
| Results view | Score matches API; no `isCorrect` shown to student during attempt |
