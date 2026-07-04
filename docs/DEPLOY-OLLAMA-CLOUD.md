# Deploy Your Own AI Model Online (No Local PC)

Your stack stays **100% online**:

```
Vercel (frontend)  →  Render (backend API)  →  VPS (Ollama — YOUR model)
```

Render **cannot** run LLMs (no GPU, too little RAM). You run the model on a **cheap cloud VPS** and connect Render to it with `OLLAMA_BASE_URL`.

No OpenAI. No local PC. No tunnel from your laptop.

---

## Option A — Oracle Cloud Free (best free online option)

Oracle gives a **free ARM server** with up to **24 GB RAM** — enough for small models like `llama3.2` or `phi3`.

### 1. Create a free VPS

1. Sign up: https://www.oracle.com/cloud/free/
2. Create a **Compute Instance** (Ampere ARM, Ubuntu 22.04)
3. Shape: **VM.Standard.A1.Flex** — 4 OCPU, 24 GB RAM (free tier)
4. Open port **11434** in the **Security List / Firewall** (Ingress rule: TCP 11434 from `0.0.0.0/0` or only Render IPs)
5. Note the **public IP**, e.g. `123.45.67.89`

### 2. Install Ollama on the VPS

SSH into the server:

```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3.2
ollama pull nomic-embed-text
```

Make Ollama listen on all interfaces:

```bash
sudo systemctl edit ollama
```

Add:

```ini
[Service]
Environment="OLLAMA_HOST=0.0.0.0:11434"
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl restart ollama
```

Test from your PC:

```bash
curl http://YOUR_VPS_IP:11434/api/tags
```

### 3. Connect Render backend

In **Render → Environment**:

| Key | Value |
|-----|-------|
| `OLLAMA_BASE_URL` | `http://YOUR_VPS_IP:11434` |
| `AI_DEFAULT_PROVIDER` | `OLLAMA` |
| `AI_DEFAULT_MODEL` | `llama3.2` |

Remove or leave empty: `OPENAI_API_KEY`, `GEMINI_API_KEY`

**Redeploy** Render.

### 4. Use the app

Open your Vercel site → **Settings** → **OLLAMA** → **llama3.2** → chat.

---

## Option B — Hetzner VPS (~€4/month)

If Oracle is unavailable in your region:

1. https://www.hetzner.com/cloud — **CX22** (4 GB RAM) or **CX32** (8 GB) for better speed
2. Same Ollama install steps as above
3. Same `OLLAMA_BASE_URL` on Render

| RAM | Models that work |
|-----|------------------|
| 4 GB | `phi3`, `llama3.2:1b` |
| 8 GB | `llama3.2`, `mistral` |
| 16 GB+ | `llama3.1:8b`, larger models |

---

## Option C — Everything on one VPS (no Render for AI path)

Run **backend + Ollama** on the same VPS; keep **Vercel** only for frontend:

```bash
# On VPS: install Docker, clone repo, docker compose up
# OLLAMA_BASE_URL=http://ollama:11434  (internal Docker network)
```

This avoids exposing Ollama to the public internet.

---

## Security (important)

Ollama on a public IP with no auth is **open to anyone**. For production:

1. **Firewall**: allow port 11434 only from Render’s outbound IPs (check Render docs), or
2. Put **Nginx** in front with basic auth, or
3. Use **private network** (Option C — same VPS / VPC)

---

## Custom “your own” model online

After Ollama is running on the VPS:

```bash
# SSH to VPS
cat > Modelfile << 'EOF'
FROM llama3.2
SYSTEM You are Keshavai, a helpful AI assistant built for this platform.
PARAMETER temperature 0.7
EOF

ollama create keshavai-v1 -f Modelfile
```

On Render set:

```
AI_DEFAULT_MODEL=keshavai-v1
```

To use **fine-tuned weights** (GGUF/Safetensors), see: https://github.com/ollama/ollama/blob/main/docs/import.md

---

## Cost summary (online only)

| Service | Cost | Role |
|---------|------|------|
| Vercel | Free | Frontend |
| Render | Free | Backend API |
| Neon | Free | Database |
| Upstash | Free | Redis |
| **Oracle VPS** | **Free** | **Your LLM (Ollama)** |
| Hetzner (alt) | ~€4/mo | Your LLM if no Oracle |

**Total with Oracle: $0/month** — fully online, your own model.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Chat 500 / connection error | VPS firewall: open TCP 11434 |
| Render can’t reach Ollama | `OLLAMA_HOST=0.0.0.0`, correct public IP in `OLLAMA_BASE_URL` |
| Very slow replies | Use smaller model (`phi3`) or bigger VPS RAM |
| Still uses OpenAI | Set `AI_DEFAULT_PROVIDER=OLLAMA`, redeploy, pick OLLAMA in Settings |

---

## What NOT to use for “own model online”

| ❌ | Why |
|----|-----|
| Render free tier for Ollama | Not enough RAM/CPU |
| Your laptop + tunnel | You said no local system |
| OpenAI / Gemini keys | Third-party, not your model |

**Correct approach:** Ollama on **Oracle/Hetzner VPS** + Render points to it.
