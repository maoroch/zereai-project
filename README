# Zere AI

> AI-powered search and advisory platform built on Express.js + FastAPI

---

## Содержание

- [Быстрый старт (без Docker)](#-быстрый-старт-без-docker)
- [Запуск через Docker Compose](#-запуск-через-docker-compose)
- [Архитектура](#-архитектура)
- [API](#-api)
- [Переменные окружения](#-переменные-окружения)
- [Разработка и отладка](#-разработка-и-отладка)
- [Устранение неполадок](#-устранение-неполадок)

---

## 🚀 Быстрый старт (без Docker)

### Требования

- Node.js v18+
- NPM v9+

### Установка

```bash
git clone https://github.com/maoroch/smartAdvisor.git
cd smartAdvisor
npm install
```

### Настройка окружения

Создайте файл `.env` в корне проекта:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
SESSION_SECRET=your_secret_key
GROQ_API_KEY=your_groq_api_key
JWT_SECRET=your_jwt_secret
```

### Запуск

```bash
node server.js
```

Сервер запустится на `http://localhost:3000`. При старте отобразится баннер с информацией о доступных эндпоинтах.

---

## 🐳 Запуск через Docker Compose

### Требования

- Docker 20.10+
- Docker Compose V2

### Структура проекта

```
zereAI/
├── docker-compose.yml
├── zere-express/
│   ├── Dockerfile
│   ├── server.js
│   └── package.json
└── zere-search-api/
    ├── Dockerfile
    ├── search_api.py
    ├── requirements.txt
    └── data/          ← положите сюда .txt файлы для индексации
```

### Запуск

```bash
# Из папки zereAI
docker compose up -d

# Пересборка после изменений кода или добавления документов
docker compose up --build -d
```

После запуска доступны:

| Сервис | Адрес |
|---|---|
| Frontend + Express API | http://localhost:8080 |
| Search API (FastAPI) | http://localhost:7860 |

### Остановка

```bash
docker compose down

# Полная очистка вместе с томами данных
docker compose down -v
```

---

## 🏗 Архитектура

```
Browser
   │
   ▼
Express (Node.js) :8080
   │  ├── Статический фронтенд (HTML/JS)
   │  ├── POST /ai        → Groq LLM
   │  └── GET  /search    → FastAPI :7860
   │
   ▼
FastAPI (Python) :7860
   │  └── Векторный поиск по .txt документам
   │      Модель: paraphrase-multilingual-MiniLM-L12-v2
```

> **Первый запуск:** FastAPI автоматически скачает модель (~500 MB) и проиндексирует все `.txt` файлы из папки `zere-search-api/data`. Это займёт несколько минут.

---

## 📋 API

### `GET /health`

Проверка состояния сервера.

```bash
curl http://localhost:3000/health
```

---

### `POST /ai`

Запрос к AI. Принимает JSON с полем `question`.

```bash
curl -X POST http://localhost:3000/ai \
  -H "Content-Type: application/json" \
  -d '{"question": "Привет, Zere AI!"}'
```

**Ответ:**

```json
{
  "success": true,
  "answer": "...ответ AI...",
  "question": "Привет, Zere AI!",
  "timestamp": "2025-10-31T12:34:56.789Z"
}
```

---

### `ALL /crmCrud`

CRUD-операции с CRM. Поддерживает GET, POST, PUT, DELETE.

---

## ⚙️ Переменные окружения

| Переменная | Описание | Обязательна |
|---|---|---|
| `SUPABASE_URL` | URL вашего Supabase проекта | Да |
| `SUPABASE_KEY` | Ключ доступа к Supabase | Да |
| `SESSION_SECRET` | Секрет для подписи сессий | Да |
| `GROQ_API_KEY` | Ключ API Groq для LLM | Да |
| `JWT_SECRET` | Секрет для подписи JWT-токенов | Да |
| `SEARCH_API_URL` | URL FastAPI (для Docker: `http://fastapi:7860`) | Нет |

Сгенерировать безопасный `JWT_SECRET`:

```bash
openssl rand -base64 32
```

---

## 🔧 Разработка и отладка

### Запуск фронтенда

Откройте папку фронтенда в VS Code и используйте Live Server:

1. Правая кнопка на `index.html` → **Open with Live Server**
2. Браузер откроет страницу, обращающуюся к бэкенду на `localhost:3000`

### Логи (Docker)

```bash
docker logs zereai-express-1 -f   # Express
docker logs zereai-fastapi-1 -f   # FastAPI
```

### Проверка состояния

```bash
# Состояние контейнеров
docker compose ps

# Health FastAPI
curl http://localhost:7860/health
# → {"status":"ok","documents":<кол-во чанков>,"redis":false}

# Связь между сервисами (из Express-контейнера)
docker exec zereai-express-1 wget -qO- http://fastapi:7860/health
```

---

## 🛑 Устранение неполадок

| Проблема | Решение |
|---|---|
| `documents: 0` в health FastAPI | Убедитесь, что в `./zere-search-api/data` есть `.txt` файлы, и том смонтирован корректно (`docker compose config`). |
| Express не подключается к FastAPI | Проверьте переменную `SEARCH_API_URL=http://fastapi:7860`. Пропингуйте: `docker exec zereai-express-1 ping fastapi`. |
| Ошибка 503 в логах Express | FastAPI не отвечает. Проверьте его логи. Возможно, не хватает памяти для загрузки модели (требуется ~2 GB RAM). |
| `JWT_SECRET not set` | Создайте `.env` с этой переменной. |
| Медленный первый запуск | FastAPI скачивает модель ~500 MB. Это разовая операция; при следующих запусках модель берётся из кэша. |

---

## 📦 Зависимости

**Backend (Node.js)**

| Пакет | Назначение |
|---|---|
| `express` | Веб-сервер |
| `cors` | Обработка CORS |
| `express-session` | Управление сессиями |
| `dotenv` | Переменные окружения |
| `@supabase/supabase-js` | Работа с базой данных |
| `xlsx` | Обработка Excel-файлов |
| `node-fetch` | HTTP-запросы |
| `chalk`, `gradient-string` | Стилизованный вывод в консоль |

**Search API (Python)** — FastAPI + `sentence-transformers` (модель `paraphrase-multilingual-MiniLM-L12-v2`)

---

## 📝 Лицензия

© 2025–2026 Ilyas Salimov. Все права защищены. См. [LICENSE](./LICENSE).

**Контакт:** Telegram [@Ilyas_ones](https://t.me/Ilyas_ones)