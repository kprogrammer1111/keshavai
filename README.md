# Keshavai — AI Chat Platform

Production-ready AI chat platform with multi-provider support, RAG, tool calling, and enterprise features.

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | React 19, Next.js, TypeScript, TailwindCSS, shadcn/ui, TanStack Query, Zustand |
| Backend | NestJS, Prisma, PostgreSQL, Redis, JWT |
| AI | OpenAI, Anthropic, Gemini, DeepSeek, Ollama |
| Storage | S3-compatible (MinIO) |
| Deploy | Docker, Nginx, PM2 |

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose

### 1. Start infrastructure

```bash
docker compose up -d postgres redis minio
```

### 2. Configure environment

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

### 3. Install dependencies

```bash
npm install
cd backend && npm install && npx prisma migrate dev
cd ../frontend && npm install
```

### 4. Run development servers

```bash
npm run dev
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api/v1
- Swagger: http://localhost:3001/api/docs

## Project Structure

```
keshavai/
├── backend/          # NestJS API
│   └── src/
│       ├── modules/  # Feature modules
│       ├── common/   # Shared utilities
│       └── config/   # Configuration
├── frontend/         # Next.js app
│   └── src/
│       ├── app/      # App Router pages
│       ├── components/
│       ├── features/
│       └── stores/
└── docker/           # Docker configs
```

## Features

- JWT auth with refresh tokens, RBAC, email verification
- Streaming chat with markdown, code highlighting, regenerate/edit
- Multi-provider AI abstraction (OpenAI, Anthropic, Gemini, DeepSeek, Ollama)
- RAG with PDF, DOCX, TXT, Markdown, CSV upload
- Tool calling (calculator, weather, search, webhooks, etc.)
- Short/long-term memory with context window management
- Dark/light mode, responsive ChatGPT-style UI

## License

MIT

## Deploy Online (Free)

See **[docs/DEPLOY-FREE.md](docs/DEPLOY-FREE.md)** for Vercel + Render + Neon + Upstash.

**Your own AI model online (no OpenAI, no local PC):** see **[docs/DEPLOY-OLLAMA-CLOUD.md](docs/DEPLOY-OLLAMA-CLOUD.md)** — Ollama on Oracle Cloud free VPS + Render.
