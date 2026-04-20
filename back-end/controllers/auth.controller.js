import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import { success, error } from '../utils/apiResponse.js';
import logger from '../utils/logger.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 24 * 60 * 60 * 1000,
};

export const login = (req, res) => {
  const { password } = req.body;

  if (!password) {
    return error(res, 'Password is required', 400);
  }

  if (password !== env.ADMIN_PASSWORD) {
    logger.warn('Failed login attempt');
    return error(res, 'Invalid password', 401);
  }

  const token = jwt.sign({ role: 'admin', loginTime: new Date().toISOString() }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRY,
  });

  res.cookie('auth_token', token, COOKIE_OPTIONS);
  logger.info('Admin login successful');

  return success(res, { message: 'Login successful', data: { token } });
};

export const check = (req, res) => {
  // Token already verified by authMiddleware — req.user is populated
  return success(res, {
    message: 'Authenticated',
    data: { role: req.user.role, loginTime: req.user.loginTime },
  });
};

export const logout = (req, res) => {
  res.clearCookie('auth_token');
  logger.info('Admin logout');
  return success(res, { message: 'Logged out successfully', data: null });
};
