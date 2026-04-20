import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import { error } from '../utils/apiResponse.js';

const authMiddleware = (req, res, next) => {
  const token = req.cookies?.auth_token;

  if (!token) {
    return error(res, 'Unauthorized — token not found', 401);
  }

  try {
    req.user = jwt.verify(token, env.JWT_SECRET);
    next();
  } catch {
    return error(res, 'Unauthorized — invalid or expired token', 401);
  }
};

export default authMiddleware;
