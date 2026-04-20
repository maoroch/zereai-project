import crypto from 'crypto';
import { getRedis } from '../config/redis.js';
import logger from '../utils/logger.js';

// TTL: одинаковые вопросы кэшируются на 1 час
const CACHE_TTL_SECONDS = 60 * 60;

// Ключ строится из вопроса + контекста поиска.
// Контекст нормализуется чтобы незначительные различия не ломали попадание в кэш.
function buildCacheKey(question, searchResultTitles) {
  const normalized = question.trim().toLowerCase();
  const titlesStr = (searchResultTitles ?? []).sort().join('|');
  const hash = crypto
    .createHash('sha256')
    .update(`${normalized}::${titlesStr}`)
    .digest('hex')
    .slice(0, 16);
  return `llm:answer:${hash}`;
}

/**
 * Returns cached answer string, or null if not found / Redis unavailable.
 */
export async function getCachedAnswer(question, searchResultTitles) {
  const redis = getRedis();
  if (!redis) return null;

  try {
    const key = buildCacheKey(question, searchResultTitles);
    const cached = await redis.get(key);
    if (cached) {
      logger.info('LLM cache hit', { key });
      return cached;
    }
    return null;
  } catch (err) {
    logger.warn('Redis GET failed', { message: err.message });
    return null;
  }
}

/**
 * Stores a completed LLM answer in Redis.
 */
export async function cacheAnswer(question, searchResultTitles, answer) {
  const redis = getRedis();
  if (!redis) return;

  try {
    const key = buildCacheKey(question, searchResultTitles);
    await redis.setEx(key, CACHE_TTL_SECONDS, answer);
    logger.info('LLM answer cached', { key, ttl: CACHE_TTL_SECONDS });
  } catch (err) {
    logger.warn('Redis SET failed', { message: err.message });
  }
}
