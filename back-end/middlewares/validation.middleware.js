import { validationResult } from 'express-validator';
import { error } from '../utils/apiResponse.js';

/**
 * Runs express-validator checks and short-circuits on failure.
 */
const validate = (validations) => async (req, res, next) => {
  for (const validation of validations) {
    await validation.run(req);
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return error(res, 'Validation failed', 422, errors.array());
  }

  next();
};

export default validate;
