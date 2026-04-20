import { body } from 'express-validator';

export const searchValidator = [
  body('text')
    .exists({ checkFalsy: true })
    .withMessage('text is required')
    .isString()
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('text must be between 1 and 2000 characters'),
  body('top_n')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('top_n must be an integer between 1 and 20'),
];
