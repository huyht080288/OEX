# OEX — Online Examination System

Hệ thống thi trắc nghiệm trực tuyến: giáo viên tạo ngân hàng câu hỏi và đề thi, gán bài cho học sinh; học sinh làm bài online có timer; hệ thống chấm điểm tự động sau khi nộp bài.

| | |
|---|---|
| **Stack** | Vue 3 · Node.js · Express · PostgreSQL · Prisma · TypeScript |
| **UI** | Tiếng Anh |
| **API base** | `http://localhost:5002/api/v1` |
| **Frontend dev** | `http://localhost:5001` |
| **Swagger UI** | `http://localhost:5002/api/docs` |
| **Coverage report** | `http://localhost:5002/testcoverage.html` |
| **Trạng thái v1** | Hoàn thiện — **84 API tests** pass |

**Tài liệu thiết kế:** [`docs/OEX_DetailedDesign_V2.md`](docs/OEX_DetailedDesign_V2.md)  
**OpenAPI spec:** [`docs/api/openapi.yaml`](docs/api/openapi.yaml)  
**Deploy production:** [`docs/DEPLOY.md`](docs/DEPLOY.md)  
**Báo cáo đồ án:** [`docs/Report.md`](docs/Report.md)  
**Slide thuyết trình:** [`docs/OEX_Presentation.pptx`](docs/OEX_Presentation.pptx)

---

## Mục lục

