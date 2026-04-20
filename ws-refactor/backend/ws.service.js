import { WebSocketServer, WebSocket } from 'ws';
import { searchKnowledge, formatContext } from './search.service.js';
import env from '../config/env.js';
import logger from '../utils/logger.js';

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * @typedef {{ role: 'user' | 'assistant', content: string }} SessionMessage
 * @typedef {{ sessionId: string, messages: SessionMessage[], createdAt: number, updatedAt: number }} Session
 */

// ── In-memory session store ───────────────────────────────────────────────────

/** @type {Map<string, Session>} */
const sessions = new Map();

const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

function pruneExpiredSessions() {
  const cutoff = Date.now() - SESSION_TTL_MS;
  for (const [id, session] of sessions) {
    if (session.updatedAt < cutoff) sessions.delete(id);
  }
}
setInterval(pruneExpiredSessions, 15 * 60 * 1000);

function getOrCreateSession(sessionId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      sessionId,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }
  return sessions.get(sessionId);
}

// ── Groq streaming ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Ты — университетский ассистент Zere.
Отвечай ТОЛЬКО на основе базы знаний ниже.
Если в базе знаний есть хоть какая-то связанная информация — используй её и дай развёрнутый ответ.
Только если информации совсем нет — пиши: "В базе знаний нет информации по этому вопросу 😊"
На вопросы не по университету отвечай: "Извините, я могу помогать только по вопросам университета."
Используй язык вопроса: казахский → казахский, русский → русский, английский → английский.

База знаний:
{context}`;

/**
 * Streams Groq response tokens directly to a WebSocket client.
 * Returns the full assembled answer string.
 */
async function streamGroqToSocket(ws, messages, context) {
  const systemContent = SYSTEM_PROMPT.replace('{context}', context);

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: env.GROQ_MODEL,
      max_tokens: 1000,
      stream: true,
      messages: [
        { role: 'system', content: systemContent },
        ...messages,
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Groq API error ${response.status}: ${err.error?.message ?? 'unknown'}`);
  }

  let fullAnswer = '';

  // Parse SSE stream from Groq
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop(); // keep incomplete last line

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6).trim();
      if (payload === '[DONE]') break;

      try {
        const chunk = JSON.parse(payload);
        const token = chunk.choices?.[0]?.delta?.content;
        if (token) {
          fullAnswer += token;
          send(ws, { type: 'token', token });
        }
      } catch {
        // malformed chunk — skip
      }
    }
  }

  return fullAnswer.replace(/\[Думает:.*?\]/s, '').trim();
}

// ── Message sender helper ─────────────────────────────────────────────────────

function send(ws, payload) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

async function handleMessage(ws, rawData) {
  let parsed;
  try {
    parsed = JSON.parse(rawData.toString());
  } catch {
    return send(ws, { type: 'error', message: 'Invalid JSON' });
  }

  const { type, question, sessionId } = parsed;

  // ── ping/pong ──
  if (type === 'ping') return send(ws, { type: 'pong' });

  // ── question ──
  if (type === 'question') {
    if (!question || typeof question !== 'string' || !question.trim()) {
      return send(ws, { type: 'error', message: 'question is required' });
    }
    if (question.trim().length > 2000) {
      return send(ws, { type: 'error', message: 'question is too long (max 2000 chars)' });
    }

    const session = getOrCreateSession(sessionId ?? `anon_${Date.now()}`);

    // Append user message to session history
    session.messages.push({ role: 'user', content: question.trim() });
    session.updatedAt = Date.now();

    try {
      // Step 1: vector search
      send(ws, { type: 'searching' });
      const searchResults = await searchKnowledge(question, 3);

      if (searchResults?.length) {
        send(ws, {
          type: 'search_done',
          count: searchResults.length,
          titles: searchResults.map((r) => r.title),
        });
      } else {
        send(ws, { type: 'search_done', count: 0 });
        logger.warn('WS: vector search unavailable');
      }

      const context = formatContext(searchResults);

      // Step 2: stream Groq answer
      send(ws, { type: 'generating' });

      // Pass only the last 10 messages as context window to Groq
      const historyWindow = session.messages.slice(-10);
      const answer = await streamGroqToSocket(ws, historyWindow, context);

      // Persist assistant reply in session
      session.messages.push({ role: 'assistant', content: answer });
      session.updatedAt = Date.now();

      send(ws, {
        type: 'done',
        sessionId: session.sessionId,
        messageCount: session.messages.length,
      });

      logger.info('WS: answer streamed', { sessionId: session.sessionId });
    } catch (err) {
      logger.error('WS: error during question handling', { message: err.message });
      send(ws, { type: 'error', message: 'Ошибка при генерации ответа' });
    }
    return;
  }

  // ── get history ──
  if (type === 'get_history') {
    const session = sessions.get(sessionId);
    if (!session) {
      return send(ws, { type: 'history', messages: [] });
    }
    return send(ws, {
      type: 'history',
      messages: session.messages,
      sessionId: session.sessionId,
    });
  }

  // ── clear history ──
  if (type === 'clear_history') {
    sessions.delete(sessionId);
    return send(ws, { type: 'history_cleared' });
  }

  send(ws, { type: 'error', message: `Unknown message type: ${type}` });
}

// ── Server setup ──────────────────────────────────────────────────────────────

/**
 * Attaches a WebSocket server to an existing HTTP server.
 * @param {import('http').Server} httpServer
 */
export function attachWebSocketServer(httpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws, req) => {
    const ip = req.socket.remoteAddress;
    logger.info('WS: client connected', { ip });

    // Keep-alive ping every 30s
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.ping();
    }, 30_000);

    ws.on('message', (data) => handleMessage(ws, data));

    ws.on('close', () => {
      clearInterval(pingInterval);
      logger.info('WS: client disconnected', { ip });
    });

    ws.on('error', (err) => {
      logger.error('WS: socket error', { message: err.message });
    });
  });

  logger.info('WebSocket server attached at /ws');
  return wss;
}

// ── Session stats (for /health) ───────────────────────────────────────────────

export function getSessionStats() {
  return {
    activeSessions: sessions.size,
    totalMessages: [...sessions.values()].reduce((sum, s) => sum + s.messages.length, 0),
  };
}
