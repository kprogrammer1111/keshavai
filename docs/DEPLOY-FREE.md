# Free Cloud Deployment Guide

Deploy Keshavai **100% free** using these services:

| Service | Provider | Free Tier |
|---------|----------|-----------|
| Frontend | [Vercel](https://vercel.com) | Unlimited hobby projects |
| Backend API | [Render](https://render.com) | 750 hrs/month (sleeps after 15 min idle) |
| PostgreSQL | [Neon](https://neon.tech) | 0.5 GB storage, pgvector supported |
| Redis | [Upstash](https://upstash.com) | 10,000 commands/day |
| File Storage | [Cloudflare R2](https://developers.cloudflare.com/r2/) | 10 GB/month |

> **Note:** AI chat still needs an API key (OpenAI, Gemini free tier, or Ollama on another host). [Google Gemini](https://aistudio.google.com/apikey) offers a free API key.

---

## Step 1 — Push code to GitHub

```bash
cd d:\technolitics\keshavai
git init
git add .
git commit -m "Initial commit"
```

Create a repo on https://github.com/new then:

```bash
git remote add origin https://github.com/YOUR_USERNAME/keshavai.git
git push -u origin main
```

---

## Step 2 — Neon (PostgreSQL database)

1. Sign up at https://neon.tech (free, no credit card)
2. Create a project → name it `keshavai`
3. Copy the **connection string** (looks like `postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require`)
4. Open **SQL Editor** in Neon and run:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

5. Save the connection string — you'll use it as `DATABASE_URL`

---

## Step 3 — Upstash (Redis)

1. Sign up at https://upstash.com
2. Create a Redis database → region closest to you
3. Copy the **Redis URL** (`rediss://default:xxx@xxx.upstash.io:6379`)

---

## Step 4 — Cloudflare R2 (optional — file uploads)

1. Sign up at https://dash.cloudflare.com
2. Go to **R2** → Create bucket named `keshavai`
3. **Manage R2 API Tokens** → Create token with read/write
4. Note: Account ID, Access Key, Secret Key

Set these env vars on the backend:
```
S3_ENDPOINT=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
S3_ACCESS_KEY=your_access_key
S3_SECRET_KEY=your_secret_key
S3_BUCKET=keshavai
S3_REGION=auto
```

Skip this step if you only need chat without document uploads.

---

## Step 5 — Deploy backend on Render

1. Sign up at https://render.com (free, GitHub login)
2. **New → Blueprint** → connect your GitHub repo
3. Render reads `render.yaml` automatically
4. Or manually: **New → Web Service** → connect repo
   - **Root directory:** `backend`
   - **Build command:** `npm install && npx prisma generate && npx prisma migrate deploy && npm run build`
   - **Start command:** `npm run start:prod`
   - **Plan:** Free

5. Add environment variables in Render dashboard **before deploying**:

> **Important:** Add `DATABASE_URL` (Neon connection string) in **Environment** tab first. Without it, the app will fail at startup when running migrations.

| Key | Value |
|-----|-------|
| `DATABASE_URL` | Neon connection string (`postgresql://...?sslmode=require`) |
| `REDIS_URL` | Upstash Redis URL |
| `JWT_SECRET` | Random string (use https://generate-secret.vercel.app/32) |
| `JWT_REFRESH_SECRET` | Another random string |
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | `https://YOUR-APP.vercel.app` (update after Step 6) |
| `CORS_ORIGINS` | `https://YOUR-APP.vercel.app` |
| `OPENAI_API_KEY` | Your OpenAI key (or Gemini key below) |
| `GEMINI_API_KEY` | Free key from https://aistudio.google.com/apikey |
| `S3_ENDPOINT` | R2 endpoint (if using R2) |
| `S3_ACCESS_KEY` | R2 access key |
| `S3_SECRET_KEY` | R2 secret key |
| `S3_BUCKET` | `keshavai` |

6. Deploy → copy your backend URL, e.g. `https://keshavai-api.onrender.com`

> First request after idle may take ~30 seconds (free tier cold start).

---

## Step 6 — Deploy frontend on Vercel

1. Sign up at https://vercel.com (free, GitHub login)
2. **Add New Project** → import your GitHub repo
3. Set **Root Directory** to `frontend`
4. Add environment variable:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_API_URL` | `https://keshavai-api.onrender.com/api/v1` |

5. Deploy → copy your URL, e.g. `https://keshavai.vercel.app`

6. Go back to **Render** → update `FRONTEND_URL` and `CORS_ORIGINS` with your Vercel URL → redeploy backend

---

## Step 7 — Run database migration

If Render build didn't run migrations, run locally once:

```bash
cd backend
set DATABASE_URL=your_neon_connection_string
npx prisma migrate deploy
```

Or use Neon's SQL editor after first deploy if needed.

---

## Step 8 — Test your live apps

1. Open `https://YOUR-APP.vercel.app`
2. Register a new account
3. Start chatting

API docs: `https://keshavai-api.onrender.com/api/docs`

---

## Free AI options (no OpenAI payment)

| Provider | How |
|----------|-----|
| **Google Gemini** | Free API key at https://aistudio.google.com/apikey — set `GEMINI_API_KEY` |
| **DeepSeek** | Free credits at https://platform.deepseek.com |
| **Ollama** | Run locally, expose via ngrok (dev only) |

In Settings, select **GEMINI** provider and model `gemini-2.5-flash`.

---

## Cost summary

| Service | Monthly cost |
|---------|-------------|
| Vercel | $0 |
| Render | $0 |
| Neon | $0 |
| Upstash | $0 |
| Cloudflare R2 | $0 |
| Gemini API | $0 (free tier limits apply) |
| **Total** | **$0** |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Build fails: `Missing required environment variable: DATABASE_URL` | Pull latest code (Dockerfile fix), or set `DATABASE_URL` in Render Environment |
| Migration fails: `string contains embedded null` | Reset Neon DB (see below), push latest migration fix, redeploy |
| `P3009` failed migrations | Reset Neon database in SQL Editor (see below) |
| Registration fails | Check Render logs; verify `DATABASE_URL` in Render env |
| CORS error | Set `FRONTEND_URL` + `CORS_ORIGINS` to exact Vercel URL |
| Slow first load | Render free tier sleeps — wait 30s on first request |
| Chat no response | Add `OPENAI_API_KEY` or `GEMINI_API_KEY` in Render env |
| DB connection error | Ensure Neon URL includes `?sslmode=require` |

### Reset Neon database (after failed migration)

In **Neon → SQL Editor**, run:

```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
CREATE EXTENSION IF NOT EXISTS vector;
GRANT ALL ON SCHEMA public TO neondb_owner;
GRANT ALL ON SCHEMA public TO public;
```

Then redeploy on Render.

---

## Optional: custom domain

- **Vercel:** Project Settings → Domains → add your domain (free)
- **Render:** Settings → Custom Domain (free)
