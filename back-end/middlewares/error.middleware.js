import logger from '../utils/logger.js';
import { error as apiError } from '../utils/apiResponse.js';

// eslint-disable-next-line no-unused-vars
const errorMiddleware = (err, req, res, next) => {
  logger.error(`Unhandled error on ${req.method} ${req.originalUrl}`, {
    message: err.message,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
  });

  const statusCode = err.statusCode || err.status || 500;
  return apiError(res, err.message || 'Internal server error', statusCode);
};

export default errorMiddleware;
