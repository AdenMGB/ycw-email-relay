import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { ApiKeyModel, type CreateApiKeyData } from '../models/apiKey.js';
import { logger } from '../utils/logger.js';

export interface GenerateApiKeyOptions {
  name: string;
  permissions?: string[];
  rate_limit?: number;
  expires_at?: string | null;
}

export interface GeneratedApiKey {
  api_key: string;
  client_id: string;
  name: string;
  permissions: string[];
  rate_limit: number;
  created_at: string;
  expires_at: string | null;
}

export class ApiKeyService {
  private apiKeyModel: ApiKeyModel;

  constructor() {
    this.apiKeyModel = new ApiKeyModel();
  }

  generateClientId(name: string): string {
    const sanitized = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const timestamp = Date.now();
    const random = randomBytes(4).toString('hex');
    return `${sanitized}-${timestamp}-${random}`;
  }

  async generateApiKey(options: GenerateApiKeyOptions): Promise<GeneratedApiKey> {
    const clientId = this.generateClientId(options.name);
    
    // Generate a secure random API key
    const apiKeyBytes = randomBytes(32);
    const apiKey = `yk_live_${apiKeyBytes.toString('base64url')}`;
    
    // Hash the API key for storage
    const keyHash = await bcrypt.hash(apiKey, 10);
    
    const data: CreateApiKeyData = {
      key_hash: keyHash,
      name: options.name,
      client_id: clientId,
      permissions: options.permissions || ['send_email'],
      rate_limit: options.rate_limit || 1000,
      expires_at: options.expires_at || null,
    };

    const created = this.apiKeyModel.create(data);
    
    logger.info('API key generated', { client_id: clientId, name: options.name });

    return {
      api_key: apiKey,
      client_id: created.client_id,
      name: created.name,
      permissions: options.permissions || ['send_email'],
      rate_limit: created.rate_limit,
      created_at: created.created_at,
      expires_at: created.expires_at,
    };
  }

  async validateApiKey(apiKey: string): Promise<{ valid: boolean; apiKeyData?: any }> {
    const allKeys = this.apiKeyModel.findAll();
    
    for (const keyData of allKeys) {
      const isValid = await bcrypt.compare(apiKey, keyData.key_hash);
      if (isValid) {
        // Check if key is active
        if (!keyData.is_active) {
          return { valid: false };
        }

        // Check if key is expired
        if (keyData.expires_at) {
          const expiresAt = new Date(keyData.expires_at);
          if (expiresAt < new Date()) {
            return { valid: false };
          }
        }

        // Update last used
        this.apiKeyModel.updateLastUsed(keyData.id);

        return {
          valid: true,
          apiKeyData: keyData,
        };
      }
    }

    return { valid: false };
  }

  async verifyPermission(apiKeyData: any, permission: string): Promise<boolean> {
    if (!apiKeyData.permissions) {
      return false;
    }

    const permissions = JSON.parse(apiKeyData.permissions) as string[];
    return permissions.includes(permission);
  }
}

