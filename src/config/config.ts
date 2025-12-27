import dotenv from 'dotenv';

dotenv.config();

export const config = {
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  database: {
    path: process.env.DATABASE_PATH || './database/email-service.db',
  },
  smtp: {
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '25', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY || '',
  },
  mailgun: {
    apiKey: process.env.MAILGUN_API_KEY || '',
    domain: process.env.MAILGUN_DOMAIN || '',
  },
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY || '',
    secretAccessKey: process.env.AWS_SECRET_KEY || '',
    region: process.env.AWS_REGION || 'us-east-1',
  },
  security: {
    jwtSecret: process.env.JWT_SECRET || 'change-me-in-production',
    apiKeySecret: process.env.API_KEY_SECRET || 'change-me-in-production',
  },
  email: {
    defaultFrom: process.env.DEFAULT_FROM_EMAIL || 'noreply@ycwadelaide.adenmgb.com',
    defaultFromName: process.env.DEFAULT_FROM_NAME || 'YCW Adelaide',
  },
  rateLimit: {
    default: parseInt(process.env.DEFAULT_RATE_LIMIT || '1000', 10),
  },
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },
} as const;

