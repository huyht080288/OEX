# OEX — Manual Test Checklist & Demo Script

Use this checklist before defense or stakeholder demo.  
**Seed password (all accounts):** `Password123!`

## Prerequisites

- [ ] PostgreSQL running (`docker compose up -d` from repo root)
- [ ] Backend: `cd backend && npm run db:migrate && npm run db:seed && npm run dev`
- [ ] Frontend: `cd frontend && npm run dev`
- [ ] Open app at `http://localhost:5001`

## Seed accounts

| Role | Email |
|------|-------|
| Admin | `admin@oex.test` |
| Teacher | `teacher@oex.test` |
| Teacher 2 | `teacher2@oex.test` |
| Student 1 | `student1@oex.test` |
| Student 2 | `student2@oex.test` |

---

## 1. Authentication

| # | Steps | Expected |
|---|--------|----------|
| 1.1 | Open `/login`, sign in as `teacher@oex.test` | Dashboard loads; nav shows Subjects, Exams |
| 1.2 | Sign out, sign in with wrong password | Error message; stay on login |
| 1.3 | Sign in as `inactive` user (if seeded) | Account inactive message |
| 1.4 | While signed in, open `/account`, change password | Success message; can sign in with new password |

---

## 2. Admin — User management

Sign in as **admin@oex.test**.

| # | Steps | Expected |
|---|--------|----------|
| 2.1 | Dashboard → **Manage users** or nav **User Management** | User table loads |
| 2.2 | Filter by role **Student** | Only students listed |
| 2.3 | **Add User** — create student with new email | User appears in list |
| 2.4 | **Edit** user — change full name | Name updates |
| 2.5 | **Deactivate** user, try login as that user | Login blocked (inactive) |
| 2.6 | **Activate** user again | Login works |

---

## 3. Teacher — Content & exams

Sign in as **teacher@oex.test**.

| # | Steps | Expected |
|---|--------|----------|
| 3.1 | **Subjects** — create subject | Subject in list |
| 3.2 | Open subject → **Questions** — add MCQ (one correct) | Question saved |
| 3.3 | **Exams** → **New exam** — fill window, duration, max attempts | Draft exam created |
| 3.4 | Open exam → add questions → **Publish** | Status = Published |
| 3.5 | **Assign students** — pick `student1`, `student2` | Assignments listed |
| 3.6 | Sign in as **teacher2** — open same exam URL | Forbidden / not found (ownership) |

---

## 4. Student — Take exam

Sign in as **student1@oex.test**.

| # | Steps | Expected |
|---|--------|----------|
| 4.1 | **My Exams** | Assigned published exam visible |
| 4.2 | **Start** exam | Timer runs; questions and options shown |
| 4.3 | Select answers, navigate between questions | Answers persist (refresh optional) |
| 4.4 | **Submit** | Confirmation; redirect or result available |
| 4.5 | **View Result** | Score and answer review (if exam allows) |
| 4.6 | Try **Start** again when `maxAttempts` reached | Action disabled or error |

---

## 5. Teacher — Results & attempt detail

Sign in as **teacher@oex.test**.

| # | Steps | Expected |
|---|--------|----------|
| 5.1 | Open exam → **Results** | Table: student, score, status |
| 5.2 | **View Detail** on submitted attempt | Per-question review with correct answers |
| 5.3 | Breadcrumb back to Results | Results table reloads |

---

## 6. Regression smoke (optional)

```bash
cd backend && npm run test    # expect 81 passed
cd frontend && npm run build  # expect success
```

---

## Suggested demo flow (5–8 minutes)

1. **Admin** — show user list; create one student account.
2. **Teacher** — show subject + question bank; create/publish exam; assign students.
3. **Student** — start exam, answer 2–3 questions, submit.
4. **Teacher** — open Results → **View Detail** for that attempt.
5. **Any role** — **Account** → change password (optional).

---

## Known v1 limitations (mention if asked)

- No self-registration (admin creates users)
- No Excel import, anti-cheat, or class module
- Single correct answer per question only
- UI language: English
- No statistics charts on dashboard
