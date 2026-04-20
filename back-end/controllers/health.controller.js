import { success } from '../utils/apiResponse.js';
import { getSessionStats } from '../services/ws.service.js';
import { isRedisConnected } from '../config/redis.js';

export const healthCheck = (_req, res) => {
  success(res, {
    message: 'Zere AI Server is running',
    data: {
      status: 'ok',
      environment: process.env.NODE_ENV || 'development',
      websocket: getSessionStats(),
      cache: {
        redis: isRedisConnected(),
        type: 'LLM answers',
        ttl: '1h',
      },
    },
  });
};
