# OEX — Online Examination System

Hệ thống thi trắc nghiệm trực tuyến: giáo viên tạo ngân hàng câu hỏi và đề thi, học sinh làm bài online, hệ thống chấm điểm tự động.

**Stack:** Vue 3 · Node.js · Express · PostgreSQL · Prisma · TypeScript  
**Giao diện:** English  
**Thiết kế chi tiết:** [`docs/OEX_DetailedDesign_V2.md`](docs/OEX_DetailedDesign_V2.md) (V1 archived)  
**API (OpenAPI):** [`docs/api/openapi.yaml`](docs/api/openapi.yaml)  
**Triển khai production:** [`docs/DEPLOY.md`](docs/DEPLOY.md)

---

## Yêu cầu hệ thống (cần cài trước)

| Công cụ | Phiên bản gợi ý | Dùng để |
|---------|-----------------|---------|
| [Node.js](https://nodejs.org/) | 20 LTS trở lên | Backend + Frontend |
| npm | đi kèm Node | Quản lý package |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | mới nhất | Chạy PostgreSQL local |
| [Git](https://git-scm.com/) | mới nhất | Clone / version control |
| Cursor (hoặc VS Code) | tùy chọn | IDE + AI agent |

**Tùy chọn:** `psql` hoặc [DBeaver](https://dbeaver.io/) — xem database trực tiếp

---

## Cấu trúc repository

```
OEX/
├── PrjMng/          # Tiến độ dự án — đọc STATUS.md trước khi code
├── docs/            # Thiết kế, OpenAPI, hướng dẫn deploy
├── backend/         # REST API (Express + Prisma)
├── frontend/        # SPA (Vue 3 + Vite)
├── .cursor/         # Rules & skills cho Cursor agent
├── docker-compose.yml
└── README.md
```

---

## Chuẩn bị môi trường (setup)

### 1. Clone và mở project

```bash
git clone <repo-url>
cd PMHDV
```

### 2. Khởi động PostgreSQL (Docker)

```bash
docker compose up -d
```

| Biến | Giá trị dev |
|------|-------------|
| Host | `localhost` |
| Port | `5432` |
| Database | `oex` |
| User / Password | `oex` / `oex` |

### 3. Cấu hình biến môi trường

```bash
cp backend/.env.example backend/.env
cp backend/.env.test.example backend/.env.test
```

Chỉnh `backend/.env`:

```env
DATABASE_URL="postgresql://oex:oex@localhost:5432/oex?schema=public"
JWT_SECRET="dev-secret-change-in-production"
JWT_EXPIRES_IN="1h"
PORT=3000
CORS_ORIGIN="http://localhost:5173"
```

Chỉnh `backend/.env.test` — database **riêng** cho test:

```env
DATABASE_URL="postgresql://oex:oex@localhost:5432/oex_test?schema=public"
JWT_SECRET="test-secret"
```

Tạo DB test (một lần, nếu dùng Docker Postgres):

```sql
CREATE DATABASE oex_test;
```

### 4. Cài dependency & migrate

```bash
cd backend
npm install
npx prisma migrate deploy
npx prisma db seed
cd ../frontend
npm install
```

### 5. Chạy ứng dụng (dev)

Terminal 1 — API:

```bash
cd backend
npm run dev
# → http://localhost:3000/api/v1
# → Swagger UI: http://localhost:3000/api/docs
```

**Test API với Swagger UI** (`http://localhost:3000/api/docs`):

1. Mở **POST /auth/login** → **Try it out** → body: `{"email":"teacher@oex.test","password":"Password123!"}` → **Execute**
2. Copy `accessToken` từ response
3. Bấm **Authorize** (🔒) → nhập `Bearer <accessToken>` → **Authorize**
4. Gọi thử các endpoint khác (GET /subjects, POST /exams, …)

Spec thô: `http://localhost:3000/api/openapi.yaml` (đồng bộ với `docs/api/openapi.yaml`)

Terminal 2 — Frontend:

```bash
cd frontend
npm run dev
# → http://localhost:5173
```

### 6. Kiểm tra chất lượng

```bash
cd backend
npm run db:test:prepare   # migrate + seed test DB
npm run test              # 83 tests — exit 0
npm run test:e2e          # smoke: login → thi → nộp → xem điểm
```

```bash
cd frontend
npm run build
```

---

## Luồng demo nhanh

| Role | Đăng nhập | Thử |
|------|-----------|-----|
| Teacher | `teacher@oex.test` | Subjects → Questions → Exams → Publish → Assign |
| Student | `student2@oex.test` | My Exams → Start → Submit → View Result |
| Admin | `admin@oex.test` | Dashboard (user management UI — v2) |

Mật khẩu tất cả tài khoản seed: `Password123!`

---

## Tài khoản mẫu (sau khi seed)

| Email | Password | Role |
|-------|----------|------|
| `admin@oex.test` | `Password123!` | Admin |
| `teacher@oex.test` | `Password123!` | Teacher |
| `teacher2@oex.test` | `Password123!` | Teacher |
| `student1@oex.test` | `Password123!` | Student |
| `student2@oex.test` | `Password123!` | Student |
| `student3@oex.test` … `student10@oex.test` | `Password123!` | Student |
| `teacher3@oex.test` … `teacher10@oex.test` | `Password123!` | Teacher |
| `inactive@oex.test` | `Password123!` | Student (inactive) |

Seed gồm **≥10 bản ghi mỗi loại**: 10 giáo viên, 11 học sinh, 10 môn học, 10 câu hỏi (40 phương án), 10 đề thi, 10 gán đề, 10 lượt làm bài, v.v. Tài khoản chính cho demo: `teacher@oex.test`, `student1@oex.test`, `student2@oex.test`.

---

## Tài liệu & theo dõi tiến độ

| File | Mục đích |
|------|----------|
| [`PrjMng/STATUS.md`](PrjMng/STATUS.md) | Phase hiện tại, việc tiếp theo |
| [`PrjMng/TASKS.md`](PrjMng/TASKS.md) | Backlog theo phase |
| [`PrjMng/DECISIONS.md`](PrjMng/DECISIONS.md) | Quyết định đã khóa |
| [`PrjMng/CHANGELOG.md`](PrjMng/CHANGELOG.md) | Nhật ký triển khai |
| [`docs/api/openapi.yaml`](docs/api/openapi.yaml) | REST API contract |
| [`docs/DEPLOY.md`](docs/DEPLOY.md) | Hướng dẫn deploy production |

---

## Cursor agent (skills)

| Phạm vi | Skill / rule |
|---------|----------------|
| Luôn bật | `.cursor/rules/oex-project-layout.mdc` |
| Chung FE + BE | `.cursor/skills/oex-coding/` |
| Chỉ backend | `.cursor/skills/oex-backend/` |
| Chỉ frontend | `.cursor/skills/frontend-design/` |

---

## Phạm vi v1 (tóm tắt)

**Có:** MCQ một đáp án đúng, gán đề trực tiếp, chấm tự động, JWT auth, UI tiếng Anh (teacher + student flows).

**Không (v1):** Import Excel, chống gian lận, module lớp học, ảnh câu hỏi, xáo trộn câu.

Chi tiết: `docs/OEX_DetailedDesign_V1.md` §15.

---

## Xử lý sự cố thường gặp

| Vấn đề | Gợi ý |
|--------|-------|
| `ECONNREFUSED` database | `docker compose up -d`, rồi `cd backend && npx prisma migrate deploy && npx prisma db seed` |
| Login báo lỗi server | DB chưa chạy — xem dòng trên |
| Test fail sau migrate | `npm run db:test:prepare` rồi `npm run test` |
| Port 3000 / 5173 bận | Đổi `PORT` trong `.env` hoặc tắt process đang chiếm port |
| Prisma client lỗi | `cd backend && npx prisma generate` |
