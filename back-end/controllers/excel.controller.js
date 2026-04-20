import { processExcelUpload, buildExcelExport } from '../services/excel.service.js';
import { success, error } from '../utils/apiResponse.js';
import { ConcurrencyGate } from '../utils/helpers.js';
import { UPLOAD } from '../config/constants.js';
import logger from '../utils/logger.js';

const uploadGate = new ConcurrencyGate(UPLOAD.MAX_CONCURRENT);

export const uploadGroups = async (req, res) => {
  if (!req.file) {
    return error(res, 'No file uploaded', 400);
  }

  const release = await uploadGate.acquire();
  logger.info('Excel upload started', { file: req.file.originalname, size: req.file.size });

  try {
    const result = await processExcelUpload(req.file.path);
    logger.info('Excel upload complete', result);
    return success(res, { message: 'File processed successfully', data: result });
  } finally {
    release();
  }
};

export const exportGroupsExcel = async (req, res) => {
  logger.info('Excel export requested');
  const { buffer, fileName } = await buildExcelExport();

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
  res.setHeader('Cache-Control', 'private, max-age=30');
  return res.send(buffer);
};
