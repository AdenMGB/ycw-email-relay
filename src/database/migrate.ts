import { initializeDatabase } from './db.js';
import { logger } from '../utils/logger.js';

try {
  initializeDatabase();
  logger.info('Database migration completed successfully');
  process.exit(0);
} catch (error) {
  logger.error('Database migration failed', { error });
  process.exit(1);
}

