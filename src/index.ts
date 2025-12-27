import express, { type Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { config } from './config/config.js';
import { initializeStorage } from './database/jsonStorage.js';
import { logger } from './utils/logger.js';
import { AppError } from './utils/errors.js';
import healthRouter from './routes/health.js';
import apiRouter from './routes/api.js';

const app = express();

// Initialize storage
initializeStorage();

// Middleware
app.use(helmet());
app.use(cors({
  origin: config.cors.origin === '*' ? true : config.cors.origin,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

// Routes
app.use('/health', healthRouter);
app.use('/api/v1', apiRouter);

// Root endpoint
app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'YCW Email Relay Service',
    version: '1.0.0',
    status: 'running',
  });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, _next: NextFunction): void => {
  if (err instanceof AppError) {
    logger.warn('Application error', {
      error: err.message,
      code: err.code,
      statusCode: err.statusCode,
      path: req.path,
    });

    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code,
    });
    return;
  }

  // Handle JSON parsing errors
  if (err instanceof SyntaxError && 'body' in err) {
    logger.warn('JSON parsing error', {
      error: err.message,
      path: req.path,
    });

    res.status(400).json({
      success: false,
      error: 'Invalid JSON in request body',
      code: 'INVALID_JSON',
      details: err.message,
    });
    return;
  }

  // Handle JSON parsing errors
  if (err instanceof SyntaxError && err.message.includes('JSON')) {
    logger.warn('JSON parsing error', {
      error: err.message,
      path: req.path,
    });

    res.status(400).json({
      success: false,
      error: 'Invalid JSON in request body',
      code: 'INVALID_JSON',
      details: err.message,
    });
    return;
  }

  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
  });

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
  });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    code: 'NOT_FOUND',
  });
});

// Start server
const port = config.server.port;
app.listen(port, () => {
  logger.info(`Server started on port ${port}`, {
    port,
    nodeEnv: config.server.nodeEnv,
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

