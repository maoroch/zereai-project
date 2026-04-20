import { body } from 'express-validator';

export const aiValidator = [
  body('question')
    .exists({ checkFalsy: true })
    .withMessage('question is required')
    .isString()
    .withMessage('question must be a string')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('question must be between 1 and 2000 characters'),
];
