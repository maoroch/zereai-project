import logger from '../utils/logger.js';

const requestLogger = (req, res, next) => {
  const start = Date.now();
  const hasAuth = !!req.cookies?.auth_token;

  res.on('finish', () => {
    logger.info(`${req.method} ${req.originalUrl} → ${res.statusCode} (${Date.now() - start}ms)`, {
      auth: hasAuth,
    });
  });

  next();
};

export default requestLogger;
