import http from 'http';
import gradient from 'gradient-string';
import app from './app.js';
import env from './config/env.js';
import logger from './utils/logger.js';
import { attachWebSocketServer } from './services/ws.service.js';

const banner = `
===============================
       Zere AI — © 2025 Ilyas Salimov
       Telegram: @Ilyas_ones
       Crafted with passion ✨
===============================
`;
console.log(gradient.morning(banner));

// Create HTTP server manually so WS can share the same port
const httpServer = http.createServer(app);

// Attach WebSocket server at ws://host/ws
attachWebSocketServer(httpServer);

httpServer.listen(env.PORT, '0.0.0.0', () => {
  logger.info(`HTTP  → http://0.0.0.0:${env.PORT}`);
  logger.info(`WS    → ws://0.0.0.0:${env.PORT}/ws`);
  logger.info(`Environment: ${env.NODE_ENV}`);
  logger.info(`CORS origins: ${env.CORS_ORIGINS.join(', ')}`);
  logger.info('Auth: JWT (stateless)');
});
