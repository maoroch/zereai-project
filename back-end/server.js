import gradient from 'gradient-string';
import app from './app.js';
import env from './config/env.js';
import logger from './utils/logger.js';

const banner = `
===============================
       Zere AI — © 2025 Ilyas Salimov
       Telegram: @Ilyas_ones
       Crafted with passion ✨
===============================
`;
console.log(gradient.morning(banner));

app.listen(env.PORT, '0.0.0.0', () => {
  logger.info(`Server running on http://0.0.0.0:${env.PORT}`);
  logger.info(`Environment: ${env.NODE_ENV}`);
  logger.info(`CORS origins: ${env.CORS_ORIGINS.join(', ')}`);
  logger.info('Auth: JWT (stateless)');
});
