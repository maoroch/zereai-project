import { DB_RETRY } from '../config/constants.js';
import logger from './logger.js';

/**
 * Retries a DB operation with exponential back-off.
 */
export async function retryOperation(operation, name, maxRetries = DB_RETRY.MAX_RETRIES) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      if (attempt > 1) logger.info(`${name} succeeded on attempt ${attempt}`);
      return result;
    } catch (err) {
      logger.warn(`${name} failed (attempt ${attempt}/${maxRetries})`, { message: err.message });
      if (attempt === maxRetries) {
        throw new Error(`${name} failed after ${maxRetries} attempts: ${err.message}`);
      }
      const delay = Math.min(DB_RETRY.BASE_DELAY * 2 ** (attempt - 1), DB_RETRY.MAX_DELAY);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

/**
 * Simple in-memory concurrency limiter (returns a release function).
 */
export class ConcurrencyGate {
  constructor(limit) {
    this.limit = limit;
    this.active = 0;
    this.queue = [];
  }

  acquire() {
    return new Promise((resolve) => {
      const tryAcquire = () => {
        if (this.active < this.limit) {
          this.active++;
          resolve(() => {
            this.active--;
            if (this.queue.length) this.queue.shift()();
          });
        } else {
          this.queue.push(tryAcquire);
        }
      };
      tryAcquire();
    });
  }
}

/**
 * Detect language family from text.
 */
export function detectLanguage(text) {
  if (/[а-яёәіңғүұқөһ]/i.test(text)) return 'kazakh_or_russian';
  if (/[a-z]/i.test(text)) return 'english';
  return 'russian';
}
