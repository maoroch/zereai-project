from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator
from sentence_transformers import SentenceTransformer, util
import redis
import json
import time
import os
from collections import defaultdict

# ---------------------------
# Redis
# ---------------------------
try:
    r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
    r.ping()
    REDIS_OK = True
    print("✅ Redis подключён")
except Exception:
    r = None
    REDIS_OK = False
    print("⚠️ Redis недоступен, кэш отключён")

# ---------------------------
# Загружаем документы из ./data/*.txt
# ---------------------------
DATA_DIR = "./data"
documents = []

if os.path.exists(DATA_DIR):
    for filename in os.listdir(DATA_DIR):
        if filename.endswith(".txt") and not filename.startswith("."):
            filepath = os.path.join(DATA_DIR, filename)
            with open(filepath, "r", encoding="utf-8") as f:
                raw = f.read()

            MAX_CHUNK_WORDS = 100
            chunks = []
            for c in raw.split("\n\n"):
                c = c.strip()
                if len(c.split()) > MAX_CHUNK_WORDS:
                    sentences = c.split(". ")
                    sub = ""
                    for s in sentences:
                        if len((sub + s).split()) < MAX_CHUNK_WORDS:
                            sub += s + ". "
                        else:
                            if sub: chunks.append(sub.strip())
                            sub = s + ". "
                    if sub: chunks.append(sub.strip())
                elif len(c) > 20:
                    chunks.append(c)

            for chunk in chunks:
                lines = chunk.split("\n")
                title = lines[0]
                body = "\n".join(lines[1:]) if len(lines) > 1 else ""
                documents.append({
                    "source": filename,
                    "title": title,
                    "body": body,
                    "full": title + " " + body
                })

print(f"📚 Загружено документов: {len(documents)}")

# ---------------------------
# Модель
# ---------------------------
print("⏳ Загружаем модель...")
model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
embeddings = model.encode([doc["full"] for doc in documents], convert_to_tensor=True)
print("✅ Модель загружена")

# ---------------------------
# FastAPI
# ---------------------------
app = FastAPI(title="Zere AI Search API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://zere-six.vercel.app",
        "http://localhost:3000",
        "https://maoroch-zere-search-api.hf.space",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------
# Rate limiting
# ---------------------------
requests_log = defaultdict(list)
MAX_REQUESTS = 20
PER_SECONDS = 10

@app.middleware("http")
async def rate_limit(request: Request, call_next):
    ip = request.client.host
    now = time.time()
    requests_log[ip] = [t for t in requests_log[ip] if now - t < PER_SECONDS]
    if len(requests_log[ip]) >= MAX_REQUESTS:
        raise HTTPException(status_code=429, detail="Слишком много запросов.")
    requests_log[ip].append(now)
    return await call_next(request)

# ---------------------------
# Модель запроса
# ---------------------------
class Query(BaseModel):
    text: str = Field(..., min_length=2)
    top_n: int = Field(3, ge=1, le=10)
    category: str = Field(None)

    @validator("text")
    def limit_words(cls, v):
        if len(v.split()) > 100:
            raise ValueError("Запрос слишком длинный: максимум 100 слов")
        return v

# ---------------------------
# Эндпоинты
# ---------------------------
@app.get("/health")
def health():
    return {
        "status": "ok",
        "documents": len(documents),
        "redis": REDIS_OK,
    }

@app.post("/search")
def search(query: Query):
    if len(documents) == 0:
        raise HTTPException(status_code=503, detail="База знаний пуста")

    cache_key = f"search:{query.text}:{query.top_n}:{query.category}"
    if REDIS_OK:
        cached = r.get(cache_key)
        if cached:
            return {"query": query.text, "results": json.loads(cached), "cached": True}

    query_emb = model.encode(query.text, convert_to_tensor=True)
    sims = util.cos_sim(query_emb, embeddings)[0].cpu().numpy()

    top_indices = sims.argsort()[::-1][:query.top_n]

    results = []
    for idx in top_indices:
        score = float(sims[idx])
        if score < 0.2:
            continue
        results.append({
            "source": documents[idx]["source"],
            "title": documents[idx]["title"],
            "body": documents[idx]["body"],
            "similarity": round(score, 4),
        })

    if REDIS_OK:
        r.setex(cache_key, 300, json.dumps(results))

    return {"query": query.text, "results": results, "cached": False}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)