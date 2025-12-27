import { initializeStorage } from './jsonStorage.js';
import { logger } from '../utils/logger.js';

try {
  initializeStorage();
  logger.info('Storage initialization completed successfully');
  process.exit(0);
} catch (error) {
  logger.error('Storage initialization failed', { error });
  process.exit(1);
}