1. [Yêu cầu hệ thống](#yêu-cầu-hệ-thống)
2. [Cấu trúc repository](#cấu-trúc-repository)
3. [Khởi động nhanh (Quick start)](#khởi-động-nhanh-quick-start)
4. [Database — khởi tạo & quản lý](#database--khởi-tạo--quản-lý)
5. [Biến môi trường](#biến-môi-trường)
6. [Chạy ứng dụng (development)](#chạy-ứng-dụng-development)
7. [Swagger UI — test API trên trình duyệt](#swagger-ui--test-api-trên-trình-duyệt)
8. [Kiểm thử tự động (automated tests)](#kiểm-thử-tự-động-automated-tests)
9. [Kiểm thử thủ công (manual / demo)](#kiểm-thử-thủ-công-manual--demo)
10. [Tài khoản mẫu & luồng demo](#tài-khoản-mẫu--luồng-demo)
11. [API — tổng quan](#api--tổng-quan)
12. [Build production](#build-production)
13. [Tài liệu & công cụ hỗ trợ](#tài-liệu--công-cụ-hỗ-trợ)
14. [Cursor agent (skills)](#cursor-agent-skills)
15. [Phạm vi v1](#phạm-vi-v1)
16. [Xử lý sự cố](#xử-lý-sự-cố)
17. [Bảng lệnh thường dùng](#bảng-lệnh-thường-dùng)

---

## Yêu cầu hệ thống

| Công cụ | Phiên bản gợi ý | Dùng để |
|---------|-----------------|---------|
| [Node.js](https://nodejs.org/) | **20 LTS** trở lên | Backend + Frontend |
| npm | đi kèm Node | Quản lý package |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | mới nhất | PostgreSQL local (khuyến nghị) |
| [Git](https://git-scm.com/) | mới nhất | Clone / version control |
| Cursor hoặc VS Code | tùy chọn | IDE |

**Tùy chọn:** `psql`, [DBeaver](https://dbeaver.io/) — xem/sửa database trực tiếp · [Pandoc](https://pandoc.org/) + Python — build báo cáo Word

**Windows:** Trong PowerShell dùng `;` thay `&&` khi nối lệnh, hoặc chạy từng lệnh riêng.

---

## Cấu trúc repository

```
PMHDV/
├── PrjMng/                 # Tiến độ — đọc STATUS.md trước khi code
│   ├── STATUS.md           # Phase hiện tại, next action
│   ├── TASKS.md            # Backlog theo phase
│   ├── DECISIONS.md        # Quyết định đã khóa
│   └── CHANGELOG.md        # Nhật ký triển khai
├── docs/
│   ├── OEX_DetailedDesign_V2.md
│   ├── api/openapi.yaml    # REST contract (Swagger dùng file này)
│   ├── DEPLOY.md
│   ├── MANUAL_TEST_CHECKLIST.md
│   ├── Report.md           # Báo cáo đồ án
│   ├── images/             # Screenshot + diagram PNG
│   └── scripts/            # Screenshot, diagram, Word, slide generators
├── backend/
│   ├── src/                # Express API (routes → controllers → services)
│   ├── prisma/             # schema, migrations, seed
│   └── tests/              # Vitest + Supertest (84 tests)
├── frontend/
│   └── src/                # Vue 3 SPA (views, stores, api client)
├── .cursor/                # Rules & skills cho Cursor agent
├── docker-compose.yml      # PostgreSQL 15
└── readme.md
```

---

## Khởi động nhanh (Quick start)

Thực hiện **một lần** khi clone project mới:

```bash
git clone https://github.com/huyht080288/OEX

# 1. Database
docker compose up -d

# 2. Env files
cp backend/.env.example backend/.env
cp backend/.env.test.example backend/.env.test
cp frontend/.env.example frontend/.env

# 3. Backend: install + migrate + seed
cd backend
npm install
npx prisma migrate deploy
npx prisma db seed

# 4. Frontend: install
cd ../frontend
npm install
cd ..

```

Chạy hàng ngày — **2 terminal chính + 1 terminal Prisma Studio (tùy chọn)**:

```bash
# Terminal 1 — API
cd backend
npm run dev

# Terminal 2 — SPA
cd frontend
npm run dev

# Terminal 3 — giao diện quản lý database (tùy chọn)
cd backend
npm run db:studio

```

Mở trên trình duyệt:

| Giao diện | Địa chỉ |
|-----------|---------|
| OEX Frontend | **http://localhost:5001** |
| Swagger API | **http://localhost:5002/api/docs** |
| Prisma Studio (database) | **http://localhost:5003** |

> Prisma Studio phải chạy ở terminal riêng và terminal đó cần được giữ mở. Công cụ này cho phép xem/sửa trực tiếp database, chỉ nên dùng trong môi trường development và không public ra Internet.

Đăng nhập demo: `teacher@oex.test` / `Password123!`

---

## Database — khởi tạo & quản lý

### Docker PostgreSQL (khuyến nghị)

```bash
docker compose up -d          # Khởi động
docker compose ps           # Kiểm tra trạng thái
docker compose logs postgres
docker compose down           # Dừng (giữ data volume)
docker compose down -v        # Dừng + XÓA toàn bộ data (reset sạch)
```

| Thông số | Giá trị dev |
|----------|-------------|
| Host | `localhost` |
| Port | `5005` (host) → `5432` (container) |
| Database | `oex` |
| User / Password | `oex` / `oex` |
| Connection string | `postgresql://oex:oex@localhost:5005/oex?schema=public` |

### Migrate & seed (dev database `oex`)

```bash
cd backend
npx prisma migrate deploy    # Áp dụng migrations (production-safe)
npx prisma db seed           # Nạp dữ liệu mẫu (users, subjects, exams, …)
npx prisma generate          # Tạo lại Prisma Client sau khi đổi schema
npm run db:studio            # GUI xem/sửa DB tại http://localhost:5003
```

**Tạo migration mới** (khi đổi `schema.prisma` trong dev):

```bash
cd backend
npm run db:migrate           # = prisma migrate dev
```

### Database test (`oex_test`)

Dùng cho `npm run db:test:prepare` khi muốn chuẩn bị test DB thủ công trên Docker Postgres:

```sql
-- Chạy một lần trong psql hoặc DBeaver
CREATE DATABASE oex_test;
```

```bash
cd backend
npm run db:test:prepare      # migrate deploy + seed vào oex_test
```

> **Lưu ý:** `npm run test` **không bắt buộc** Docker hay `oex_test` sẵn có. Vitest `globalSetup` tự thử kết nối `DATABASE_URL` từ `.env.test`; nếu không được sẽ khởi động **embedded PostgreSQL** cổng `5433` (data trong `backend/tmp/pgdata-test`).

### Reset database dev (khi data lỗi / muốn làm lại từ đầu)

```bash
docker compose down -v
docker compose up -d
cd backend
npx prisma migrate deploy
npx prisma db seed
```

---

## Biến môi trường

### Backend — `backend/.env`

Copy từ `backend/.env.example`:

| Biến | Bắt buộc | Mô tả |
|------|----------|-------|
| `DATABASE_URL` | ✓ | PostgreSQL connection string |
| `JWT_SECRET` | ✓ | Khóa ký JWT — **đổi trong production** |
| `JWT_EXPIRES_IN` | | Thời hạn token, mặc định `1h` |
| `PORT` | | Cổng API, mặc định `5002` |
| `CORS_ORIGIN` | | Origin frontend, mặc định `http://localhost:5001` |
| `NODE_ENV` | | `development` / `production` / `test` |
| `SWAGGER_ENABLED` | | `true` (mặc định) — set `false` để tắt `/api/docs` |

```env
DATABASE_URL="postgresql://oex:oex@localhost:5005/oex?schema=public"
JWT_SECRET="dev-secret-change-in-production"
JWT_EXPIRES_IN="1h"
PORT=5002
CORS_ORIGIN="http://localhost:5001"
NODE_ENV="development"
SWAGGER_ENABLED="true"
```

### Backend test — `backend/.env.test`

Copy từ `backend/.env.test.example`:

```env
DATABASE_URL="postgresql://oex:oex@localhost:5005/oex_test?schema=public"
JWT_SECRET="test-secret"
JWT_EXPIRES_IN="1h"
PORT=5002
NODE_ENV="test"
```

### Frontend — `frontend/.env`

```env
VITE_API_BASE_URL=/api/v1
```

Vite dev server **proxy** `/api` → `http://localhost:5002` (xem `frontend/vite.config.ts`), nên mặc định không cần đổi URL.

---

## Chạy ứng dụng (development)

### Backend API

```bash
cd backend
npm run dev
```

| Endpoint | URL |
|----------|-----|
| API v1 | http://localhost:5002/api/v1 |
| Health check | http://localhost:5002/health |
| Swagger UI | http://localhost:5002/api/docs |
| OpenAPI YAML | http://localhost:5002/api/openapi.yaml |
| Test coverage HTML | http://localhost:5002/testcoverage.html |

Console khi start:

```
OEX API listening on http://localhost:5002/api/v1
Swagger UI: http://localhost:5002/api/docs
```

### Frontend SPA

```bash
cd frontend
npm run dev
```

| | |
|---|---|
| App | http://localhost:5001 |
| Proxy API | `/api/*` → backend `:5002` |

### Production local (smoke)

```bash
cd backend && npm run build && npm start
cd frontend && npm run build && npm run preview
```

Chi tiết deploy thật: [`docs/DEPLOY.md`](docs/DEPLOY.md).

---

## Swagger UI — test API trên trình duyệt

Swagger UI đọc spec từ [`docs/api/openapi.yaml`](docs/api/openapi.yaml) — đồng bộ với tài liệu thiết kế.

### Bước 1 — Khởi động backend

```bash
cd backend && npm run dev
```

Mở **http://localhost:5002/api/docs**

### Bước 2 — Đăng nhập lấy JWT

1. Mở **Auth** → **POST /auth/login** → **Try it out**
2. Request body:

```json
{
  "email": "teacher@oex.test",
  "password": "Password123!"
}
```

3. **Execute** → copy `data.accessToken` từ response

### Bước 3 — Authorize

1. Bấm nút **Authorize** (🔒) phía trên
2. Nhập: `Bearer <accessToken>` (có chữ `Bearer` và dấu cách)
3. **Authorize** → **Close**

### Bước 4 — Gọi API

Thử các nhóm endpoint theo role:

| Role | Email | Thử endpoint |
|------|-------|--------------|
| Teacher | `teacher@oex.test` | GET `/subjects`, GET `/exams`, POST `/questions` |
| Student | `student2@oex.test` | GET `/my-exams`, POST `/attempts/start` |
| Admin | `admin@oex.test` | GET `/users`, POST `/users` |

### Gợi ý khi test

- Response envelope: thành công `{ "success": true, "data": ... }`, lỗi `{ "success": false, "error": { "code", "message" } }`
- Token hết hạn (`JWT_EXPIRES_IN`) → login lại
- Swagger lưu token giữa các request nếu bật **persistAuthorization** (mặc định)
- Tắt Swagger production: `SWAGGER_ENABLED=false` trong `.env`

### Test API bằng curl (không cần Swagger)

```bash
# Login
curl -s -X POST http://localhost:5002/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"teacher@oex.test","password":"Password123!"}'

# Dùng token (thay <TOKEN>)
curl -s http://localhost:5002/api/v1/subjects \
  -H "Authorization: Bearer <TOKEN>"
```

---

## Kiểm thử tự động (automated tests)

### Yêu cầu pass (quality gate)

Backend **không coi là xong** nếu:

```bash
cd backend
npm run test    # exit code 0, 0 failed — hiện tại 84 tests
```

### Chạy test

```bash
cd backend

# Toàn bộ suite (khuyến nghị trước khi commit / nộp bài)
npm run test

# Chỉ E2E smoke — luồng học sinh: login → start → save → submit → result
npm run test:e2e

# Watch mode (dev)
npm run test:watch

# Chạy test và tạo báo cáo HTML trong backend/coverage/
npm run test:coverage

# Chuẩn bị DB test thủ công (Docker oex_test)
npm run db:test:prepare
npm run test
```

Sau khi chạy coverage và khởi động Backend, mở:

**http://localhost:5002/testcoverage.html**

### Cơ chế test database

1. Đọc `DATABASE_URL` từ `backend/.env.test`
2. Nếu kết nối được → migrate + seed DB đó
3. Nếu không → thử embedded PG cổng `5433`
4. Nếu vẫn không → tự khởi động embedded PostgreSQL (`backend/tmp/pgdata-test`)
5. Ghi `backend/.test-runtime.env` (tự tạo/xóa khi chạy test)

### Phân bổ 84 tests

| File test | Số test | Phạm vi |
|-----------|---------|---------|
| `auth.test.ts` | 10 | Login, me, change-password, inactive user |
| `users.test.ts` | 11 | CRUD user, role filter, deactivate |
| `subjects.test.ts` | 9 | CRUD subject, ownership teacher |
| `questions.test.ts` | 10 | CRUD MCQ, validate 1 đáp án đúng |
| `exams.test.ts` | 19 | CRUD exam, questions, publish, assign, results |
| `attempts.test.ts` | 17 | Start, save, submit, expire, hide answers |
| `students.test.ts` | 3 | List students for assign |
| `e2e-student-flow.test.ts` | 2 | Full student journey (smoke) |
| `swagger.test.ts` | 2 | `/api/docs`, `/api/openapi.yaml` |
| `coverageReport.test.ts` | 1 | Redirect đến báo cáo coverage HTML |
| **Tổng** | **84** | |

### Frontend build check

```bash
cd frontend
npm run build    # vue-tsc + Vite production bundle
```

---

## Kiểm thử thủ công (manual / demo)

Checklist đầy đủ: [`docs/MANUAL_TEST_CHECKLIST.md`](docs/MANUAL_TEST_CHECKLIST.md) (40+ testcase UI).

**Trước khi demo / bảo vệ:**

- [ ] `docker compose up -d`
- [ ] `cd backend && npm run dev`
- [ ] `cd frontend && npm run dev`
- [ ] `npm run test` pass
- [ ] Mở http://localhost:5001

**Script chụp screenshot** (cần FE + BE đang chạy):

```bash
cd docs/scripts
npm install
npx playwright install chromium
npm run capture-screenshots
# → docs/images/01-login.png … 13-result.png
```

---

## Tài khoản mẫu & luồng demo

**Mật khẩu tất cả tài khoản seed:** `Password123!`

| Email | Role | Ghi chú |
|-------|------|---------|
| `admin@oex.test` | Admin | Quản lý user |
| `teacher@oex.test` | Teacher | Demo chính — môn, câu hỏi, đề thi |
| `teacher2@oex.test` | Teacher | |
| `student1@oex.test` | Student | |
| `student2@oex.test` | Student | Demo làm bài |
| `student3@oex.test` … `student10@oex.test` | Student | |
| `teacher3@oex.test` … `teacher10@oex.test` | Teacher | |
| `inactive@oex.test` | Student | Tài khoản bị khóa (test) |

Seed gồm **≥10 bản ghi mỗi loại**: users, subjects, questions, exams, assignments, attempts. ID cố định export trong `backend/prisma/seed-data.ts` (dùng cho tests).

### Luồng demo nhanh

| Role | Đăng nhập | Thử trên UI |
|------|-----------|-------------|
| **Teacher** | `teacher@oex.test` | Subjects → Question Bank → Exams → Publish → Assign student |
| **Student** | `student2@oex.test` | My Exams → Start → làm bài → Submit → xem Result |
| **Admin** | `admin@oex.test` | Dashboard → User Management → CRUD user |

### Luồng demo qua Swagger

Teacher: login → GET `/subjects` → GET `/exams`  
Student: login → GET `/my-exams` → POST `/attempts/start` → PUT `/attempts/:id/answers` → POST `/attempts/:id/submit`

---

## API — tổng quan

| | |
|---|---|
| Base URL | `http://localhost:5002/api/v1` |
| Auth | `Authorization: Bearer <JWT>` (trừ `POST /auth/login`) |
| Spec | [`docs/api/openapi.yaml`](docs/api/openapi.yaml) |
| Swagger | http://localhost:5002/api/docs |

### Nhóm endpoint

| Prefix | Role | Chức năng |
|--------|------|-----------|
| `/auth` | Public / Any | login, me, change-password |
| `/users` | Admin | CRUD user |
| `/subjects` | Teacher | CRUD môn học |
| `/questions` | Teacher | CRUD câu MCQ |
| `/exams` | Teacher | CRUD đề, publish, assign, results |
| `/students` | Teacher | Danh sách học sinh (gán đề) |
| `/my-exams` | Student | Đề được gán |
| `/attempts` | Student | start, save answers, submit, result |

### Mã lỗi nghiệp vụ thường gặp

| Code | HTTP | Ý nghĩa |
|------|------|---------|
| `INVALID_CREDENTIALS` | 401 | Sai email/password |
| `ACCOUNT_INACTIVE` | 403 | Tài khoản bị khóa |
| `FORBIDDEN` | 403 | Sai role / không sở hữu resource |
| `NOT_FOUND` | 404 | Không tìm thấy |
| `EXAM_NOT_AVAILABLE` | 400 | Chưa publish / ngoài khung giờ |
| `MAX_ATTEMPTS_REACHED` | 400 | Hết lượt làm |
| `ATTEMPT_EXPIRED` | 400 | Hết giờ làm bài |
| `VALIDATION_ERROR` | 400 | Dữ liệu không hợp lệ |

---

## Build production

Tóm tắt — chi tiết trong [`docs/DEPLOY.md`](docs/DEPLOY.md):

```bash
# Backend
cd backend
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
NODE_ENV=production node dist/index.js

# Frontend
cd frontend
npm ci
npm run build
# Phục vụ frontend/dist qua Nginx/CDN, proxy /api/v1 → backend
```

**Production lưu ý:** Đổi `JWT_SECRET`, hạn chế `CORS_ORIGIN`, dùng HTTPS, **không** chạy `prisma db seed` với data demo.

---

## Tài liệu & công cụ hỗ trợ

| File / thư mục | Mục đích |
|----------------|----------|
| [`PrjMng/STATUS.md`](PrjMng/STATUS.md) | Phase hiện tại, việc tiếp theo |
| [`PrjMng/TASKS.md`](PrjMng/TASKS.md) | Backlog theo phase |
| [`PrjMng/DECISIONS.md`](PrjMng/DECISIONS.md) | Quyết định đã khóa (stack, scope cuts) |
| [`PrjMng/CHANGELOG.md`](PrjMng/CHANGELOG.md) | Nhật ký triển khai |
| [`docs/OEX_DetailedDesign_V2.md`](docs/OEX_DetailedDesign_V2.md) | Thiết kế chi tiết |
| [`docs/api/openapi.yaml`](docs/api/openapi.yaml) | REST API contract |
| [`docs/DEPLOY.md`](docs/DEPLOY.md) | Hướng dẫn deploy |
| [`docs/MANUAL_TEST_CHECKLIST.md`](docs/MANUAL_TEST_CHECKLIST.md) | Checklist test UI |
| [`docs/Report.md`](docs/Report.md) | Báo cáo đồ án PMHDV |
| [`docs/OEX_Presentation.pptx`](docs/OEX_Presentation.pptx) | Slide thuyết trình |
| [`docs/images/`](docs/images/) | Screenshot + diagram PNG |

### Scripts trong `docs/scripts/`

```bash
cd docs/scripts
npm install

npm run capture-screenshots   # Chụp 13 màn hình UI (Playwright)
npm run render-diagrams       # Render Mermaid → PNG
npm run build-nhom11-docx     # Report.md → Word (cần pandoc + Python)
npm run build-presentation    # Tạo slide PowerPoint
```

---

## Cursor agent (skills)

| Phạm vi | Skill / rule |
|---------|----------------|
| Luôn bật | `.cursor/rules/oex-project-layout.mdc` |
| Chung FE + BE | `.cursor/skills/oex-coding/` |
| Chỉ backend | `.cursor/skills/oex-backend/` |
| Chỉ frontend | `.cursor/skills/frontend-design/` |

Khi agent tiếp tục code: đọc `PrjMng/STATUS.md` trước, cập nhật `STATUS.md` + `CHANGELOG.md` sau mỗi phase/task lớn.

---

## Phạm vi v1

**Có trong v1:**

- Auth JWT + phân quyền Admin / Teacher / Student
- MCQ **một đáp án đúng**
- Ngân hàng câu hỏi, tạo đề, publish, gán học sinh trực tiếp
- Làm bài online: timer, auto-save, auto-submit khi hết giờ
- Chấm điểm tự động, xem kết quả
- UI tiếng Anh đầy đủ 3 role
- OpenAPI + Swagger UI + coverage HTML + 84 API tests

**Không có (ngoài phạm vi v1):**

- Import Excel câu hỏi
- Chống gian lận (proctoring)
- Module lớp học (gán theo class)
- Câu hỏi hình ảnh / đa đáp án
- Xáo trộn câu / đáp án
- Playwright UI E2E (có API E2E smoke + manual checklist)

Chi tiết: `docs/OEX_DetailedDesign_V2.md`.

---

## Xử lý sự cố

| Vấn đề | Nguyên nhân / cách xử lý |
|--------|---------------------------|
| `ECONNREFUSED` database | `docker compose up -d` → đợi healthy → `npx prisma migrate deploy && npx prisma db seed` |
| Login báo lỗi server / 500 | DB chưa chạy hoặc chưa migrate/seed |
| `PrismaClient` / schema lỗi | `cd backend && npx prisma generate` |
| Test fail sau đổi schema | `npm run db:test:prepare` hoặc xóa `backend/tmp/pgdata-test` rồi `npm run test` |
| Port 5001 / 5002 / 5003 / 5005 bận | Đổi cấu hình port tương ứng hoặc tắt process chiếm port |
| Swagger không mở | Kiểm tra `SWAGGER_ENABLED` ≠ `false`, backend đang chạy |
| Swagger 401 trên endpoint | Chưa Authorize hoặc token hết hạn — login lại |
| Frontend không gọi được API | Backend phải chạy; dev dùng proxy Vite (`/api/v1`) |
| CORS lỗi (production) | `CORS_ORIGIN` phải khớp URL frontend |
| `docker compose down -v` mất data | Bình thường — chạy lại migrate + seed |
| PowerShell `&&` lỗi | Dùng `;` hoặc tách lệnh |

---

## Bảng lệnh thường dùng

| Mục đích | Lệnh |
|----------|------|
| Start DB | `docker compose up -d` |
| Dev API | `cd backend && npm run dev` |
| Dev UI | `cd frontend && npm run dev` |
| Migrate dev DB | `cd backend && npx prisma migrate deploy` |
| Seed dev DB | `cd backend && npx prisma db seed` |
| Reset dev DB | `docker compose down -v && docker compose up -d` → migrate + seed |
| Run all tests | `cd backend && npm run test` |
| E2E smoke | `cd backend && npm run test:e2e` |
| Prepare test DB | `cd backend && npm run db:test:prepare` |
| FE build | `cd frontend && npm run build` |
| BE build | `cd backend && npm run build` |
| Prisma GUI | `cd backend && npm run db:studio` |
| Swagger | http://localhost:5002/api/docs |
| Health | http://localhost:5002/health |

---

*OEX v1 — Online Examination System · PTIT / PMHDV*
