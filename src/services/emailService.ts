import { randomBytes } from 'crypto';
import { htmlToText } from 'html-to-text';
import { MailServer } from './mailServer.js';
import { EmailLogModel } from '../models/emailLog.js';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

export interface SendEmailOptions {
  to: string;
  from?: string;
  subject: string;
  html?: string;
  text?: string;
  reply_to?: string;
  template_id?: string;
  template_variables?: Record<string, string>;
}

export interface SendEmailResult {
  success: boolean;
  message_id?: string;
  status: 'sent' | 'failed';
  sent_at?: string;
  error?: string;
  code?: string;
}

export interface BulkEmailOptions {
  recipients: string[];
  from?: string;
  subject: string;
  html?: string;
  text?: string;
  reply_to?: string;
}

export interface BulkEmailResult {
  success: boolean;
  total: number;
  sent: number;
  failed: number;
  message_ids: string[];
}

export class EmailService {
  private mailServer: MailServer;
  private emailLogModel: EmailLogModel;

  constructor() {
    this.mailServer = new MailServer();
    this.emailLogModel = new EmailLogModel();
  }

  private generateMessageId(): string {
    const timestamp = Date.now();
    const random = randomBytes(8).toString('hex');
    return `email-service-${timestamp}-${random}`;
  }

  async sendEmail(options: SendEmailOptions, apiKeyId?: number): Promise<SendEmailResult> {
    const messageId = this.generateMessageId();
    const fromEmail = options.from || config.email.defaultFrom;
    
    // Create email log entry
    let emailLog = this.emailLogModel.create({
      api_key_id: apiKeyId || null,
      to_email: options.to,
      from_email: fromEmail,
      subject: options.subject,
      template_id: options.template_id || null,
      status: 'pending',
      message_id: messageId,
    });

    try {
      // Convert HTML to text if text not provided
      let textContent = options.text;
      if (!textContent && options.html) {
        textContent = htmlToText(options.html, {
          wordwrap: 80,
        });
      }

      const transporter = this.mailServer.getTransporter();
      
      const mailOptions = {
        from: `${config.email.defaultFromName} <${fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: textContent,
        replyTo: options.reply_to,
        messageId: `<${messageId}@ycwadelaide.adenmgb.com>`,
      };

      const info = await transporter.sendMail(mailOptions);

      // Update email log
      this.emailLogModel.updateStatus(
        emailLog.id,
        'sent',
        null,
        info.messageId || messageId
      );

      logger.info('Email sent successfully', {
        message_id: messageId,
        to: options.to,
        subject: options.subject,
      });

      return {
        success: true,
        message_id: messageId,
        status: 'sent',
        sent_at: new Date().toISOString(),
      };
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error';
      
      // Update email log
      this.emailLogModel.updateStatus(
        emailLog.id,
        'failed',
        errorMessage,
        messageId
      );

      logger.error('Email sending failed', {
        message_id: messageId,
        to: options.to,
        error: errorMessage,
      });

      return {
        success: false,
        message_id: messageId,
        status: 'failed',
        error: errorMessage,
        code: 'EMAIL_SEND_FAILED',
      };
    }
  }

  async sendBulkEmail(options: BulkEmailOptions, apiKeyId?: number): Promise<BulkEmailResult> {
    const results: BulkEmailResult = {
      success: true,
      total: options.recipients.length,
      sent: 0,
      failed: 0,
      message_ids: [],
    };

    for (const recipient of options.recipients) {
      const result = await this.sendEmail(
        {
          to: recipient,
          from: options.from,
          subject: options.subject,
          html: options.html,
          text: options.text,
          reply_to: options.reply_to,
        },
        apiKeyId
      );

      if (result.success) {
        results.sent++;
        if (result.message_id) {
          results.message_ids.push(result.message_id);
        }
      } else {
        results.failed++;
      }
    }

    return results;
  }

  getEmailStatus(messageId: string) {
    return this.emailLogModel.findByMessageId(messageId);
  }
}

