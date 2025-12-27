import type { Request, Response, NextFunction } from 'express';
import { ApiKeyService } from '../services/apiKeyService.js';
import { AuthenticationError, AuthorizationError } from '../utils/errors.js';

declare global {
  namespace Express {
    interface Request {
      apiKeyData?: any;
    }
  }
}

const apiKeyService = new ApiKeyService();

export async function authenticateApiKey(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('Missing or invalid Authorization header');
    }

    const apiKey = authHeader.substring(7).trim(); // Remove 'Bearer ' prefix and trim whitespace

    if (!apiKey) {
      throw new AuthenticationError('API key is empty');
    }

    const validation = await apiKeyService.validateApiKey(apiKey);

    if (!validation.valid || !validation.apiKeyData) {
      throw new AuthenticationError('Invalid or expired API key');
    }

    req.apiKeyData = validation.apiKeyData;
    next();
  } catch (error) {
    next(error);
  }
}

export function requirePermission(permission: string) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.apiKeyData) {
        throw new AuthenticationError('API key not authenticated');
      }

      const hasPermission = await apiKeyService.verifyPermission(req.apiKeyData, permission);

      if (!hasPermission) {
        throw new AuthorizationError(`Missing required permission: ${permission}`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

