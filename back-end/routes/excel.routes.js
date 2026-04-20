import { Router } from 'express';
import multer from 'multer';
import { UPLOAD } from '../config/constants.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import asyncHandler from '../utils/asyncHandler.js';
import { uploadGroups, exportGroupsExcel } from '../controllers/excel.controller.js';
import { error } from '../utils/apiResponse.js';

const upload = multer({
  dest: 'uploads/',
  fileFilter: (_req, file, cb) => {
    const isExcel =
      UPLOAD.ALLOWED_MIMETYPES.includes(file.mimetype) ||
      /\.(xlsx|xls)$/.test(file.originalname);
    cb(isExcel ? null : new Error('Only Excel files are allowed'), isExcel);
  },
  limits: { fileSize: UPLOAD.MAX_FILE_SIZE, files: 1 },
});

const router = Router();

router.use(authMiddleware);

router.post('/upload-groups', upload.single('file'), asyncHandler(uploadGroups));
router.get('/export-groups',  asyncHandler(exportGroupsExcel));

// Multer error handler
router.use((err, _req, res, next) => {
  if (err?.code === 'LIMIT_FILE_SIZE') return error(res, 'File too large. Maximum size is 10MB.', 400);
  if (err?.code === 'LIMIT_FILE_COUNT') return error(res, 'Only one file allowed.', 400);
  if (err) return error(res, err.message, 400);
  next();
});

export default router;
