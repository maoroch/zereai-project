import { searchKnowledge, formatContext } from '../services/search.service.js';
import { askGroq } from '../services/groq.service.js';
import { success, error } from '../utils/apiResponse.js';
import logger from '../utils/logger.js';

export const handleAiQuestion = async (req, res) => {
  const { question } = req.body;

  logger.info('AI question received', { question });

  const searchResults = await searchKnowledge(question, 3);

  if (searchResults) {
    logger.info(`Knowledge base: ${searchResults.length} documents found`, {
      titles: searchResults.map((r) => `"${r.title}" (${(r.similarity * 100).toFixed(1)}%)`),
    });
  } else {
    logger.warn('Vector search unavailable — answering without context');
  }

  const context = formatContext(searchResults);
  const answer = await askGroq(question, context);

  logger.info('AI answer generated');

  return success(res, { message: 'Answer generated', data: { answer, question } });
};
