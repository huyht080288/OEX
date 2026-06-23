# OEX — Online Examination System

**Document type:** Detailed System Design (Thiết kế chi tiết)  
**Version:** 1.0  
**Date:** 23/06/2025  
**Status:** Draft — approved scope

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [System Scope](#2-system-scope)
3. [Technology Stack](#3-technology-stack)
4. [System Architecture](#4-system-architecture)
5. [Actors & Permissions](#5-actors--permissions)
6. [Functional Requirements](#6-functional-requirements)
7. [Use Cases](#7-use-cases)
8. [Database Design](#8-database-design)
9. [API Design](#9-api-design)
10. [User Interface Design](#10-user-interface-design)
11. [Security Design](#11-security-design)
12. [Non-Functional Requirements](#12-non-functional-requirements)
13. [Deployment Design](#13-deployment-design)
14. [Testing Plan](#14-testing-plan)
15. [Out of Scope (v1)](#15-out-of-scope-v1)
16. [Project Structure](#16-project-structure)

---

## 1. Introduction

### 1.1. Project Name

**OEX** — **O**nline **E**xamination **S**ystem

### 1.2. Purpose

OEX is a web-based platform that supports online multiple-choice examinations. Teachers create question banks and exams; students take exams online; the system automatically grades submissions and stores results.

### 1.3. Objectives

| # | Objective |
|---|-----------|
| O1 | Provide a web interface for managing multiple-choice questions and exams |
| O2 | Allow teachers to assign exams directly to individual students |
| O3 | Enable students to take timed exams online with auto-grading |
| O4 | Expose a REST API backed by a relational database |
| O5 | Deliver an English-language user interface |

### 1.4. References

| Document | Description |
|----------|-------------|
| `docs/basic_requirement.md` | Original project requirements |

---

## 2. System Scope

### 2.1. In Scope (v1)

- User authentication and role-based access (Admin, Teacher, Student)
- Question bank management (single-answer multiple choice only)
- Exam creation, configuration, and direct assignment to students
- Online exam-taking with countdown timer and auto-submit on timeout
- Automatic scoring upon submission
- Result viewing for students and teachers
- REST API + PostgreSQL database
- English UI

### 2.2. Out of Scope (v1)

See [Section 15](#15-out-of-scope-v1) for explicit exclusions.

### 2.3. Assumptions

- Target scale: small to medium deployment (~100–500 users)
- One correct answer per question (radio-button selection)
- Exams are assigned directly to students (no class/course hierarchy)
- Teachers manage their own subjects and questions
- Server time is the source of truth for exam open/close and timers

---

## 3. Technology Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| **Frontend** | Vue.js 3 + Vite + TypeScript | SPA; Composition API |
| **UI styling** | Tailwind CSS (or PrimeVue / Element Plus) | Consistent component library |
| **State / HTTP** | Pinia + Axios | Client state and API calls |
| **Routing** | Vue Router | Role-guarded routes |
| **Backend** | Node.js + Express (or Fastify) | REST API |
| **ORM** | Prisma | Schema, migrations, type-safe queries |
| **Database** | PostgreSQL 15+ | Primary data store |
| **Authentication** | JWT (access token) + bcrypt | Stateless API auth |
| **Validation** | Zod (backend) + VeeValidate (frontend) | Request/form validation |
| **Dev environment** | Docker Compose | PostgreSQL + optional hot-reload services |
| **API docs** | Swagger / OpenAPI 3 | Auto-generated from routes |

### 3.1. Rationale

- **Vue.js**: Progressive framework, good DX for form-heavy exam UIs
- **Node.js**: Shared JavaScript/TypeScript ecosystem with Vue; fast iteration for academic projects
- **PostgreSQL**: Strong relational model for exams, attempts, and answer integrity
- **Prisma**: Clear schema definition suitable for design documentation and migrations

---

## 4. System Architecture

### 4.1. Architectural Style

Three-tier **Client–Server** architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Tier                         │
│              Vue.js SPA (Browser)                            │
│         English UI · Role-based views · Timer UX             │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS / JSON (REST)
┌──────────────────────────▼──────────────────────────────────┐
│                    Application Tier                          │
│              Node.js REST API                                │
│    Auth · Business logic · Validation · Auto-grading         │
└──────────────────────────┬──────────────────────────────────┘
                           │ SQL (Prisma)
┌──────────────────────────▼──────────────────────────────────┐
│                      Data Tier                               │
│                   PostgreSQL                                 │
└─────────────────────────────────────────────────────────────┘
```

### 4.2. Component Overview

| Component | Responsibility |
|-----------|----------------|
| **Web Client** | Renders UI, manages exam session state, countdown timer, answer draft |
| **API Gateway (Express)** | Routing, JWT middleware, error handling, CORS |
| **Auth Service** | Login, token issuance, password hashing |
| **User Service** | CRUD users (Admin) |
| **Subject Service** | Subject CRUD per teacher |
| **Question Service** | Question + options CRUD |
| **Exam Service** | Exam creation, question linking, student assignment |
| **Attempt Service** | Start exam, save answers, submit, grade, results |
| **Report Service** | Aggregated results per exam (teacher view) |

### 4.3. Key Flows

#### 4.3.1. Exam Taking Flow

```
Student → "My Exams" → Start Attempt
    → API validates: assigned, within time window, attempts remaining
    → Returns questions WITHOUT correct-answer flags
    → Student answers (auto-save optional, v1: save on navigation/submit)
    → Submit (manual or auto on timer expiry)
    → Server grades → stores score → returns result per policy
```

#### 4.3.2. Grading Logic

For each question in the attempt:

1. Load `selected_option_id` from `attempt_answers`
2. Compare with `question_options.is_correct = true` for that question
3. Award `questions.points` if match; else 0
4. `exam_attempts.score` = sum of awarded points

---

## 5. Actors & Permissions

### 5.1. Actors

| Actor | Description |
|-------|-------------|
| **Admin** | System administrator; manages all user accounts |
| **Teacher** | Creates subjects, questions, exams; assigns exams; views results |
| **Student** | Takes assigned exams; views own results |

### 5.2. Permission Matrix

| Feature | Admin | Teacher | Student |
|---------|:-----:|:-------:|:-------:|
| Manage users | ✓ | — | — |
| Manage subjects | — | ✓ (own) | — |
| Manage questions | — | ✓ (own subjects) | — |
| Create / edit exams | — | ✓ (own) | — |
| Assign exam to student | — | ✓ | — |
| Take exam | — | — | ✓ (assigned) |
| View own results | — | — | ✓ |
| View exam results (all students) | — | ✓ (own exams) | — |
| View dashboard | ✓ | ✓ | ✓ |

### 5.3. Role Enum

```
ADMIN | TEACHER | STUDENT
```

Stored in `users.role`.

---

## 6. Functional Requirements

### 6.1. Module: Authentication (AUTH)

| ID | Requirement | Priority |
|----|-------------|----------|
| AUTH-01 | User can log in with email and password | Must |
| AUTH-02 | System issues JWT on successful login | Must |
| AUTH-03 | Protected routes require valid JWT | Must |
| AUTH-04 | User can log out (client discards token) | Must |
| AUTH-05 | User can change own password | Should |
| AUTH-06 | Registration open only to Admin (no public sign-up) | Must |

### 6.2. Module: User Management (USR) — Admin

| ID | Requirement | Priority |
|----|-------------|----------|
| USR-01 | Admin can create user with role, name, email, password | Must |
| USR-02 | Admin can update user profile and role | Must |
| USR-03 | Admin can deactivate user (`is_active = false`) | Must |
| USR-04 | Admin can list/search users with filters by role | Must |
| USR-05 | Deactivated users cannot log in | Must |

### 6.3. Module: Subject Management (SUB) — Teacher

| ID | Requirement | Priority |
|----|-------------|----------|
| SUB-01 | Teacher can create subject (code, name, description) | Must |
| SUB-02 | Teacher can edit/delete own subjects | Must |
| SUB-03 | Teacher can list own subjects | Must |
| SUB-04 | Deleting subject blocked if questions or exams exist | Should |

### 6.4. Module: Question Bank (QST) — Teacher

| ID | Requirement | Priority |
|----|-------------|----------|
| QST-01 | Teacher can create single-answer MCQ with 2–6 options | Must |
| QST-02 | Exactly one option marked as correct per question | Must |
| QST-03 | Each question has: content, points, difficulty, subject | Must |
| QST-04 | Teacher can edit/delete own questions | Must |
| QST-05 | Teacher can list/filter questions by subject, difficulty, text | Must |
| QST-06 | Question types limited to **single correct answer** only | Must |

**Question difficulty enum:** `EASY` | `MEDIUM` | `HARD`

### 6.5. Module: Exam Management (EXM) — Teacher

| ID | Requirement | Priority |
|----|-------------|----------|
| EXM-01 | Teacher can create exam: title, subject, duration, open/close time | Must |
| EXM-02 | Teacher can add questions to exam (manual selection) | Must |
| EXM-03 | Teacher can set `max_attempts` (default: 1) | Must |
| EXM-04 | Teacher can set `show_answers_after_submit` flag | Must |
| EXM-05 | Teacher can publish/unpublish exam (`status`) | Must |
| EXM-06 | Teacher can assign exam directly to one or more students | Must |
| EXM-07 | Teacher can view list of assigned students per exam | Must |
| EXM-08 | Teacher can remove assignment before student starts | Should |

**Exam status enum:** `DRAFT` | `PUBLISHED` | `CLOSED`

### 6.6. Module: Exam Taking (ATT) — Student

| ID | Requirement | Priority |
|----|-------------|----------|
| ATT-01 | Student sees list of assigned exams with status | Must |
| ATT-02 | Student can start exam only when: published, within time window, attempts left | Must |
| ATT-03 | Exam screen shows countdown timer based on `duration_minutes` | Must |
| ATT-04 | Student selects one option per question (radio) | Must |
| ATT-05 | Student can navigate between questions | Must |
| ATT-06 | Student can submit exam manually with confirmation | Must |
| ATT-07 | System auto-submits when timer reaches zero | Must |
| ATT-08 | API does not expose correct answers during active attempt | Must |
| ATT-09 | One active attempt per assignment at a time | Must |

### 6.7. Module: Results (RES)

| ID | Requirement | Priority |
|----|-------------|----------|
| RES-01 | System calculates score immediately on submit | Must |
| RES-02 | Student can view score and pass/fail summary | Must |
| RES-03 | Student sees per-question review only if `show_answers_after_submit = true` | Must |
| RES-04 | Teacher can view all attempts for an exam (student, score, time) | Must |
| RES-05 | Teacher can open attempt detail (answers vs correct) | Must |

---

## 7. Use Cases

### 7.1. Use Case List

| UC ID | Name | Actor |
|-------|------|-------|
| UC-01 | Log in | All |
| UC-02 | Manage users | Admin |
| UC-03 | Manage subjects | Teacher |
| UC-04 | Manage questions | Teacher |
| UC-05 | Create and configure exam | Teacher |
| UC-06 | Assign exam to students | Teacher |
| UC-07 | View assigned exams | Student |
| UC-08 | Take exam | Student |
| UC-09 | View exam results | Teacher, Student |
| UC-10 | Auto-grade submission | System |

### 7.2. UC-08: Take Exam (Detailed)

| Field | Description |
|-------|-------------|
| **Preconditions** | Student is logged in; exam is assigned; exam is `PUBLISHED`; current time ∈ [open_at, close_at]; attempts < max_attempts |
| **Main flow** | 1. Student opens "My Exams" → 2. Clicks "Start" → 3. API creates attempt, returns questions (no correct flags) → 4. Student answers questions → 5. Student clicks "Submit Exam" → 6. Confirms → 7. API grades and returns result |
| **Alternate flow A** | Timer expires → client calls submit API → same grading path |
| **Postconditions** | Attempt status = `SUBMITTED`; score persisted |
| **Business rules** | Cannot start if another `IN_PROGRESS` attempt exists for same assignment |

### 7.3. Use Case Diagram (Text)

```
        ┌─────────┐
        │  Admin  │──── Manage Users (UC-02)
        └─────────┘

        ┌──────────┐
        │ Teacher  │──── Manage Subjects (UC-03)
        └────┬─────┘──── Manage Questions (UC-04)
             │         Create Exam (UC-05)
             │         Assign Exam (UC-06)
             └──────── View Results (UC-09)

        ┌──────────┐
        │ Student  │──── View Assigned Exams (UC-07)
        └────┬─────┘──── Take Exam (UC-08)
             └──────── View Own Results (UC-09)

        ┌──────────┐
        │  System  │──── Auto-grade (UC-10)
        └──────────┘
```

---

## 8. Database Design

### 8.1. ERD

```
users ─────────────┬──────────────── subjects
  │                │                      │
  │                │                      │
  │                └── questions ── question_options
  │                         │
  │                         │
  └── exam_assignments      │
         │                  │
         │    exams ────────┴── exam_questions
         │      │
         └── exam_attempts ── attempt_answers
```

### 8.2. Table Definitions

#### `users`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Primary key |
| email | VARCHAR(255) | UNIQUE, NOT NULL | Login email |
| password_hash | VARCHAR(255) | NOT NULL | bcrypt hash |
| full_name | VARCHAR(255) | NOT NULL | Display name |
| role | VARCHAR(20) | NOT NULL | ADMIN, TEACHER, STUDENT |
| is_active | BOOLEAN | DEFAULT true | Account status |
| created_at | TIMESTAMPTZ | NOT NULL | Created timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL | Updated timestamp |

#### `subjects`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Primary key |
| code | VARCHAR(50) | NOT NULL | Subject code |
| name | VARCHAR(255) | NOT NULL | Subject name |
| description | TEXT | NULL | Optional description |
| teacher_id | UUID | FK → users.id | Owner teacher |
| created_at | TIMESTAMPTZ | NOT NULL | |
| updated_at | TIMESTAMPTZ | NOT NULL | |

**Unique:** `(teacher_id, code)`

#### `questions`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| subject_id | UUID | FK → subjects.id | |
| content | TEXT | NOT NULL | Question text |
| difficulty | VARCHAR(20) | NOT NULL | EASY, MEDIUM, HARD |
| points | DECIMAL(5,2) | NOT NULL, DEFAULT 1 | Points if correct |
| created_by | UUID | FK → users.id | |
| created_at | TIMESTAMPTZ | NOT NULL | |
| updated_at | TIMESTAMPTZ | NOT NULL | |

#### `question_options`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| question_id | UUID | FK → questions.id, ON DELETE CASCADE | |
| label | CHAR(1) | NOT NULL | A, B, C, D… |
| content | TEXT | NOT NULL | Option text |
| is_correct | BOOLEAN | NOT NULL, DEFAULT false | Exactly one true per question |

**Business rule:** Application enforces exactly one `is_correct = true` per `question_id`.

#### `exams`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| subject_id | UUID | FK → subjects.id | |
| title | VARCHAR(255) | NOT NULL | Exam title |
| description | TEXT | NULL | |
| duration_minutes | INT | NOT NULL | Exam duration |
| open_at | TIMESTAMPTZ | NOT NULL | Start of availability |
| close_at | TIMESTAMPTZ | NOT NULL | End of availability |
| max_attempts | INT | NOT NULL, DEFAULT 1 | Per student |
| show_answers_after_submit | BOOLEAN | DEFAULT false | Reveal correct answers |
| status | VARCHAR(20) | NOT NULL | DRAFT, PUBLISHED, CLOSED |
| created_by | UUID | FK → users.id | |
| created_at | TIMESTAMPTZ | NOT NULL | |
| updated_at | TIMESTAMPTZ | NOT NULL | |

**Check:** `close_at > open_at`, `duration_minutes > 0`

#### `exam_questions`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| exam_id | UUID | FK → exams.id, ON DELETE CASCADE | |
| question_id | UUID | FK → questions.id | |
| order_index | INT | NOT NULL | Display order |

**PK:** `(exam_id, question_id)`

#### `exam_assignments`

Direct assignment of exam to student (no class entity).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| exam_id | UUID | FK → exams.id, ON DELETE CASCADE | |
| student_id | UUID | FK → users.id | Must be STUDENT role |
| assigned_by | UUID | FK → users.id | Teacher who assigned |
| assigned_at | TIMESTAMPTZ | NOT NULL | |

**Unique:** `(exam_id, student_id)`

#### `exam_attempts`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| assignment_id | UUID | FK → exam_assignments.id | |
| started_at | TIMESTAMPTZ | NOT NULL | |
| expires_at | TIMESTAMPTZ | NOT NULL | started_at + duration |
| submitted_at | TIMESTAMPTZ | NULL | When submitted |
| score | DECIMAL(7,2) | NULL | Final score |
| max_score | DECIMAL(7,2) | NOT NULL | Sum of question points |
| status | VARCHAR(20) | NOT NULL | IN_PROGRESS, SUBMITTED, EXPIRED |

#### `attempt_answers`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| attempt_id | UUID | FK → exam_attempts.id, ON DELETE CASCADE | |
| question_id | UUID | FK → questions.id | |
| selected_option_id | UUID | FK → question_options.id, NULL | Null = unanswered |
| is_correct | BOOLEAN | NULL | Set on submit |

**Unique:** `(attempt_id, question_id)`

### 8.3. Indexes (Recommended)

| Table | Index | Purpose |
|-------|-------|---------|
| users | `(email)` | Login lookup |
| users | `(role)` | Admin user list filter |
| questions | `(subject_id)` | Question bank filter |
| exams | `(created_by, status)` | Teacher exam list |
| exam_assignments | `(student_id)` | Student "My Exams" |
| exam_assignments | `(exam_id)` | Teacher assignment list |
| exam_attempts | `(assignment_id, status)` | Attempt lookup |

### 8.4. Prisma Schema Sketch

```prisma
enum Role {
  ADMIN
  TEACHER
  STUDENT
}

enum Difficulty {
  EASY
  MEDIUM
  HARD
}

enum ExamStatus {
  DRAFT
  PUBLISHED
  CLOSED
}

enum AttemptStatus {
  IN_PROGRESS
  SUBMITTED
  EXPIRED
}

model User {
  id            String   @id @default(uuid())
  email         String   @unique
  passwordHash  String   @map("password_hash")
  fullName      String   @map("full_name")
  role          Role
  isActive      Boolean  @default(true) @map("is_active")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")
  // relations omitted for brevity
  @@map("users")
}
```

---

## 9. API Design

**Base URL:** `/api/v1`  
**Content-Type:** `application/json`  
**Authentication:** `Authorization: Bearer <access_token>`

### 9.1. Standard Response Envelope

**Success:**

```json
{
  "success": true,
  "data": { },
  "message": "OK"
}
```

**Error:**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": []
  }
}
```

### 9.2. HTTP Status Codes

| Code | Usage |
|------|-------|
| 200 | Success (GET, PUT) |
| 201 | Created (POST) |
| 204 | Deleted |
| 400 | Validation error |
| 401 | Unauthorized / invalid token |
| 403 | Forbidden (wrong role or ownership) |
| 404 | Resource not found |
| 409 | Conflict (duplicate assignment, active attempt) |
| 500 | Internal server error |

### 9.3. Auth Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/login` | Public | Login |
| POST | `/auth/change-password` | User | Change own password |
| GET | `/auth/me` | User | Current user profile |

**POST `/auth/login` — Request:**

```json
{
  "email": "student@oex.local",
  "password": "secret123"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbG...",
    "expiresIn": 3600,
    "user": {
      "id": "uuid",
      "email": "student@oex.local",
      "fullName": "Jane Student",
      "role": "STUDENT"
    }
  }
}
```

### 9.4. User Endpoints (Admin)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users` | List users (`?role=STUDENT&search=`) |
| POST | `/users` | Create user |
| GET | `/users/:id` | Get user |
| PUT | `/users/:id` | Update user |
| PATCH | `/users/:id/status` | Activate/deactivate |

### 9.5. Subject Endpoints (Teacher)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/subjects` | List own subjects |
| POST | `/subjects` | Create subject |
| GET | `/subjects/:id` | Get subject |
| PUT | `/subjects/:id` | Update subject |
| DELETE | `/subjects/:id` | Delete subject |

### 9.6. Question Endpoints (Teacher)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/questions` | List (`?subjectId=&difficulty=&q=`) |
| POST | `/questions` | Create question with options |
| GET | `/questions/:id` | Get question (includes correct option — teacher only) |
| PUT | `/questions/:id` | Update question |
| DELETE | `/questions/:id` | Delete question |

**POST `/questions` — Request:**

```json
{
  "subjectId": "uuid",
  "content": "What is the capital of France?",
  "difficulty": "EASY",
  "points": 1,
  "options": [
    { "label": "A", "content": "London", "isCorrect": false },
    { "label": "B", "content": "Paris", "isCorrect": true },
    { "label": "C", "content": "Berlin", "isCorrect": false },
    { "label": "D", "content": "Madrid", "isCorrect": false }
  ]
}
```

### 9.7. Exam Endpoints (Teacher)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/exams` | List own exams |
| POST | `/exams` | Create exam |
| GET | `/exams/:id` | Get exam detail |
| PUT | `/exams/:id` | Update exam |
| DELETE | `/exams/:id` | Delete exam (DRAFT only) |
| PUT | `/exams/:id/questions` | Set question list + order |
| PATCH | `/exams/:id/status` | Publish / close exam |
| POST | `/exams/:id/assignments` | Assign students |
| GET | `/exams/:id/assignments` | List assigned students |
| DELETE | `/exams/:id/assignments/:assignmentId` | Remove assignment |
| GET | `/exams/:id/results` | All attempts summary |

**POST `/exams/:id/assignments` — Request:**

```json
{
  "studentIds": ["uuid-1", "uuid-2"]
}
```

### 9.8. Student Exam Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/my-exams` | Assigned exams with attempt summary |
| POST | `/attempts/start` | Start new attempt |
| GET | `/attempts/:id` | Get in-progress attempt (questions, no answers) |
| PUT | `/attempts/:id/answers` | Save answers (batch) |
| POST | `/attempts/:id/submit` | Submit and grade |
| GET | `/attempts/:id/result` | View result after submit |

**POST `/attempts/start` — Request:**

```json
{
  "assignmentId": "uuid"
}
```

**GET `/attempts/:id` — Question payload (student, in progress):**

```json
{
  "success": true,
  "data": {
    "attemptId": "uuid",
    "expiresAt": "2025-06-23T10:45:00Z",
    "questions": [
      {
        "id": "uuid",
        "orderIndex": 1,
        "content": "What is the capital of France?",
        "points": 1,
        "options": [
          { "id": "uuid", "label": "A", "content": "London" },
          { "id": "uuid", "label": "B", "content": "Paris" }
        ]
      }
    ],
    "answers": {
      "question-uuid": "selected-option-uuid"
    }
  }
}
```

> **Note:** `isCorrect` is never included in student in-progress responses.

**POST `/attempts/:id/submit` — Response:**

```json
{
  "success": true,
  "data": {
    "score": 8,
    "maxScore": 10,
    "correctCount": 8,
    "totalQuestions": 10,
    "submittedAt": "2025-06-23T10:30:00Z",
    "review": []
  }
}
```

`review` array populated only when `show_answers_after_submit` is true.

### 9.9. Error Codes (Application)

| Code | Meaning |
|------|---------|
| `INVALID_CREDENTIALS` | Wrong email/password |
| `ACCOUNT_INACTIVE` | User deactivated |
| `FORBIDDEN` | Role/ownership violation |
| `EXAM_NOT_AVAILABLE` | Outside window or not published |
| `MAX_ATTEMPTS_REACHED` | No attempts left |
| `ATTEMPT_IN_PROGRESS` | Already has active attempt |
| `ATTEMPT_EXPIRED` | Past expires_at |
| `VALIDATION_ERROR` | Input validation failed |

---

## 10. User Interface Design

**Language:** English (all labels, buttons, messages, validation text)

### 10.1. Route Map

| Route | Page | Role |
|-------|------|------|
| `/login` | Login | Public |
| `/` | Dashboard | All |
| `/admin/users` | User Management | Admin |
| `/subjects` | Subject List | Teacher |
| `/subjects/:id/questions` | Question Bank | Teacher |
| `/questions/new` | Create Question | Teacher |
| `/questions/:id/edit` | Edit Question | Teacher |
| `/exams` | Exam List | Teacher |
| `/exams/new` | Create Exam | Teacher |
| `/exams/:id` | Exam Detail & Assign | Teacher |
| `/exams/:id/results` | Exam Results | Teacher |
| `/my-exams` | My Exams | Student |
| `/take/:attemptId` | Exam Taking | Student |
| `/results/:attemptId` | Result Detail | Student |

### 10.2. Screen Specifications

#### 10.2.1. Login

| Element | Text / Behavior |
|---------|-----------------|
| Title | "Sign in to OEX" |
| Email field | Placeholder: "Email address" |
| Password field | Placeholder: "Password" |
| Submit button | "Sign in" |
| Error | "Invalid email or password." |
| Inactive account | "Your account has been deactivated. Contact an administrator." |

#### 10.2.2. Dashboard

Role-specific widgets:

- **Admin:** Total users, link to User Management
- **Teacher:** Subject count, active exams, recent results
- **Student:** Upcoming exams, recent scores

#### 10.2.3. Question Form (Teacher)

| Field | Type | Notes |
|-------|------|-------|
| Subject | Select | Required |
| Question text | Textarea | Required |
| Difficulty | Select: Easy / Medium / Hard | Required |
| Points | Number | Min 0.5, step 0.5 |
| Options | Dynamic list (min 2) | Label A–F auto |
| Correct answer | Radio per question | Exactly one |

Buttons: "Save Question", "Cancel"

Validation: "Select exactly one correct answer."

#### 10.2.4. Exam Form (Teacher)

| Field | Type |
|-------|------|
| Title | Text |
| Subject | Select |
| Description | Textarea |
| Duration (minutes) | Number |
| Open date/time | Datetime picker |
| Close date/time | Datetime picker |
| Max attempts | Number (default 1) |
| Show answers after submit | Toggle |

Question picker: searchable list from subject's question bank with checkbox + drag reorder.

#### 10.2.5. Assign Students (Teacher)

- Search students by name/email
- Multi-select table
- Button: "Assign Selected"
- Assigned list with "Remove" (if no submitted attempt)

#### 10.2.6. My Exams (Student)

Table columns: Exam Title, Subject, Opens, Closes, Duration, Status, Action

Status badges: `Not Started` | `In Progress` | `Submitted` | `Closed`

Actions: "Start" / "Resume" / "View Result"

#### 10.2.7. Exam Taking (Student) — Critical Screen

Layout:

```
┌────────────────────────────────────────────────────────────┐
│  OEX — Exam Title          Time remaining: 00:42:15        │
├────────────────────────────────────┬───────────────────────┤
│  Question 3 of 10                  │  Question Navigator │
│                                    │  [1][2][3*][4][5]...  │
│  What is the capital of France?    │                       │
│                                    │  Answered: 7/10       │
│  ○ A. London                       │  Unanswered: 3        │
│  ● B. Paris                        │                       │
│  ○ C. Berlin                       │                       │
│  ○ D. Madrid                       │                       │
│                                    │                       │
│  [Previous]  [Next]                │  [Submit Exam]        │
└────────────────────────────────────┴───────────────────────┘
```

Behaviors:

- Timer counts down from `expires_at`; turns red under 5 minutes
- "Submit Exam" opens modal: "Are you sure you want to submit? You cannot change answers after submission."
- On timeout: auto-submit with toast "Time is up. Your exam has been submitted."
- Warn on browser refresh: "Leaving may lose unsaved answers."

#### 10.2.8. Result (Student)

| Element | Content |
|---------|---------|
| Score headline | "Your score: 8 / 10" |
| Summary | Correct count, time taken |
| Review section | Shown only if allowed; each question with selected vs correct |

#### 10.2.9. Exam Results (Teacher)

Table: Student Name, Email, Score, Max Score, Submitted At, Status  
Row action: "View Detail"

### 10.3. UI States (All Data Views)

Every list/detail view implements:

1. **Loading** — skeleton or spinner with context (e.g. "Loading exams…")
2. **Empty** — explanation + primary action (e.g. "No exams yet. Create your first exam.")
3. **Error** — message + "Try again" button
4. **Success feedback** — toast matching action verb ("Exam published.")

### 10.4. UI Copy Conventions

| Action | Button | Toast |
|--------|--------|-------|
| Save question | Save Question | Question saved. |
| Create exam | Create Exam | Exam created. |
| Publish | Publish Exam | Exam published. |
| Assign | Assign Selected | Students assigned. |
| Submit exam | Submit Exam | Exam submitted. |

---

## 11. Security Design

### 11.1. Authentication

- Passwords hashed with **bcrypt** (cost factor ≥ 10)
- JWT access token expiry: **1 hour** (configurable)
- Token payload: `{ sub: userId, role, email }` — no sensitive data

### 11.2. Authorization

- Middleware validates JWT on protected routes
- Role guard per route group
- Ownership check: teachers can only access own subjects/questions/exams
- Students can only access own assignments and attempts

### 11.3. Exam Integrity

| Threat | Mitigation (v1) |
|--------|-----------------|
| Answer leakage in API | Strip `is_correct` from student-facing question payloads during attempt |
| Replay of submit | Idempotent submit; attempt status must be `IN_PROGRESS` |
| Expired attempt answers | Server rejects saves/submits after `expires_at` |
| Direct URL access | Verify attempt belongs to authenticated student |

### 11.4. Input Validation

- Server-side validation on all write endpoints (Zod schemas)
- Parameterized queries via Prisma (SQL injection prevention)
- Max body size limit on Express

### 11.5. Transport

- HTTPS required in production
- CORS restricted to frontend origin

---

## 12. Non-Functional Requirements

| ID | Category | Requirement |
|----|----------|-------------|
| NFR-01 | Performance | API p95 response < 500 ms under 50 concurrent users |
| NFR-02 | Availability | Target 99% uptime (production) |
| NFR-03 | Scalability | Stateless API; horizontal scaling possible |
| NFR-04 | Usability | Responsive layout; usable on tablet for exam-taking |
| NFR-05 | Accessibility | Focus states visible; form labels associated |
| NFR-06 | Maintainability | OpenAPI spec; modular service folders |
| NFR-07 | Data integrity | Foreign keys; transactions on submit/grade |
| NFR-08 | Logging | Request errors logged; auth failures logged |

---

## 13. Deployment Design

### 13.1. Environments

| Environment | Purpose |
|-------------|---------|
| **Development** | Local machines, Docker Compose for PostgreSQL |
| **Production** | VPS or cloud (single-node acceptable for v1) |

### 13.2. Docker Compose (Development)

```yaml
services:
  postgres:
    image: postgres:15
    ports: ["5432:5432"]
    environment:
      POSTGRES_DB: oex
      POSTGRES_USER: oex
      POSTGRES_PASSWORD: oex_dev

  # Optional: backend + frontend as services with volume mounts
```

### 13.3. Production Topology

```
Internet
    │
    ▼
┌─────────┐
│  Nginx  │  SSL termination, static files, reverse proxy
└────┬────┘
     ├── /        → Vue build (dist/)
     └── /api/v1  → Node.js container :3000
                           │
                           ▼
                    PostgreSQL (managed or container)
```

### 13.4. Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Signing secret |
| `JWT_EXPIRES_IN` | Token TTL (e.g. `1h`) |
| `PORT` | API port (default 3000) |
| `CORS_ORIGIN` | Frontend URL |
| `NODE_ENV` | `development` / `production` |

### 13.5. Build & Release

1. `prisma migrate deploy` on release
2. Build frontend: `npm run build` → serve via Nginx
3. Build/start backend: `node dist/index.js` or PM2

---

## 14. Testing Plan

### 14.1. Test Levels

| Level | Scope | Tools |
|-------|-------|-------|
| Unit | Grading logic, validators, auth helpers | Vitest / Jest |
| Integration | API endpoints + database | Supertest + test DB |
| E2E | Login → take exam → submit → view result | Playwright / Cypress |
| Manual | UI review, edge cases | Test checklist |

### 14.2. Critical Test Cases

| TC ID | Scenario | Expected |
|-------|----------|----------|
| TC-01 | Login with valid credentials | 200, JWT returned |
| TC-02 | Login inactive user | 403, ACCOUNT_INACTIVE |
| TC-03 | Create question with 2 correct options | 400 validation error |
| TC-04 | Start exam outside time window | 400 EXAM_NOT_AVAILABLE |
| TC-05 | Submit with all correct answers | score = max_score |
| TC-06 | Submit after timer expiry | EXPIRED or auto-submit with grade |
| TC-07 | Student cannot access another student's attempt | 403 |
| TC-08 | API during attempt omits is_correct | No correct flags in payload |
| TC-09 | max_attempts = 1, second start | 409 MAX_ATTEMPTS_REACHED |
| TC-10 | show_answers_after_submit = false | review array empty for student |

---

## 15. Out of Scope (v1)

The following are explicitly **not** included in version 1.0:

| Feature | Notes |
|---------|-------|
| Excel / CSV import | Manual question entry only |
| Anti-cheating (tab switch detection, fullscreen lock, proctoring) | Deferred |
| Multiple correct answers | Single-answer MCQ only |
| Class / course management | Direct exam-to-student assignment |
| Question images / rich media | Text-only questions |
| Random question draw from pool | Manual question selection per exam |
| Shuffle questions/options | Fixed order |
| Email notifications | — |
| OAuth / SSO | Email + password only |
| Vietnamese UI | English only |

These may be added in future versions (v2+).

---

## 16. Project Structure

```
OEX/
├── docs/
│   ├── basic_requirement.md
│   └── OEX_DetailedDesign_V1.md      ← this document
├── frontend/                          # Vue.js SPA
│   ├── src/
│   │   ├── api/                       # Axios clients
│   │   ├── components/
│   │   ├── views/                     # Page components
│   │   ├── router/
│   │   ├── stores/                    # Pinia
│   │   └── types/
│   ├── package.json
│   └── vite.config.ts
├── backend/                           # Node.js API
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── middleware/
│   │   ├── validators/
│   │   └── utils/
│   ├── prisma/
│   │   └── schema.prisma
│   └── package.json
├── docker-compose.yml
└── README.md
```

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| **OEX** | Online Examination System |
| **MCQ** | Multiple Choice Question (single correct answer) |
| **Attempt** | One instance of a student taking an assigned exam |
| **Assignment** | Link between an exam and a student |
| **Question bank** | Collection of questions under a subject |

## Appendix B: Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 23/06/2025 | — | Initial detailed design per approved scope |

---

*End of document*
