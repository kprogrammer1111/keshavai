# Self-Hosted AI (Your Own Model)

Run **your own LLM** with [Ollama](https://ollama.com) — no OpenAI, Anthropic, or other third-party API keys required.

## Architecture

```
Your PC (Ollama)  ←──  Render Backend  ←──  Vercel Frontend
  llama3.2              Keshavai API           Chat UI
```

The model runs on **your machine** (or a VPS you control). The cloud backend only forwards chat requests to your Ollama server.

---

## Step 1 — Install Ollama on your PC

1. Download from https://ollama.com/download (Windows)
2. Install and open a terminal:

```powershell
ollama pull llama3.2
ollama pull nomic-embed-text
```

3. Test locally:

```powershell
ollama run llama3.2
```

Ollama runs at `http://localhost:11434`.

---

## Step 2 — Expose Ollama to the internet (for Render)

Render cannot reach `localhost` on your PC. Use **Cloudflare Tunnel** (free):

1. Install cloudflared: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
2. Run:

```powershell
cloudflared tunnel --url http://localhost:11434
```

3. Copy the public URL, e.g. `https://abc-xyz.trycloudflare.com`

> Keep this terminal open while you use the app. For 24/7 use, set up a named Cloudflare tunnel.

---

## Step 3 — Configure Render backend

In **Render → Environment**, add/update:

| Key | Value |
|-----|-------|
| `OLLAMA_BASE_URL` | `https://abc-xyz.trycloudflare.com` (your tunnel URL, no trailing slash) |
| `AI_DEFAULT_PROVIDER` | `OLLAMA` |
| `AI_DEFAULT_MODEL` | `llama3.2` |

You can **remove** or leave empty:
- `OPENAI_API_KEY`
- `GEMINI_API_KEY`
- `ANTHROPIC_API_KEY`

Redeploy the backend.

---

## Step 4 — Use in the app

1. Open https://keshavai-beryl.vercel.app
2. Go to **Settings** → select **OLLAMA** → model **llama3.2**
3. Start chatting — responses come from **your** model on your PC

New chats default to Ollama automatically.

---

## Other models you can run

```powershell
ollama pull mistral      # Fast, good quality
ollama pull phi3         # Small, runs on weak PCs
ollama pull codellama    # Code-focused
ollama pull gemma2       # Google open model
```

Set `AI_DEFAULT_MODEL` in Render to match what you pulled.

---

## Fully local (no cloud AI at all)

Run everything on your PC — no Render needed for AI:

```powershell
# Terminal 1 — Ollama (already running after install)

# Terminal 2 — Backend
cd backend
# In .env set:
# OLLAMA_BASE_URL=http://localhost:11434
# AI_DEFAULT_PROVIDER=OLLAMA
npm run start:dev

# Terminal 3 — Frontend
cd frontend
npm run dev
```

Open http://localhost:3000 — 100% your own stack.

---

## Custom / fine-tuned models

1. Create a `Modelfile` for Ollama:

```
FROM llama3.2
SYSTEM You are Keshavai, a helpful assistant.
```

2. Build and run:

```powershell
ollama create keshavai-custom -f Modelfile
```

3. Set `AI_DEFAULT_MODEL=keshavai-custom` in Render or `.env`.

For **LoRA / GGUF** weights, import via Ollama’s model import docs: https://github.com/ollama/ollama/blob/main/docs/import.md

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| 500 error on chat | Ollama not running, or tunnel closed |
| Slow first reply | Render free tier cold start + model loading |
| Connection refused | Check `OLLAMA_BASE_URL` matches tunnel URL |
| Empty response | Run `ollama pull llama3.2` on your PC |

---

## Summary

| Goal | Solution |
|------|----------|
| Own model, no OpenAI | **Ollama** on your PC |
| Cloud frontend + your model | Ollama + **Cloudflare tunnel** + Render `OLLAMA_BASE_URL` |
| Everything local | Ollama + local backend + local frontend |

Your data and inference stay on hardware you control.
