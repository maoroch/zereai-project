import { body, param } from 'express-validator';

export const createGroupValidator = [
  body('group')
    .exists({ checkFalsy: true })
    .withMessage('group name is required')
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('group name must be between 1 and 100 characters'),
];

export const addStudentValidator = [
  param('id').isInt({ gt: 0 }).withMessage('id must be a positive integer'),
  body('name')
    .exists({ checkFalsy: true })
    .withMessage('name is required')
    .isString()
    .trim()
    .isLength({ min: 1, max: 200 }),
  body('phone').optional().isString().trim(),
  body('paid').optional().isIn(['true', 'false', true, false]).withMessage('paid must be boolean'),
];

export const editStudentValidator = [
  param('groupId').isInt({ gt: 0 }).withMessage('groupId must be a positive integer'),
  param('studentName').isString().trim().notEmpty().withMessage('studentName is required'),
  body('phone').optional().isString().trim(),
  body('paid').optional().isIn(['true', 'false', true, false]),
];
