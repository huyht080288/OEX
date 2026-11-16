# OEX — Backend Python (FastAPI)

Bản viết lại backend OEX bằng Python, **thay thế được** `src/backend` (Node/Express):

- Cùng REST API `/api/v1`, cùng định dạng response `{ success, data, message }` / `{ success: false, error }`, cùng mã lỗi.
- Cùng cổng **5002**, nên frontend Vue (`src/frontend`) chạy được ngay, không phải sửa.
- Cùng schema PostgreSQL và cùng seed data (UUID cố định), nên hai backend dùng chung được một database.
- Token JWT tương thích (HS256, cùng payload `sub`/`email`/`role`).
- 86 test pytest, chuyển 1:1 từ 86 test Vitest của backend Node. Coverage ~93%.

| | |
|---|---|
| **Stack** | Python 3.10+ · FastAPI · SQLAlchemy 2 (async) · asyncpg · Alembic · Pydantic v2 · PyJWT · bcrypt |
| **API** | http://localhost:5002/api/v1 |
| **Swagger UI** | http://localhost:5002/api/docs (đọc `config/api/openapi.yaml`) |
| **DB dev** | `localhost:5005`, DB `oex`, user/pass `oex`/`oex` (dev-only) |

Hướng dẫn chạy chi tiết từng bước: [`../../docs/RUN_LOCAL.md`](../../docs/RUN_LOCAL.md), mục *Backend Python*.

---

## Cấu trúc

```
backendpy/
├── app/
│   ├── main.py            # create_app(): CORS, error handlers, /health, Swagger, /testcoverage.html
│   ├── config.py          # đọc biến môi trường (.env)
│   ├── db.py              # async engine + session (asyncpg)
│   ├── models.py          # ORM, ánh xạ đúng các bảng hiện có
│   ├── schemas.py         # validate request (tương đương zod)
│   ├── dto.py             # model → JSON (camelCase, ISO date)
│   ├── errors.py          # AppError, envelope, 400/401/403/404/409/500/503
│   ├── security.py        # bcrypt, JWT
│   ├── deps.py            # auth: Bearer JWT, require_role
│   ├── routers/           # HTTP layer (auth, users, subjects, questions, exams, attempts, students)
│   ├── services/          # business logic + truy cập DB
│   ├── seed.py            # python -m app.seed
│   ├── seed_data.py       # ID cố định, dùng chung với test
│   └── dev_db.py          # python -m app.dev_db (PostgreSQL nhúng, không cần Docker)
├── alembic/               # migration (0001_init = schema của Prisma)
├── tests/                 # pytest (86 test)
├── requirements.txt       # thư viện runtime
├── requirements-dev.txt   # + pytest, pytest-cov, httpx, pgserver
├── pyproject.toml         # cấu hình pytest/coverage
└── .env.example
```

## Chạy nhanh (PowerShell, đứng tại `src/backendpy`)

```powershell
# Lần đầu
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements-dev.txt
Copy-Item .env.example .env        # sau đó đặt JWT_SECRET (32+ ký tự ngẫu nhiên)

# Terminal 1: database (giữ mở)
.venv\Scripts\python -m app.dev_db

# Terminal 2: migrate + seed (lần đầu), rồi chạy API
.venv\Scripts\alembic upgrade head
.venv\Scripts\python -m app.seed
.venv\Scripts\python -m app.main
```

Bash/macOS/Linux: dùng `.venv/bin/python` thay cho `.venv\Scripts\python`.

## Lệnh thường dùng

| Mục đích | Lệnh |
|----------|------|
| DB dev nhúng (cổng 5005) | `python -m app.dev_db` (`--port 5006` để đổi cổng) |
| Tạo bảng | `alembic upgrade head` |
| Nạp dữ liệu mẫu | `python -m app.seed` |
| Chạy API (tự reload khi `APP_ENV=development`) | `python -m app.main` |
| Chạy test | `python -m pytest` |
| Test + coverage HTML (`coverage/`, xem tại `/testcoverage.html`) | `python -m pytest --cov --cov-report=html` |
| Tạo migration mới sau khi sửa `models.py` | `alembic revision -m "mo ta"` rồi viết `upgrade()` bằng tay (không dùng `--autogenerate`: `models.py` chưa khai báo index nên Alembic sẽ đề xuất xóa index) |

## Test và database

`tests/conftest.py` chọn database như sau, không cần Docker:

1. `DATABASE_URL` trong `backendpy/.env.test` nếu có file này, mặc định là `localhost:5005/oex_test` (DB này do `app.dev_db` tạo sẵn).
2. Không kết nối được thì tự bật PostgreSQL nhúng ở cổng **5434** (dữ liệu trong `.pgdata-test/`) và tắt khi test xong.
3. Sau đó chạy `alembic upgrade head` và seed rồi mới chạy test.

## Khác biệt nhỏ so với backend Node

| Trường hợp | Node | Python |
|---|---|---|
| Xóa câu hỏi đang được dùng trong đề | 500 `INTERNAL_ERROR` (lỗi khóa ngoại) | 400 `VALIDATION_ERROR` kèm thông báo rõ ràng |
| Gán nhiều học sinh mà có 1 em đã được gán | 409, những em gán trước đó vẫn được lưu | 409, không lưu em nào (cả lô là một transaction) |
| Token hợp lệ nhưng DB đang tắt | 401 | 503 `SERVICE_UNAVAILABLE` |
| Đường dẫn không tồn tại | Trang HTML 404 của Express | JSON `{ success: false, error: { code: "NOT_FOUND" } }` |
| Swagger UI | file tĩnh đi kèm package | tải swagger-ui từ CDN jsDelivr (cần Internet) |

## Thư viện và license

Thư viện runtime: FastAPI (MIT), Starlette (BSD-3), Uvicorn (BSD-3), SQLAlchemy (MIT), asyncpg (Apache-2.0), Alembic (MIT), Pydantic (MIT), PyJWT (MIT), bcrypt (Apache-2.0), python-dotenv (BSD-3).

Thư viện dev/test: pytest (MIT), pytest-cov (MIT), httpx (BSD-3; kéo theo certifi MPL-2.0), pgserver (Apache-2.0; đóng gói binary PostgreSQL theo PostgreSQL License).

Driver asyncpg được chọn thay vì psycopg (LGPL-3.0) để toàn bộ thư viện runtime đều thuộc nhóm license MIT/BSD/Apache.
