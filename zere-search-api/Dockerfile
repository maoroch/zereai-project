FROM python:3.10-slim

RUN useradd -m -u 1000 user
USER user
ENV PATH="/home/user/.local/bin:$PATH"
ENV TRANSFORMERS_CACHE="/home/user/.cache"

WORKDIR /app

COPY --chown=user requirements.txt .

# torch отдельно с увеличенным таймаутом
RUN pip install --no-cache-dir --timeout=300 \
    torch==2.3.1 --extra-index-url https://download.pytorch.org/whl/cpu

RUN pip install --no-cache-dir -r requirements.txt

# Запекаем модель
RUN python -c "from sentence_transformers import SentenceTransformer; \
    SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')"

COPY --chown=user . .

CMD ["uvicorn", "search_api:app", "--host", "0.0.0.0", "--port", "7860"]