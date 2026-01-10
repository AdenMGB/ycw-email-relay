import type { Request, Response, NextFunction } from 'express';
import validator from 'validator';
import { ValidationError } from '../utils/errors.js';

function validateEmailAddress(email: string | string[], fieldName: string): void {
  if (Array.isArray(email)) {
    for (const addr of email) {
      if (!validator.isEmail(addr)) {
        throw new ValidationError(`Invalid email address in "${fieldName}": ${addr}`);
      }
    }
  } else {
    if (!validator.isEmail(email)) {
      throw new ValidationError(`Invalid "${fieldName}" email address: ${email}`);
    }
  }
}

export function validateEmail(req: Request, _res: Response, next: NextFunction): void {
  const { to, from, cc, bcc, reply_to } = req.body;

  if (!to) {
    throw new ValidationError('Missing required field: "to"');
  }

  validateEmailAddress(to, 'to');

  if (from) {
    validateEmailAddress(from, 'from');
  }

  if (cc) {
    validateEmailAddress(cc, 'cc');
  }

  if (bcc) {
    validateEmailAddress(bcc, 'bcc');
  }

  if (reply_to) {
    validateEmailAddress(reply_to, 'reply_to');
  }

  next();
}

export function validateSendEmail(req: Request, res: Response, next: NextFunction): void {
  const { subject, html, text, template_id } = req.body;

  if (!subject) {
    throw new ValidationError('Missing required field: "subject"');
  }

  if (!html && !text && !template_id) {
    throw new ValidationError('Must provide either "html", "text", or "template_id"');
  }

  if (template_id && !req.body.template_variables) {
    throw new ValidationError('Missing required field: "template_variables" (required when using template_id)');
  }

  validateEmail(req, res, next);
}

export function validateBulkEmail(req: Request, _res: Response, next: NextFunction): void {
  const { recipients, subject, html, text } = req.body;

  if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
    throw new ValidationError('Missing or invalid "recipients" array');
  }

  if (!subject) {
    throw new ValidationError('Missing required field: "subject"');
  }

  if (!html && !text) {
    throw new ValidationError('Must provide either "html" or "text"');
  }

  // Validate all recipient emails
  for (const recipient of recipients) {
    if (!validator.isEmail(recipient)) {
      throw new ValidationError(`Invalid email address in recipients: ${recipient}`);
    }
  }

  if (req.body.from && !validator.isEmail(req.body.from)) {
    throw new ValidationError('Invalid "from" email address');
  }

  if (req.body.reply_to && !validator.isEmail(req.body.reply_to)) {
    throw new ValidationError('Invalid "reply_to" email address');
  }

  next();
}

export function validateGenerateApiKey(req: Request, _res: Response, next: NextFunction): void {
  const { name } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    throw new ValidationError('Missing or invalid "name" field');
  }

  if (req.body.permissions && !Array.isArray(req.body.permissions)) {
    throw new ValidationError('Invalid "permissions" field (must be an array)');
  }

  if (req.body.rate_limit && (typeof req.body.rate_limit !== 'number' || req.body.rate_limit < 1)) {
    throw new ValidationError('Invalid "rate_limit" field (must be a positive number)');
  }

  next();
}

