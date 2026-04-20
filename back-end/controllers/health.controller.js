import { success } from '../utils/apiResponse.js';

export const healthCheck = (_req, res) => {
  success(res, {
    message: 'Zere AI Server is running',
    data: { status: 'ok', environment: process.env.NODE_ENV || 'development' },
  });
};
