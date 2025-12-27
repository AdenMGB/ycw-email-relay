import type { Request, Response, Router } from 'express';
import { Router as ExpressRouter } from 'express';
import { EmailService } from '../services/emailService.js';
import { EmailLogModel } from '../models/emailLog.js';
import { NotFoundError } from '../utils/errors.js';
import { validateSendEmail, validateBulkEmail } from '../middleware/validation.js';
import { authenticateApiKey, requirePermission } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimit.js';

const router: Router = ExpressRouter();
const emailService = new EmailService();
const emailLogModel = new EmailLogModel();
const rateLimiter = createRateLimiter();

// Apply authentication and rate limiting to all email routes
router.use(authenticateApiKey);
router.use(requirePermission('send_email'));
router.use(rateLimiter);

// Send single email
router.post('/send', validateSendEmail, async (req: Request, res: Response, next): Promise<void> => {
  try {
    const { to, from, subject, html, text, reply_to, template_id } = req.body;
    const apiKeyId = req.apiKeyData?.id;

    // TODO: Handle template rendering if template_id is provided
    if (template_id) {
      // For now, return error if template is requested but not implemented
      res.status(501).json({
        success: false,
        error: 'Template rendering not yet implemented',
        code: 'NOT_IMPLEMENTED',
      });
      return;
    }

    const result = await emailService.sendEmail(
      {
        to,
        from,
        subject,
        html,
        text,
        reply_to,
      },
      apiKeyId
    );

    if (result.success) {
      res.json({
        success: true,
        message_id: result.message_id,
        status: result.status,
        sent_at: result.sent_at,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        code: result.code,
      });
    }
  } catch (error) {
    next(error);
  }
});

// Send bulk email
router.post('/send-bulk', validateBulkEmail, async (req: Request, res: Response, next) => {
  try {
    const { recipients, from, subject, html, text, reply_to } = req.body;
    const apiKeyId = req.apiKeyData?.id;

    const result = await emailService.sendBulkEmail(
      {
        recipients,
        from,
        subject,
        html,
        text,
        reply_to,
      },
      apiKeyId
    );

    res.json({
      success: true,
      total: result.total,
      sent: result.sent,
      failed: result.failed,
      message_ids: result.message_ids,
    });
  } catch (error) {
    next(error);
  }
});

// Get email status
router.get('/:message_id', async (req: Request, res: Response, next) => {
  try {
    const { message_id } = req.params;

    const emailLog = emailLogModel.findByMessageId(message_id);

    if (!emailLog) {
      throw new NotFoundError('Email not found');
    }

    res.json({
      success: true,
      message_id: emailLog.message_id,
      to: emailLog.to_email,
      subject: emailLog.subject,
      status: emailLog.status,
      sent_at: emailLog.sent_at,
      error_message: emailLog.error_message,
    });
  } catch (error) {
    next(error);
  }
});

// Get email logs
router.get('/logs', async (req: Request, res: Response, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const status = req.query.status as any;
    const from_date = req.query.from_date as string;
    const to_date = req.query.to_date as string;

    const result = emailLogModel.query({
      limit,
      offset,
      status,
      from_date,
      to_date,
    });

    res.json({
      success: true,
      total: result.total,
      limit,
      offset,
      logs: result.logs.map(log => ({
        id: log.id,
        to_email: log.to_email,
        subject: log.subject,
        status: log.status,
        sent_at: log.sent_at,
        created_at: log.created_at,
      })),
    });
  } catch (error) {
    next(error);
  }
});

export default router;

