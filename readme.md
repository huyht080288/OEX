# OEX — Online Examination System

Hệ thống thi trắc nghiệm trực tuyến: giáo viên tạo ngân hàng câu hỏi và đề thi, gán bài cho học sinh; học sinh làm bài online có timer; hệ thống chấm điểm tự động sau khi nộp bài.

Đồ án môn **Phát triển Phần mềm Hướng Dịch Vụ (PMHDV)** — Nhóm 11.

| | |
|---|---|
| **Backend** | Python 3.10+ · FastAPI · SQLAlchemy 2 (async) · asyncpg · Alembic · Pydantic v2 |
| **Frontend** | Vue 3 · Vite · TypeScript · Pinia |
| **Database** | PostgreSQL (chạy nhúng bằng `python -m app.dev_db`, **không cần Docker**) |
| **UI** | Tiếng Anh |
| **Frontend dev** | http://localhost:5001 |
| **API** | http://localhost:5002/api/v1 |
| **Swagger UI** | http://localhost:5002/api/docs |
| **PostgreSQL dev** | `localhost:5005` — DB `oex`, user/pass `oex`/`oex` (chỉ dùng cho dev) |
| **Kiểm thử** | 86 test backend (pytest) · 95 test frontend (Vitest) |

**Tài liệu** (trong repo, thư mục `config/`):
[Thiết kế chi tiết V2](config/OEX_DetailedDesign_V2.md) ·
[OpenAPI spec](config/api/openapi.yaml) ·
[Hướng dẫn sử dụng](UserManual.md) ·
[Checklist test thủ công](config/MANUAL_TEST_CHECKLIST.md) ·
[Báo cáo](config/Report.md) ·
[Chi tiết backend Python](backendpy/README.md)

---

## Mục lục

