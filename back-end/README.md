# Zere AI

> AI-powered university assistant — semantic search + streaming chat, built on Express.js + FastAPI + Next.js

---

## Содержание

- [Сервисы монорепозитория](#-сервисы-монорепозитория)
- [Архитектура](#-архитектура)
- [Кэширование LLM ответов (Redis)](#-кэширование-llm-ответов-redis)
- [WebSocket протокол](#-websocket-протокол)
- [REST API](#-rest-api)
- [Переменные окружения](#-переменные-окружения)
- [Quickstart](#-quickstart)
- [Локальный запуск](#-локальный-запуск)
- [Устранение неполадок](#-устранение-неполадок)

---

## 📦 Сервисы монорепозитория

```
zereAI/
├── zere-express/        Express.js backend — API, WebSocket, CRM, Redis cache
├── zere-search-api/     FastAPI — векторный поиск по базе знаний
└── front-end/           Next.js — чат-интерфейс пользователя
```

| Сервис | Технология | Порт | Назначение |
|---|---|---|---|
| `zere-express` | Node.js 18 / Express 5 | 8080 | REST API, WebSocket, CRM CRUD, Auth |
| `zere-search-api` | Python 3.11 / FastAPI | 7860 | Семантический поиск, векторная модель |
| `front-end` | Next.js 16 / React 19 | 3000 | Пользовательский чат-интерфейс |
| `redis` | Redis 7 | 6379 | Кэш LLM ответов (TTL 1ч) + поисковый кэш FastAPI (TTL 5м) |

---

## 🏗 Архитектура

### Структура Express backend

```
zere-express/
├── server.js                   Точка входа — HTTP + WS на одном порту, init Redis
├── app.js                      Express app, CORS, middleware, маршруты
│
├── config/
│   ├── env.js                  Все переменные окружения в одном месте
│   ├── db.js                   Supabase клиент
│   ├── redis.js                Redis клиент с graceful fallback
│   └── constants.js            Константы: Excel-колонки, лимиты, TTL кэша
│
├── services/
│   ├── ws.service.js           WebSocket сервер, сессии, стриминг
│   ├── llmCache.service.js     Redis кэш для LLM ответов
│   ├── groq.service.js         Groq LLM API (HTTP fallback)
│   ├── search.service.js       FastAPI vector search клиент
│   ├── crm.service.js          Supabase CRUD (группы, студенты)
│   └── excel.service.js        Загрузка и экспорт Excel
│
├── routes/                     Только объявление эндпоинтов
├── controllers/                Обработка req/res, вызов сервисов
├── middlewares/                auth, logger, validation, error handler
├── validators/                 express-validator схемы
└── utils/                      logger, apiResponse, asyncHandler, helpers
```

### Поток запроса чатбота (WebSocket + Redis + streaming)

```
Browser (Next.js)
    │
    │  WS connect  →  ws://host:8080/ws
    │
    │  { type: "question", question: "...", sessionId: "..." }
    │                        │
    │                   ws.service.js
    │                        │
    │  { type: "searching" } │──▶  FastAPI /search  ──▶  Redis (кэш 5м)
    │  { type: "search_done"}│◀──  [{ title, body, similarity }]
    │                        │
    │  { type: "generating" }│
    │                        │──▶  Redis GET  llm:answer:<hash>
    │                        │
    │          ┌─────────────┤
    │          │ CACHE HIT   │ CACHE MISS
    │          │             │──▶  Groq API (stream: true)
    │          │             │◀──  SSE token stream
    │          │             │──▶  Redis SET (TTL 1ч)
    │          └─────────────┤
    │                        │
    │  { type: "cache_hit" } │  (только при hit)
    │  { type: "token", ... }│  (реальный или имитированный стриминг)
    │  { type: "token", ... }│
    │  { type: "done", fromCache: true/false }
```

**Важно:** при cache hit ответ воспроизводится через тот же механизм токенов — интерфейс
стримит слова с небольшой задержкой (8ms). Фронтенд не знает о кэше — UX идентичен.

### Ключ кэша LLM

```
llm:answer:<sha256(question.lower() + "|" + sorted_search_titles)[:16]>
```

Одинаковые вопросы с одинаковым контекстом поиска дают один и тот же ключ.
Контекст поиска учитывается, чтобы не вернуть устаревший ответ при обновлении базы знаний.

---

## 💾 Кэширование LLM ответов (Redis)

### Зачем

Вызов Groq API занимает 300–800ms и тратит токены. Популярные вопросы
(«Как записаться на пересдачу?», «График учебного процесса») задаются многократно —
при кэшировании они отвечаются мгновенно без обращения к LLM.

### Уровни кэша

| Уровень | Где | TTL | Что кэшируется |
|---|---|---|---|
| LLM-ответы | Redis (Express) | **1 час** | Готовый ответ Groq по хэшу вопроса+контекст |
| Поисковые результаты | Redis (FastAPI) | **5 минут** | Результаты `POST /search` по тексту запроса |

### Graceful degradation

Redis **не является обязательным**. Если Redis недоступен:
- Сервер стартует в штатном режиме
- Все запросы идут напрямую к Groq
- В логах появляется предупреждение: `LLM cache disabled`
- Статус в `/health` показывает `"redis": false`

### Docker Compose

Redis добавлен как отдельный сервис. Пример блока в `docker-compose.yml`:

```yaml
redis:
  image: redis:7-alpine
  restart: unless-stopped
  ports:
    - "6379:6379"
  volumes:
    - redis_data:/data
  command: redis-server --appendonly yes

volumes:
  redis_data:
```

---

## 🔌 WebSocket протокол

Все сообщения — JSON. Соединение: `ws://host:8080/ws`

### Клиент → Сервер

| `type` | Поля | Описание |
|---|---|---|
| `question` | `question`, `sessionId` | Задать вопрос |
| `get_history` | `sessionId` | Получить историю сессии |
| `clear_history` | `sessionId` | Очистить сессию |
| `ping` | — | Проверка соединения |

### Сервер → Клиент

| `type` | Поля | Описание |
|---|---|---|
| `searching` | — | Начался поиск в базе знаний |
| `search_done` | `count`, `titles` | Поиск завершён |
| `generating` | — | Начата генерация (или воспроизведение из кэша) |
| `cache_hit` | — | Ответ найден в Redis (информационное) |
| `token` | `token` | Очередной токен ответа |
| `done` | `sessionId`, `messageCount`, `fromCache` | Ответ завершён |
| `history` | `messages`, `sessionId` | История сессии |
| `history_cleared` | — | Сессия очищена |
| `error` | `message` | Ошибка |
| `pong` | — | Ответ на ping |

---

## 📋 REST API

### Публичные эндпоинты (без авторизации)

| Метод | Путь | Описание |
|---|---|---|
| `GET` | `/health` | Статус сервера + WS сессии + Redis статус |
| `POST` | `/ai` | Fallback HTTP-эндпоинт чатбота |
| `POST` | `/auth/login` | Вход (пароль → JWT cookie) |

### Защищённые эндпоинты (JWT cookie)

| Метод | Путь | Описание |
|---|---|---|
| `GET` | `/auth/check` | Проверка токена |
| `POST` | `/auth/logout` | Выход |
| `GET` | `/crmCrud/students` | Список групп |
| `POST` | `/crmCrud/students` | Создать группу |
| `POST` | `/crmCrud/students/:id/add` | Добавить студента |
| `POST` | `/crmCrud/students/:groupId/edit/:name` | Редактировать студента |
| `POST` | `/crmCrud/students/:groupId/delete/:name` | Удалить студента |
| `POST` | `/crmCrud/students/update-group/:id` | Переименовать группу |
| `POST` | `/crmCrud/students/delete-group/:id` | Удалить группу |
| `POST` | `/crmCrud/excelRouter/upload-groups` | Загрузить Excel |
| `GET` | `/crmCrud/excelRouter/export-groups` | Экспорт в Excel |

### Пример ответа `/health`

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "websocket": { "activeSessions": 3, "totalMessages": 17 },
    "cache": { "redis": true, "type": "LLM answers", "ttl": "1h" }
  }
}
```

---

## ⚙️ Переменные окружения

### zere-express

| Переменная | Описание | Обязательна |
|---|---|---|
| `PORT` | Порт сервера (по умолчанию 8080) | Нет |
| `NODE_ENV` | `development` или `production` | Нет |
| `SUPABASE_URL` | URL Supabase проекта | Да |
| `SUPABASE_KEY` | Service key Supabase | Да |
| `GROQ_API_KEY` | Ключ Groq API | Да |
| `GROQ_MODEL` | Модель (по умолчанию `llama-3.3-70b-versatile`) | Нет |
| `SEARCH_API_URL` | URL FastAPI (Docker: `http://fastapi:7860`) | Да |
| `REDIS_URL` | URL Redis (по умолчанию `redis://localhost:6379`) | Нет |
| `JWT_SECRET` | Секрет для JWT (`openssl rand -base64 32`) | Да |
| `JWT_EXPIRY` | Время жизни токена (по умолчанию `24h`) | Нет |
| `ADMIN_PASSWORD` | Пароль админ-панели | Да |

### front-end (Next.js)

| Переменная | Описание |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL Express REST API (например `http://localhost:8080`) |
| `NEXT_PUBLIC_WS_URL` | URL WebSocket (например `ws://localhost:8080`) |

---

## 🚀 Quickstart

### Docker Compose (рекомендуется)

```bash
git clone <repo-url>
cd zereAI

cat > .env << EOF
GROQ_API_KEY=your_groq_key
JWT_SECRET=$(openssl rand -base64 32)
ADMIN_PASSWORD=your_admin_password
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
REDIS_URL=redis://redis:6379
EOF

docker compose up -d
```

После запуска:

| Интерфейс | Адрес |
|---|---|
| Чат (Next.js) | http://localhost:3000 |
| Express API + WS | http://localhost:8080 |
| Search API | http://localhost:7860 |

Проверка:
```bash
curl http://localhost:8080/health
# Ожидаем: "cache": { "redis": true, ... }
docker compose ps
```

---

## 🔧 Локальный запуск

### Требования

- Node.js 18+, NPM 9+
- Python 3.11+
- Redis 7+ (опционально — без него кэш просто отключится)
- Файлы `.txt` в папке `zere-search-api/data/`

### 1. Redis (опционально)

```bash
# macOS
brew install redis && brew services start redis

# Ubuntu
sudo apt install redis-server && sudo systemctl start redis

# Docker
docker run -d -p 6379:6379 redis:7-alpine
```

### 2. FastAPI Search API

```bash
cd zere-search-api
pip install -r requirements.txt
uvicorn search_api:app --host 0.0.0.0 --port 7860
```

При первом запуске скачается модель `paraphrase-multilingual-MiniLM-L12-v2` (~500 MB).

```bash
curl http://localhost:7860/health
# {"status":"ok","documents":728,"redis":true}
```

### 3. Express Backend

```bash
cd zere-express
cp .env.example .env   # заполни своими ключами
npm install            # добавились пакеты: redis, ws
npm start
```

```bash
# Проверка — убедись что redis: true
curl http://localhost:8080/health
```

### 4. Next.js Frontend

```bash
cd front-end
cp .env.example .env.local
# NEXT_PUBLIC_API_URL=http://localhost:8080
# NEXT_PUBLIC_WS_URL=ws://localhost:8080
npm install && npm run dev
```

---

## 🛑 Устранение неполадок

| Проблема | Решение |
|---|---|
| `"redis": false` в `/health` | Redis не запущен. Сервер работает, но кэш отключён. Запусти Redis или игнорируй |
| `documents: 0` в `/health` FastAPI | Положи `.txt` файлы в `zere-search-api/data/` |
| WS-индикатор красный | Проверь что Express запущен и `NEXT_PUBLIC_WS_URL` верный |
| `Search API unavailable` в логах | FastAPI ещё грузит модель или неверный `SEARCH_API_URL` |
| Ошибка 401 на CRM | Сначала выполни `POST /auth/login` чтобы получить cookie |
| Медленный первый запуск FastAPI | Модель скачивается (~500 MB). Ожидай 2–5 минут |

---

## 📦 Зависимости

**zere-express**

| Пакет | Назначение |
|---|---|
| `express` | Веб-фреймворк |
| `ws` | WebSocket сервер |
| `redis` | Клиент Redis для LLM кэша |
| `node-fetch` | HTTP-клиент для Groq и FastAPI |
| `express-validator` | Валидация входных данных |
| `@supabase/supabase-js` | БД клиент |
| `jsonwebtoken` | JWT авторизация |
| `multer` | Загрузка файлов |
| `xlsx` | Обработка Excel |
| `dotenv` | Переменные окружения |

**zere-search-api** — FastAPI + `sentence-transformers` + `redis-py` (`paraphrase-multilingual-MiniLM-L12-v2`)

**front-end** — Next.js 16, React 19, TypeScript, Tailwind CSS 4

---

## 📝 Лицензия

© 2025–2026 Ilyas Salimov. Все права защищены. См. [LICENSE](./LICENSE).

Telegram: [@Ilyas_ones](https://t.me/Ilyas_ones)
