# OEX — Production Deployment

Guide for deploying the Online Examination System (v1) to a production environment.

**Stack:** Node.js API · PostgreSQL · Vue 3 static SPA  
**Design reference:** [`OEX_DetailedDesign_V1.md`](OEX_DetailedDesign_V1.md) §11 (security), §12 (NFR)

---

## Architecture overview

```
[Browser] → HTTPS → [Reverse proxy / CDN]
                        ├─ /          → static files (frontend/dist)
                        └─ /api/v1/*  → Node.js backend (:5002)
                                              ↓
                                         PostgreSQL
```

- The API is **stateless** — scale horizontally behind a load balancer if needed.
- Use **HTTPS** in production (TLS termination at proxy).
- Restrict **CORS** to the frontend origin only.

---

## Prerequisites

| Component | Requirement |
|-----------|-------------|
| Node.js | 20 LTS or newer |
| PostgreSQL | 15+ (managed service recommended) |
| Reverse proxy | Nginx, Caddy, or cloud load balancer |
| Process manager | systemd, PM2, or container orchestrator |

---

## 1. Database

1. Provision PostgreSQL (e.g. RDS, Cloud SQL, or self-hosted).
2. Create database and user with least privilege:

```sql
CREATE USER oex_app WITH PASSWORD 'strong-random-password';
CREATE DATABASE oex OWNER oex_app;
GRANT ALL PRIVILEGES ON DATABASE oex TO oex_app;
```

3. **Do not** run the development seed in production. Create real admin accounts via a one-time script or direct SQL after first deploy.

---

## 2. Backend

### Environment variables

Copy `backend/.env.example` and set production values:

| Variable | Production notes |
|----------|------------------|
| `DATABASE_URL` | PostgreSQL connection string with SSL if required |
| `JWT_SECRET` | Long random string (≥ 32 chars); never commit |
| `JWT_EXPIRES_IN` | e.g. `1h` (design default) |
| `PORT` | Internal port, e.g. `5002` |
| `CORS_ORIGIN` | Exact frontend URL, e.g. `https://oex.example.com` |
| `NODE_ENV` | `production` |

### Build and migrate

```bash
cd backend
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
```

### Start

```bash
NODE_ENV=production node dist/index.js
```

Or with PM2:

```bash
pm2 start dist/index.js --name oex-api
```

### Health check

Verify: `GET https://your-domain/api/v1/auth/me` returns `401` without token (API is reachable).

---

## 3. Frontend

### Build

```bash
cd frontend
npm ci
npm run build
```

Output: `frontend/dist/` (static assets).

### API base URL

For same-origin deployment (proxy serves `/api` to backend), no change needed — the client defaults to `/api/v1`.

For split domains, set at build time:

```bash
VITE_API_BASE_URL=https://api.oex.example.com/api/v1 npm run build
```

### Serve static files

**Option A — Nginx (same host):**

```nginx
server {
    listen 443 ssl;
    server_name oex.example.com;

    root /var/www/oex/frontend/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:5002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

**Option B — Preview locally after build:**

```bash
cd frontend && npm run preview
```

---

## 4. Docker Compose (development only)

Root `docker-compose.yml` runs PostgreSQL for **local development**. For production, use a managed database; optionally containerize the API with a separate `Dockerfile` (not included in v1).

---

## 5. Security checklist

- [ ] `JWT_SECRET` is unique and stored in secrets manager / env, not in git
- [ ] HTTPS enabled end-to-end
- [ ] `CORS_ORIGIN` matches frontend URL exactly
- [ ] PostgreSQL not exposed publicly
- [ ] Database backups configured
- [ ] Dev seed accounts removed or passwords rotated in production
- [ ] `NODE_ENV=production`

---

## 6. Post-deploy verification

1. **Login** — admin / teacher / student accounts work.
2. **Teacher flow** — create subject → question → exam → publish → assign student.
3. **Student flow** — My Exams → Start → Submit → View Result.
4. **Regression** — run `npm run test` in CI against `oex_test` database before each release.

API contract: [`api/openapi.yaml`](api/openapi.yaml)

---

## 7. CI recommendation

```yaml
# Example steps
- run: docker compose up -d postgres
- run: cd backend && npm ci && npm run db:test:prepare && npm run test
- run: cd frontend && npm ci && npm run build
```

E2E smoke test: `cd backend && npm run test:e2e`

---

## Troubleshooting

| Issue | Action |
|-------|--------|
| 503 on login | Check `DATABASE_URL` and Postgres connectivity |
| CORS errors | Align `CORS_ORIGIN` with browser URL |
| 404 on refresh (SPA) | Configure `try_files … /index.html` on proxy |
| Prisma migrate fails | Run `npx prisma migrate deploy` with correct `DATABASE_URL` |
