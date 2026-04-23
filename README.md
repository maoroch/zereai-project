# Zere AI

> AI-powered university assistant — semantic search + streaming chat, built on Express.js + FastAPI + Next.js

---

## Table of Contents

- [Monorepo Services](#-monorepo-services)
- [Architecture](#-architecture)
- [WebSocket Protocol](#-websocket-protocol)
- [REST API](#-rest-api)
- [Environment Variables](#-environment-variables)
- [Quickstart](#-quickstart)
- [Local Setup](#-local-setup)
- [Troubleshooting](#-troubleshooting)

---

## 📦 Monorepo Services

```
zereAI/
├── zere-express/        Express.js backend — API, WebSocket, CRM
├── zere-search-api/     FastAPI — vector search over the knowledge base
└── front-end/           Next.js — user chat interface
```

| Service | Technology | Port | Purpose |
|---|---|---|---|
| `zere-express` | Node.js 18 / Express 5 | 8080 | REST API, WebSocket, CRM CRUD, Auth |
| `zere-search-api` | Python 3.11 / FastAPI | 7860 | Semantic search, vector model |
| `front-end` | Next.js 16 / React 19 | 3000 | User chat interface |

---

## 🏗 Architecture

### Express Backend Structure

<img src="documentation/architecture/zere_ai_chatbot_architecture.svg">

```
zere-express/
├── server.js               Entry point — HTTP + WebSocket on a single port
├── app.js                  Express app, CORS, middleware, routes
│
├── config/
│   ├── env.js              All environment variables in one place
│   ├── db.js               Supabase client
│   └── constants.js        Constants: Excel columns, limits, cache TTL
│
├── routes/                 Endpoint declarations only
├── controllers/            req/res handling, service calls
│
├── services/
│   ├── ws.service.js       WebSocket server, sessions, streaming
│   ├── groq.service.js     Groq LLM API
│   ├── search.service.js   FastAPI vector search client
│   ├── crm.service.js      Supabase CRUD (groups, students)
│   └── excel.service.js    Excel upload and export
│
├── middlewares/            auth, logger, validation, error handler
├── validators/             express-validator schemas
└── utils/                  logger, apiResponse, asyncHandler, helpers
```

### Chatbot Request Flow (WebSocket + Streaming)

```
Browser (Next.js)
    │
    │  WS connect  →  ws://host:8080/ws
    │
    │  { type: "question", question: "...", sessionId: "..." }
    │                        │
    │                   ws.service.js
    │                        │
    │  { type: "searching" } │──▶  FastAPI /search
    │                        │     (paraphrase-multilingual-MiniLM-L12-v2)
    │  { type: "search_done"}│◀──  [{ title, body, similarity }]
    │                        │
    │  { type: "generating" }│──▶  Groq API  (stream: true)
    │  { type: "token", "Hi" }     ◀── SSE chunk
    │  { type: "token", "!" }      ◀── SSE chunk
    │       ...                         ...
    │  { type: "done" }      │
    │                        │
    │              Session history stored in Map<sessionId, Session>
    │              Last 10 messages passed to Groq as context
```

### Server-Side Sessions

- Stored in-memory in `Map<sessionId, Session>`
- TTL — 2 hours since last activity
- Garbage collected every 15 minutes
- Client sends `sessionId` with every message

---

## 🔌 WebSocket Protocol

All messages are JSON. Connection: `ws://host:8080/ws`

### Client → Server

| `type` | Fields | Description |
|---|---|---|
| `question` | `question`, `sessionId` | Ask a question |
| `get_history` | `sessionId` | Retrieve session history |
| `clear_history` | `sessionId` | Clear the session |
| `ping` | — | Check connection |

### Server → Client

| `type` | Fields | Description |
|---|---|---|
| `searching` | — | Knowledge base search started |
| `search_done` | `count`, `titles` | Search completed |
| `generating` | — | Response generation started |
| `token` | `token` | Next response token |
| `done` | `sessionId`, `messageCount` | Response complete |
| `history` | `messages`, `sessionId` | Session history |
| `history_cleared` | — | Session cleared |
| `error` | `message` | Error |
| `pong` | — | Response to ping |

---

## 📋 REST API

### Public Endpoints (no auth required)

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Server status + WS session stats |
| `POST` | `/ai` | Fallback HTTP chatbot endpoint |
| `POST` | `/auth/login` | Login (password → JWT cookie) |

### Protected Endpoints (JWT cookie required)

| Method | Path | Description |
|---|---|---|
| `GET` | `/auth/check` | Verify token |
| `POST` | `/auth/logout` | Logout |
| `GET` | `/crmCrud/students` | List groups |
| `POST` | `/crmCrud/students` | Create group |
| `POST` | `/crmCrud/students/:id/add` | Add student |
| `POST` | `/crmCrud/students/:groupId/edit/:name` | Edit student |
| `POST` | `/crmCrud/students/:groupId/delete/:name` | Delete student |
| `POST` | `/crmCrud/students/update-group/:id` | Rename group |
| `POST` | `/crmCrud/students/delete-group/:id` | Delete group |
| `POST` | `/crmCrud/excelRouter/upload-groups` | Upload Excel |
| `GET` | `/crmCrud/excelRouter/export-groups` | Export to Excel |

### Response Format

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {},
  "timestamp": "2026-04-20T11:22:28.468Z"
}
```

---

## ⚙️ Environment Variables

### zere-express

| Variable | Description | Required |
|---|---|---|
| `PORT` | Server port (default: 8080) | No |
| `NODE_ENV` | `development` or `production` | No |
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_KEY` | Supabase service key | Yes |
| `GROQ_API_KEY` | Groq API key | Yes |
| `GROQ_MODEL` | Model (default: `llama-3.3-70b-versatile`) | No |
| `SEARCH_API_URL` | FastAPI URL (Docker: `http://fastapi:7860`) | Yes |
| `JWT_SECRET` | JWT secret (`openssl rand -base64 32`) | Yes |
| `JWT_EXPIRY` | Token lifetime (default: `24h`) | No |
| `ADMIN_PASSWORD` | Admin panel password | Yes |

### front-end (Next.js)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Express REST API URL (e.g. `http://localhost:8080`) |
| `NEXT_PUBLIC_WS_URL` | WebSocket URL (e.g. `ws://localhost:8080`) |

---

## 🚀 Quickstart

### Docker Compose (recommended)

```bash
git clone <repo-url>
cd zereAI

# Create .env in the root directory
cat > .env << EOF
GROQ_API_KEY=your_groq_key
JWT_SECRET=$(openssl rand -base64 32)
ADMIN_PASSWORD=your_admin_password
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
EOF

docker compose up -d
```

Once running:

| Interface | Address |
|---|---|
| Chat (Next.js) | http://localhost:3000 |
| Express API + WS | http://localhost:8080 |
| Search API | http://localhost:7860 |

Verify:
```bash
curl http://localhost:8080/health
docker compose ps
```

---

## 🔧 Local Setup

### Requirements

- Node.js 18+, NPM 9+
- Python 3.11+
- `.txt` files in `zere-search-api/data/` (knowledge base)

### 1. FastAPI Search API

```bash
cd zere-search-api
pip install -r requirements.txt
uvicorn search_api:app --host 0.0.0.0 --port 7860
```

On first run, the `paraphrase-multilingual-MiniLM-L12-v2` model (~500 MB) will be downloaded.

```bash
# Verify
curl http://localhost:7860/health
# {"status":"ok","documents":728}
```

### 2. Express Backend

```bash
cd zere-express
cp .env.example .env   # fill in your keys
npm install
npm start
```

```bash
# Check HTTP
curl http://localhost:8080/health

# Test chatbot via REST
curl -X POST http://localhost:8080/ai \
  -H "Content-Type: application/json" \
  -d '{"question": "Hello"}'
```

WebSocket is available at `ws://localhost:8080/ws`.

### 3. Next.js Frontend

```bash
cd front-end
cp .env.example .env.local
# Set in .env.local:
# NEXT_PUBLIC_API_URL=http://localhost:8080
# NEXT_PUBLIC_WS_URL=ws://localhost:8080

npm install
npm run dev
```

Open http://localhost:3000 — the chat works via WebSocket with token streaming.

---

## 📦 Dependencies

**zere-express**

| Package | Purpose |
|---|---|
| `express` | Web framework |
| `ws` | WebSocket server |
| `node-fetch` | HTTP client for Groq and FastAPI |
| `express-validator` | Input validation |
| `@supabase/supabase-js` | Database client |
| `jsonwebtoken` | JWT authorization |
| `multer` | File uploads |
| `xlsx` | Excel processing |
| `dotenv` | Environment variables |

**zere-search-api** — FastAPI + `sentence-transformers` (`paraphrase-multilingual-MiniLM-L12-v2`)

**front-end** — Next.js 16, React 19, TypeScript, Tailwind CSS 4

---

## 📝 License

© 2025–2026 Ilyas Salimov. All rights reserved. See [LICENSE](./LICENSE).