1. [Yêu cầu hệ thống](#1-yêu-cầu-hệ-thống)
2. [Cấu trúc thư mục](#2-cấu-trúc-thư-mục)
3. [Cài đặt lần đầu](#3-cài-đặt-lần-đầu)
4. [Chạy ứng dụng hằng ngày](#4-chạy-ứng-dụng-hằng-ngày)
5. [Tài khoản mẫu và luồng demo](#5-tài-khoản-mẫu-và-luồng-demo)
6. [Biến môi trường](#6-biến-môi-trường)
7. [Database](#7-database)
8. [Kiểm thử tự động](#8-kiểm-thử-tự-động)
9. [Swagger UI — thử API trên trình duyệt](#9-swagger-ui--thử-api-trên-trình-duyệt)
10. [API — tổng quan](#10-api--tổng-quan)
11. [Build và chạy production](#11-build-và-chạy-production)
12. [AI agent (Claude Code)](#12-ai-agent-claude-code)
13. [Phạm vi v1](#13-phạm-vi-v1)
14. [Xử lý sự cố](#14-xử-lý-sự-cố)
15. [Bảng lệnh thường dùng](#15-bảng-lệnh-thường-dùng)

---

## 1. Yêu cầu hệ thống

| Công cụ | Phiên bản | Kiểm tra | Dùng cho |
|---------|-----------|----------|----------|
| [Python](https://www.python.org/) | **3.10** trở lên | `python --version` | Backend |
| [Node.js](https://nodejs.org/) | **20 LTS** trở lên | `node -v` | Frontend |
| npm | đi kèm Node | `npm -v` | Frontend |
| Cổng trống | 5001, 5002, 5005 | | Frontend, API, database |

Không cần Docker và không cần cài PostgreSQL: package `pgserver` (trong `requirements-dev.txt`) chứa sẵn binary PostgreSQL 16.

> Ví dụ bên dưới dùng **PowerShell trên Windows** và đứng tại thư mục `src`.
> Với Git Bash / macOS / Linux: thay `.venv\Scripts\python` bằng `.venv/bin/python`, `Copy-Item a b` bằng `cp a b`, `\` bằng `/`.
> PowerShell 5.1 không hỗ trợ `&&`: dùng `;` hoặc chạy từng lệnh.

---

## 2. Cấu trúc thư mục

```
<workspace>/
├── CLAUDE.md                # hướng dẫn cho Claude Code
├── .claude/skills/          # skills cho Claude Code
├── src/                     # ← git repo này
│   ├── backendpy/           # Backend Python (FastAPI)
│   │   ├── app/
│   │   │   ├── main.py      # tạo app: CORS, xử lý lỗi, /health, Swagger
│   │   │   ├── routers/     # tầng HTTP (auth, users, subjects, questions, exams, attempts, students)
│   │   │   ├── services/    # nghiệp vụ + truy cập database
│   │   │   ├── models.py    # ORM SQLAlchemy
│   │   │   ├── schemas.py   # validate request (Pydantic)
│   │   │   ├── seed.py      # dữ liệu mẫu
│   │   │   └── dev_db.py    # PostgreSQL nhúng cho dev
│   │   ├── alembic/         # migration database
│   │   ├── tests/           # pytest (86 test)
│   │   ├── requirements.txt / requirements-dev.txt
│   │   └── .env.example
│   ├── frontend/            # Vue 3 SPA
│   │   ├── src/             # views, components, stores, api client, router
│   │   ├── tests/           # Vitest (95 test)
│   │   ├── vite.config.ts   # cổng 5001, proxy /api → http://localhost:5002
│   │   └── .env.example
│   ├── config/              # tài liệu trong repo; Swagger đọc OpenAPI ở đây
│   │   ├── api/openapi.yaml
│   │   ├── OEX_DetailedDesign_V2.md
│   │   ├── MANUAL_TEST_CHECKLIST.md
│   │   └── Report.md
│   ├── docker-compose.yml   # tùy chọn: PostgreSQL qua Docker (không bắt buộc)
│   ├── UserManual.md
│   └── readme.md
└── Ref/                     # tài liệu tham khảo (chỉ đọc)
```

> Backend đọc `config/api/openapi.yaml` khi khởi động để hiển thị Swagger. File này nằm trong repo. Thiếu file thì backend báo `OpenAPI spec not found`.

---

## 3. Cài đặt lần đầu

### 3.1. Backend Python

```powershell
cd backendpy
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements-dev.txt
Copy-Item .env.example .env
```

Mở `backendpy/.env` và đặt `JWT_SECRET` thành một chuỗi ngẫu nhiên dài từ 32 ký tự trở lên. Các giá trị khác giữ như mẫu.

### 3.2. Frontend

```powershell
cd frontend
npm install
Copy-Item .env.example .env
```

### 3.3. Khởi tạo database (làm một lần)

**Terminal 1** — chạy PostgreSQL nhúng và **giữ cửa sổ này mở**:

```powershell
cd backendpy
.venv\Scripts\python -m app.dev_db
```

Đợi đến dòng:

```
PostgreSQL ready: postgresql://oex:oex@localhost:5005/oex (Ctrl+C to stop)
```

Lần đầu chạy, lệnh này tạo thư mục dữ liệu `backendpy/.pgdata-dev` và 2 database `oex`, `oex_test`.

**Terminal 2** — tạo bảng và nạp dữ liệu mẫu:

```powershell
cd backendpy
.venv\Scripts\alembic upgrade head
.venv\Scripts\python -m app.seed
```

Kết quả mong đợi: bảng thống kê số bản ghi (`users: 22`, `exams: 10`, …) và dòng `The seed command has been executed.`

---

## 4. Chạy ứng dụng hằng ngày

Mở 3 terminal, chạy theo thứ tự **database → backend → frontend**:

| # | Thư mục | Lệnh | Chờ dòng |
|---|---------|------|----------|
| 1 | `src/backendpy` | `.venv\Scripts\python -m app.dev_db` | `PostgreSQL ready: ...` |
| 2 | `src/backendpy` | `.venv\Scripts\python -m app.main` | `Application startup complete.` |
| 3 | `src/frontend` | `npm run dev` | `Local: http://localhost:5001/` |

Mở trình duyệt:

| Giao diện | Địa chỉ |
|-----------|---------|
| Ứng dụng OEX | **http://localhost:5001** |
| Swagger UI | http://localhost:5002/api/docs |
| Health check | http://localhost:5002/health → `{"status":"ok"}` |
| Báo cáo coverage backend | http://localhost:5002/testcoverage.html (sau khi chạy test có coverage) |

Đăng nhập thử: `teacher@oex.test` / `Password123!`.

- Backend tự reload khi sửa code trong `backendpy/app/` (vì `APP_ENV="development"`).
- Frontend dùng Vite: tự cập nhật khi sửa code. Mọi request `/api/*` được proxy sang `http://localhost:5002`, nên backend phải chạy trước.
- Dừng: nhấn `Ctrl+C` ở từng terminal theo thứ tự frontend → backend → database.

---

## 5. Tài khoản mẫu và luồng demo

**Mật khẩu chung của tài khoản seed (chỉ dùng cho dev/test):** `Password123!`

| Email | Vai trò | Ghi chú |
|-------|---------|---------|
| `admin@oex.test` | Admin | Quản lý user |
| `teacher@oex.test` | Teacher | Demo chính: môn học, câu hỏi, đề thi |
| `teacher2@oex.test` … `teacher10@oex.test` | Teacher | |
| `student1@oex.test` … `student10@oex.test` | Student | `student2` dùng demo làm bài |
| `inactive@oex.test` | Student | Tài khoản bị khóa (để test) |

| Vai trò | Thử trên giao diện |
|---------|--------------------|
| **Teacher** | Subjects → Question Bank → Exams → Publish → Assign students → Results |
| **Student** | My Exams → Start → làm bài → Submit Exam → xem Result |
| **Admin** | Dashboard → User Management → tạo/sửa/khóa user |

Seed có ít nhất 10 bản ghi mỗi loại. ID cố định nằm trong `backendpy/app/seed_data.py` (test dùng chung). Chạy lại `python -m app.seed` bất kỳ lúc nào để đưa dữ liệu mẫu về trạng thái ban đầu. Dữ liệu bạn tự tạo thêm (user, môn, đề…) được giữ nguyên, trừ các lượt làm bài mới của `student1`/`student2` trên đề *CS101 Midterm*: lệnh seed sẽ xóa những lượt này.

---

## 6. Biến môi trường

### Backend — `backendpy/.env` (copy từ `backendpy/.env.example`)

| Biến | Bắt buộc | Giá trị dev | Mô tả |
|------|----------|-------------|-------|
| `DATABASE_URL` | | `postgresql://oex:oex@localhost:5005/oex?schema=public` | Kết nối PostgreSQL |
| `JWT_SECRET` | ✓ | chuỗi ngẫu nhiên ≥ 32 ký tự | Khóa ký JWT. Thiếu biến này thì backend không khởi động |
| `JWT_EXPIRES_IN` | | `1h` | Thời hạn token (`30m`, `1h`, `7d`, …) |
| `HOST` | | `127.0.0.1` | Đặt `0.0.0.0` nếu cần truy cập từ máy khác |
| `PORT` | | `5002` | Cổng API (proxy của frontend trỏ tới 5002) |
| `CORS_ORIGIN` | | `http://localhost:5001` | Origin của frontend |
| `APP_ENV` | | `development` | `development` (tự reload) / `test` / `production` |
| `SWAGGER_ENABLED` | | `true` | `false` để tắt `/api/docs` |

Biến đặt sẵn trong shell được ưu tiên hơn giá trị trong `.env`.

### Frontend — `frontend/.env` (copy từ `frontend/.env.example`)

```env
VITE_API_BASE_URL=/api/v1
```

### Backend test — `backendpy/.env.test` (tùy chọn)

Chỉ cần tạo file này khi muốn test chạy trên một database khác. Nếu không có, test dùng `localhost:5005/oex_test`. Nếu database đó không chạy, test tự bật PostgreSQL nhúng riêng ở cổng 5434.

> Các file `.env` đã nằm trong `.gitignore`. Không commit và không chia sẻ chúng.

---

## 7. Database

### 7.1. PostgreSQL nhúng (mặc định)

| Thông số | Giá trị |
|----------|---------|
| Lệnh | `.venv\Scripts\python -m app.dev_db` (trong `backendpy`) |
| Cổng | `5005` (đổi bằng `--port 5006` hoặc biến `DEV_DB_PORT`, nhớ sửa `DATABASE_URL` cho khớp) |
| User / Password | `oex` / `oex` |
| Database | `oex` (dev) và `oex_test` (test), tự tạo |
| Dữ liệu | `backendpy/.pgdata-dev/` (gitignored, giữ lại giữa các lần chạy) |
| Dừng | `Ctrl+C` trong terminal đang chạy |

### 7.2. Migration và seed

```powershell
cd backendpy
.venv\Scripts\alembic upgrade head     # tạo/cập nhật bảng
.venv\Scripts\alembic current          # xem phiên bản schema hiện tại
.venv\Scripts\python -m app.seed       # nạp lại dữ liệu mẫu (chạy lại được nhiều lần)
```

Khi đổi schema: sửa `app/models.py`, tạo migration bằng `.venv\Scripts\alembic revision -m "mo ta"` rồi tự viết `upgrade()` / `downgrade()`. Không dùng `--autogenerate`, vì `models.py` không khai báo đủ index nên Alembic sẽ đề xuất xóa index.

### 7.3. Reset sạch database dev

```powershell
# Dừng "python -m app.dev_db" (Ctrl+C) trước
cd backendpy
Remove-Item -Recurse -Force .pgdata-dev
.venv\Scripts\python -m app.dev_db          # terminal 1
.venv\Scripts\alembic upgrade head          # terminal 2
.venv\Scripts\python -m app.seed
```

### 7.4. Dùng PostgreSQL khác (tùy chọn)

- **PostgreSQL cài trên máy:** dùng tài khoản `postgres` tạo `CREATE ROLE oex LOGIN PASSWORD 'oex' CREATEDB;`, `CREATE DATABASE oex OWNER oex;`, `CREATE DATABASE oex_test OWNER oex;`. Sau đó sửa cổng trong `DATABASE_URL` thành `5432`.
- **Docker:** `docker compose up -d` tại `src/` tạo PostgreSQL ở cổng 5005 với cùng thông số. Không chạy đồng thời với `app.dev_db`, vì trùng cổng.

Sau đó chạy `alembic upgrade head` và `python -m app.seed` như trên.

---

## 8. Kiểm thử tự động

### Backend (pytest)

```powershell
cd backendpy
.venv\Scripts\python -m pytest
.venv\Scripts\python -m pytest --cov --cov-report=html
.venv\Scripts\python -m pytest tests\test_e2e_student_flow.py
```

- Lệnh 1 chạy toàn bộ 86 test.
- Lệnh 2 chạy thêm coverage và ghi báo cáo vào `backendpy/coverage/index.html` (khoảng 93%).
- Lệnh 3 chỉ chạy smoke test luồng học sinh: login → start → save → submit → result.

Test không cần `app.dev_db` đang chạy. Trước khi chạy, `tests/conftest.py` tự chuẩn bị database theo thứ tự:

1. Dùng `oex_test` ở cổng 5005, hoặc `DATABASE_URL` trong `backendpy/.env.test` nếu có file này.
2. Nếu không kết nối được, tự bật PostgreSQL nhúng ở cổng 5434 (dữ liệu trong `backendpy/.pgdata-test`) và tắt khi test xong.
3. Chạy `alembic upgrade head` và seed rồi mới bắt đầu test.

| File test | Số test | Phạm vi |
|-----------|---------|---------|
| `test_auth.py` | 10 | Login, me, đổi mật khẩu, user bị khóa |
| `test_users.py` | 11 | CRUD user, lọc theo role, khóa user |
| `test_subjects.py` | 9 | CRUD môn học, quyền sở hữu của giáo viên |
| `test_questions.py` | 10 | CRUD câu hỏi, đúng 1 đáp án đúng |
| `test_exams.py` | 21 | CRUD đề, khung giờ, câu hỏi, publish, gán học sinh, kết quả |
| `test_attempts.py` | 17 | Start, lưu đáp án, nộp bài, hết giờ, không lộ đáp án |
| `test_students.py` | 3 | Danh sách học sinh để gán đề |
| `test_e2e_student_flow.py` | 2 | Toàn bộ luồng học sinh (smoke) |
| `test_docs_and_coverage.py` | 3 | `/api/docs`, `/api/openapi.yaml`, `/testcoverage.html` |
| **Tổng** | **86** | |

### Frontend (Vitest)

```powershell
cd frontend
npm run test
npm run test:coverage
npm run build
```

- `npm run test` chạy 95 test trong 16 file.
- `npm run test:coverage` tạo báo cáo `frontend/coverage/index.html`. Ngưỡng tối thiểu là 75% cho cả 4 chỉ số; thấp hơn thì lệnh báo lỗi.
- `npm run build` kiểm tra kiểu với vue-tsc rồi build bản production.

Khi Vite dev server đang chạy, xem báo cáo frontend tại http://localhost:5001/testcoverage.html.

### Kiểm thử thủ công

Checklist: [`config/MANUAL_TEST_CHECKLIST.md`](config/MANUAL_TEST_CHECKLIST.md). Trước khi demo:

- [ ] `python -m app.dev_db` đang chạy
- [ ] `python -m app.main` đang chạy
- [ ] `npm run dev` đang chạy
- [ ] `python -m pytest` pass
- [ ] Mở http://localhost:5001 và đăng nhập được

---

## 9. Swagger UI — thử API trên trình duyệt

Swagger UI đọc spec từ [`config/api/openapi.yaml`](config/api/openapi.yaml). Trang này tải giao diện Swagger từ CDN jsDelivr, nên cần có Internet.

1. Chạy backend, mở **http://localhost:5002/api/docs**.
2. Mở **Auth → POST /auth/login → Try it out**, nhập body:
   ```json
   { "email": "teacher@oex.test", "password": "Password123!" }
   ```
3. Bấm **Execute**, rồi copy giá trị `data.accessToken` trong response.
4. Bấm **Authorize** 🔒, nhập `Bearer <accessToken>`, bấm **Authorize** rồi **Close**.
5. Gọi API theo vai trò:

| Vai trò | Email | Thử endpoint |
|---------|-------|--------------|
| Teacher | `teacher@oex.test` | GET `/subjects`, GET `/exams`, POST `/questions` |
| Student | `student2@oex.test` | GET `/my-exams`, POST `/attempts/start` |
| Admin | `admin@oex.test` | GET `/users`, POST `/users` |

Thử bằng PowerShell, không cần Swagger:

```powershell
$login = Invoke-RestMethod -Method Post -Uri http://localhost:5002/api/v1/auth/login -ContentType "application/json" -Body '{"email":"teacher@oex.test","password":"Password123!"}'
Invoke-RestMethod -Uri http://localhost:5002/api/v1/subjects -Headers @{ Authorization = "Bearer $($login.data.accessToken)" }
```

---

## 10. API — tổng quan

| | |
|---|---|
| Base URL | `http://localhost:5002/api/v1` |
| Xác thực | `Authorization: Bearer <JWT>` (trừ `POST /auth/login`) |
| Thành công | `{ "success": true, "data": …, "message": "…" }` |
| Lỗi | `{ "success": false, "error": { "code", "message", "details"? } }` |

| Prefix | Vai trò | Chức năng |
|--------|---------|-----------|
| `/auth` | Public / mọi user | login, me, change-password |
| `/users` | Admin | CRUD user, khóa/mở user |
| `/subjects` | Teacher | CRUD môn học |
| `/questions` | Teacher | CRUD câu hỏi trắc nghiệm |
| `/exams` | Teacher | CRUD đề, câu hỏi của đề, publish/close, gán học sinh, kết quả |
| `/students` | Teacher | Danh sách học sinh để gán đề |
| `/my-exams` | Student | Đề được gán |
| `/attempts` | Student | start, lưu đáp án, submit, xem kết quả |

| Code | HTTP | Ý nghĩa |
|------|------|---------|
| `VALIDATION_ERROR` | 400 / 409 | Dữ liệu không hợp lệ / đã nộp bài / đã gán học sinh |
| `INVALID_CREDENTIALS` | 401 | Sai email hoặc mật khẩu |
| `UNAUTHORIZED` | 401 | Thiếu token hoặc token hết hạn |
| `ACCOUNT_INACTIVE` | 403 | Tài khoản bị khóa |
| `FORBIDDEN` | 403 | Sai vai trò hoặc không sở hữu tài nguyên |
| `NOT_FOUND` | 404 | Không tìm thấy |
| `EXAM_NOT_AVAILABLE` | 400 | Đề chưa publish, ngoài khung giờ hoặc chưa có câu hỏi |
| `ATTEMPT_IN_PROGRESS` | 409 | Đang có lượt làm bài chưa nộp |
| `MAX_ATTEMPTS_REACHED` | 400 | Hết lượt làm bài |
| `ATTEMPT_EXPIRED` | 400 | Hết giờ làm bài |
| `SERVICE_UNAVAILABLE` | 503 | Không kết nối được database |

---

## 11. Build và chạy production

### Backend

```bash
cd backendpy
python -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/alembic upgrade head
APP_ENV=production HOST=0.0.0.0 .venv/bin/python -m app.main
```

- `requirements.txt` chỉ có thư viện runtime, không kèm pytest và pgserver.
- Khi `APP_ENV=production`, backend tắt tự reload và ẩn trang `/testcoverage.html`.

### Frontend

```bash
cd frontend
npm ci
npm run build
```

Lệnh build tạo thư mục `frontend/dist`. Phục vụ thư mục này qua Nginx/CDN và proxy `/api/v1` sang backend.

**Lưu ý production:**
- Dùng `JWT_SECRET` riêng và đủ mạnh.
- Đặt `CORS_ORIGIN` đúng domain của frontend.
- Dùng HTTPS.
- Dùng PostgreSQL thật, không dùng `app.dev_db`.
- **Không** chạy `python -m app.seed`, vì lệnh này tạo tài khoản demo với mật khẩu công khai.

---

## 12. AI agent (Claude Code)

Cấu hình nằm ở thư mục workspace (thư mục cha của `src/`). Mở Claude Code tại đó.

| Thành phần | Vị trí |
|------------|--------|
| Quy tắc chung của dự án | `CLAUDE.md` |
| Skills | `.claude/skills/` |

| Phạm vi | Skill |
|---------|-------|
| Chung cho backend và frontend | `oex-coding` |
| Backend Python | `oex-backendpy` |
| Frontend | `frontend-design` |
| Báo cáo Word | `docx` |
| Thiết kế UI, slide, brand | `ui-ux-pro-max`, `ckm-*` |

---

## 13. Phạm vi v1

**Có:**
- Đăng nhập JWT, phân quyền Admin / Teacher / Student.
- Câu hỏi trắc nghiệm có đúng một đáp án đúng.
- Ngân hàng câu hỏi, tạo đề, publish, gán học sinh trực tiếp.
- Làm bài có timer, tự lưu đáp án, tự nộp khi hết giờ.
- Chấm điểm tự động và xem kết quả.
- Giao diện tiếng Anh.
- OpenAPI và Swagger UI.

**Không có:**
- Import câu hỏi từ Excel.
- Chống gian lận.
- Module lớp học.
- Câu hỏi có hình ảnh hoặc nhiều đáp án đúng.
- Xáo trộn câu hỏi/đáp án.
- OAuth/SSO.

Chi tiết xem mục §15 của tài liệu thiết kế.

---

## 14. Xử lý sự cố

| Triệu chứng | Nguyên nhân và cách xử lý |
|-------------|---------------------------|
| `RuntimeError: JWT_SECRET is not configured` | Chưa có `backendpy/.env` hoặc chưa đặt `JWT_SECRET` |
| `RuntimeError: OpenAPI spec not found` | Thiếu `config/api/openapi.yaml`. Khôi phục file, hoặc đặt `SWAGGER_ENABLED="false"` |
| `pgserver is not installed` | Chạy `.venv\Scripts\python -m pip install -r requirements-dev.txt` |
| `No module named app` | Chạy lệnh từ thư mục `src/backendpy` |
| `app.dev_db` báo lỗi vì cổng 5005 đã dùng | Có PostgreSQL/Docker khác đang dùng cổng 5005. Tắt nó đi, hoặc dùng `--port 5006` và sửa `DATABASE_URL` |
| Đã đóng terminal nhưng cổng 5005 vẫn bận | Trong `backendpy`: `.venv\Scripts\python -c "from app.dev_db import stop_server; from pathlib import Path; stop_server(Path('.pgdata-dev'))"` |
| API trả `SERVICE_UNAVAILABLE` | Database chưa chạy, hoặc chưa chạy `alembic upgrade head` |
| Đăng nhập thì Vite báo `http proxy error ... ECONNREFUSED` | Backend chưa chạy ở cổng 5002. Kiểm tra `PORT` trong `backendpy/.env` |
| Frontend báo `Port 5001 is already in use` | Tắt process đang chiếm cổng 5001 (Vite dùng `strictPort`) |
| Swagger UI trắng trang | Không có Internet (giao diện Swagger tải từ CDN). API vẫn chạy bình thường |
| Token hết hạn, Swagger trả 401 | Đăng nhập lại để lấy token mới |
| Test lỗi sau khi đổi schema | Kiểm tra migration mới; có thể xóa `backendpy/.pgdata-test` rồi chạy lại `pytest` |

---

## 15. Bảng lệnh thường dùng

| Mục đích | Thư mục | Lệnh |
|----------|---------|------|
| Cài backend (lần đầu) | `backendpy` | `python -m venv .venv` rồi `.venv\Scripts\python -m pip install -r requirements-dev.txt` |
| Cài frontend (lần đầu) | `frontend` | `npm install` |
| Chạy database | `backendpy` | `.venv\Scripts\python -m app.dev_db` |
| Tạo/cập nhật bảng | `backendpy` | `.venv\Scripts\alembic upgrade head` |
| Nạp dữ liệu mẫu | `backendpy` | `.venv\Scripts\python -m app.seed` |
| Chạy API | `backendpy` | `.venv\Scripts\python -m app.main` |
| Chạy giao diện | `frontend` | `npm run dev` |
| Test backend | `backendpy` | `.venv\Scripts\python -m pytest` |
| Test backend + coverage | `backendpy` | `.venv\Scripts\python -m pytest --cov --cov-report=html` |
| Test frontend | `frontend` | `npm run test` |
| Build frontend | `frontend` | `npm run build` |
| Swagger | | http://localhost:5002/api/docs |
| Health | | http://localhost:5002/health |

---

*OEX v1 — Online Examination System · PMHDV · Nhóm 11*
