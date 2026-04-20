import { Router } from 'express';
import { login, check, logout } from '../controllers/auth.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router();

router.post('/login',  asyncHandler(login));
router.get('/check',   authMiddleware, asyncHandler(check));
router.post('/logout', asyncHandler(logout));

export default router;
