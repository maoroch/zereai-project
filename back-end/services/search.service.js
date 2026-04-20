import fetch from 'node-fetch';
import env from '../config/env.js';
import logger from '../utils/logger.js';

/**
 * Queries the FastAPI vector search service.
 * Returns an array of { title, body, similarity } or null if unavailable.
 */
export async function searchKnowledge(question, topN = 3) {
  try {
    const res = await fetch(`${env.SEARCH_API_URL}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: question, top_n: topN }),
    });

    if (!res.ok) {
      logger.warn('Search API returned non-OK status', { status: res.status });
      return null;
    }

    const data = await res.json();
    return data.results ?? null;
  } catch (err) {
    logger.warn('Search API unavailable', { message: err.message });
    return null;
  }
}

/**
 * Formats search results into a context string for the LLM prompt.
 */
export function formatContext(results) {
  if (!results || results.length === 0) return 'База знаний недоступна.';
  return results.map((r, i) => `[${i + 1}] ${r.title}\n${r.body}`).join('\n\n---\n\n');
}
