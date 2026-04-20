import { Router } from 'express';
import validate from '../middlewares/validation.middleware.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import asyncHandler from '../utils/asyncHandler.js';
import {
  createGroupValidator,
  addStudentValidator,
  editStudentValidator,
} from '../validators/crm.validator.js';
import {
  getGroups,
  createGroup,
  updateGroup,
  removeGroup,
  addStudent,
  editStudent,
  deleteStudent,
} from '../controllers/crm.controller.js';

const router = Router();

// All CRM routes require authentication
router.use(authMiddleware);

// Groups
router.get('/students',                          asyncHandler(getGroups));
router.post('/students',                         validate(createGroupValidator), asyncHandler(createGroup));
router.post('/students/update-group/:id',        validate(createGroupValidator), asyncHandler(updateGroup));
router.post('/students/delete-group/:id',        asyncHandler(removeGroup));

// Students
router.post('/students/:id/add',                           validate(addStudentValidator),  asyncHandler(addStudent));
router.post('/students/:groupId/edit/:studentName',        validate(editStudentValidator), asyncHandler(editStudent));
router.post('/students/:groupId/delete/:studentName',      asyncHandler(deleteStudent));

export default router;
