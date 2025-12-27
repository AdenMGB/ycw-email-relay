import nodemailer, { type Transporter } from 'nodemailer';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

export class MailServer {
  private transporter: Transporter | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    // Priority: SendGrid > Mailgun > AWS SES > SMTP
    if (config.sendgrid.apiKey) {
      this.transporter = nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        auth: {
          user: 'apikey',
          pass: config.sendgrid.apiKey,
        },
      });
      logger.info('Mail server initialized: SendGrid');
    } else if (config.mailgun.apiKey && config.mailgun.domain) {
      // Mailgun uses HTTP API, not SMTP, so we'd need a different approach
      // For now, fall back to SMTP if Mailgun SMTP credentials are available
      this.transporter = nodemailer.createTransport({
        host: `smtp.mailgun.org`,
        port: 587,
        secure: false,
        auth: {
          user: `postmaster@${config.mailgun.domain}`,
          pass: config.mailgun.apiKey,
        },
      });
      logger.info('Mail server initialized: Mailgun');
    } else if (config.aws.accessKeyId && config.aws.secretAccessKey) {
      // AWS SES would require aws-sdk, but we'll use SMTP for now
      this.transporter = nodemailer.createTransport({
        host: `email-smtp.${config.aws.region}.amazonaws.com`,
        port: 587,
        secure: false,
        auth: {
          user: config.aws.accessKeyId,
          pass: config.aws.secretAccessKey,
        },
      });
      logger.info('Mail server initialized: AWS SES');
    } else {
      // Default to local SMTP (Postfix)
      this.transporter = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.secure,
        auth: config.smtp.user ? {
          user: config.smtp.user,
          pass: config.smtp.pass,
        } : undefined,
      });
      logger.info('Mail server initialized: Local SMTP', {
        host: config.smtp.host,
        port: config.smtp.port,
      });
    }
  }

  getTransporter(): Transporter {
    if (!this.transporter) {
      throw new Error('Mail transporter not initialized');
    }
    return this.transporter;
  }

  async verifyConnection(): Promise<boolean> {
    try {
      if (this.transporter) {
        await this.transporter.verify();
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Mail server connection verification failed', { error });
      return false;
    }
  }
}

