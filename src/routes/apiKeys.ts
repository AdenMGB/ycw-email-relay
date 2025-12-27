import type { Request, Response, Router } from 'express';
import { Router as ExpressRouter } from 'express';
import { ApiKeyService } from '../services/apiKeyService.js';
import { ApiKeyModel } from '../models/apiKey.js';
import { NotFoundError } from '../utils/errors.js';
import { validateGenerateApiKey } from '../middleware/validation.js';
import { authenticateApiKey, requirePermission } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router: Router = ExpressRouter();
const apiKeyService = new ApiKeyService();
const apiKeyModel = new ApiKeyModel();

// Generate API key
// NOTE: In production, this endpoint should be protected (e.g., require admin authentication)
// or restricted by IP address. Currently open for initial setup convenience.
router.post('/generate', validateGenerateApiKey, async (req: Request, res: Response, next) => {
  try {
    const { name, permissions, rate_limit, expires_at } = req.body;

    const result = await apiKeyService.generateApiKey({
      name,
      permissions,
      rate_limit,
      expires_at: expires_at || null,
    });

    res.status(201).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
});

// List API keys (requires authentication)
router.get('/', authenticateApiKey, requirePermission('manage_keys'), async (_req: Request, res: Response, next) => {
  try {
    const keys = apiKeyModel.findAll();
    const publicKeys = keys.map(key => apiKeyModel.toPublic(key));

    res.json({
      success: true,
      keys: publicKeys,
    });
  } catch (error) {
    next(error);
  }
});

// Revoke API key
router.delete('/:client_id', authenticateApiKey, requirePermission('manage_keys'), async (req: Request, res: Response, next) => {
  try {
    const { client_id } = req.params;

    const key = apiKeyModel.findByClientId(client_id);
    if (!key) {
      throw new NotFoundError('API key not found');
    }

    const revoked = apiKeyModel.revoke(client_id);
    if (!revoked) {
      throw new Error('Failed to revoke API key');
    }

    logger.info('API key revoked', { client_id });

    res.json({
      success: true,
      message: 'API key revoked successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;

