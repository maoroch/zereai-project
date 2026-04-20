import { Router } from 'express';
import validate from '../middlewares/validation.middleware.js';
import { aiValidator } from '../validators/ai.validator.js';
import { handleAiQuestion } from '../controllers/ai.controller.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router();

router.post('/', validate(aiValidator), asyncHandler(handleAiQuestion));

export default router;
