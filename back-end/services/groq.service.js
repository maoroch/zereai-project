import fetch from 'node-fetch';
import env from '../config/env.js';
import logger from '../utils/logger.js';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

const SYSTEM_PROMPT = `Ты — университетский ассистент Zere.
Отвечай ТОЛЬКО на основе базы знаний ниже.
Если в базе знаний есть хоть какая-то связанная информация — используй её и дай развёрнутый ответ.
Только если информации совсем нет — пиши: "В базе знаний нет информации по этому вопросу 😊"
На вопросы не по университету отвечай: "Извините, я могу помогать только по вопросам университета."
Используй язык вопроса: казахский → казахский, русский → русский, английский → английский.

База знаний:
{context}`;

export async function askGroq(question, context) {
  const systemMessage = SYSTEM_PROMPT.replace('{context}', context);

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: env.GROQ_MODEL,
      max_tokens: 1000,
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: question },
      ],
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    logger.error('Groq API error', { status: response.status, body: data });
    throw new Error('Groq API request failed');
  }

  if (!data?.choices?.length) {
    throw new Error('Groq API returned an empty response');
  }

  // Strip internal model thoughts if present
  const raw = data.choices[0].message.content || '';
  return raw.replace(/\[Думает:.*?\]/s, '').trim();
}
