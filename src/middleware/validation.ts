import type { Request, Response, NextFunction } from 'express';
import validator from 'validator';
import { ValidationError } from '../utils/errors.js';

export function validateEmail(req: Request, _res: Response, next: NextFunction): void {
  const { to, from } = req.body;

  if (!to || !validator.isEmail(to)) {
    throw new ValidationError('Invalid or missing "to" email address');
  }

  if (from && !validator.isEmail(from)) {
    throw new ValidationError('Invalid "from" email address');
  }

  next();
}

export function validateSendEmail(req: Request, res: Response, next: NextFunction): void {
  const { to, subject, html, text, template_id } = req.body;

  if (!to) {
    throw new ValidationError('Missing required field: "to"');
  }

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

