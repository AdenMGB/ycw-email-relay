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
    
    // Verify the hash works immediately after generation (for debugging)
    const testCompare = await bcrypt.compare(apiKey, keyHash);
    if (!testCompare) {
      logger.error('CRITICAL: Generated API key hash verification failed immediately after generation!', {
        client_id: clientId,
        apiKeyPrefix: apiKey.substring(0, 15) + '...',
        hashPrefix: keyHash.substring(0, 20) + '...'
      });
    }
    
    const data: CreateApiKeyData = {
      key_hash: keyHash,
      name: options.name,
      client_id: clientId,
      permissions: options.permissions || ['send_email'],
      rate_limit: options.rate_limit || 1000,
      expires_at: options.expires_at || null,
    };

    const created = this.apiKeyModel.create(data);
    
    logger.info('API key generated', { 
      client_id: clientId, 
      name: options.name,
      apiKeyPrefix: apiKey.substring(0, 15) + '...',
      apiKeyLength: apiKey.length,
      hashVerified: testCompare
    });

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
    // Normalize the API key - remove any extra whitespace
    const normalizedKey = apiKey.trim();
    
    // Validate API key format
    if (!normalizedKey.startsWith('yk_live_')) {
      logger.warn('API key has invalid format', { 
        keyPrefix: normalizedKey.substring(0, 15) + '...',
        expectedPrefix: 'yk_live_'
      });
      return { valid: false };
    }
    
    const allKeys = this.apiKeyModel.findAll();
    
    logger.info('Validating API key', { 
      keyPrefix: normalizedKey.substring(0, 15) + '...',
      keyLength: normalizedKey.length,
      totalKeys: allKeys.length 
    });
    
    for (const keyData of allKeys) {
      try {
        if (!keyData.key_hash) {
          logger.warn('API key missing key_hash', { client_id: keyData.client_id, id: keyData.id });
          continue;
        }
        
        // Verify hash format
        if (!keyData.key_hash.startsWith('$2')) {
          logger.error('Invalid hash format detected', { 
            client_id: keyData.client_id,
            hashPrefix: keyData.key_hash.substring(0, 20) + '...',
            hashLength: keyData.key_hash.length
          });
          continue;
        }
        
        logger.debug('Comparing API key hash', { 
          client_id: keyData.client_id,
          hashPrefix: keyData.key_hash.substring(0, 20) + '...',
          keyHashLength: keyData.key_hash.length,
          normalizedKeyLength: normalizedKey.length
        });
        
        const isValid = await bcrypt.compare(normalizedKey, keyData.key_hash);
        
        logger.info('Hash comparison result', { 
          client_id: keyData.client_id,
          isValid,
          keyPrefix: normalizedKey.substring(0, 15) + '...',
          storedHashPrefix: keyData.key_hash.substring(0, 20) + '...',
          storedHashLength: keyData.key_hash.length,
          hashFormat: keyData.key_hash.startsWith('$2') ? 'bcrypt' : 'unknown'
        });
        
        if (isValid) {
          logger.info('API key hash match found', { client_id: keyData.client_id });
          
          // Check if key is active
          if (!keyData.is_active) {
            logger.warn('API key is inactive', { client_id: keyData.client_id });
            return { valid: false };
          }

          // Check if key is expired
          if (keyData.expires_at) {
            const expiresAt = new Date(keyData.expires_at);
            if (expiresAt < new Date()) {
              logger.warn('API key has expired', { client_id: keyData.client_id, expires_at: keyData.expires_at });
              return { valid: false };
            }
          }

          // Update last used
          this.apiKeyModel.updateLastUsed(keyData.id);

          logger.info('API key validated successfully', { client_id: keyData.client_id });
          return {
            valid: true,
            apiKeyData: keyData,
          };
        }
      } catch (error: any) {
        logger.error('Error comparing API key hash', { 
          error: error.message,
          stack: error.stack,
          client_id: keyData.client_id 
        });
      }
    }

    logger.warn('No matching API key found', {
      keyPrefix: normalizedKey.substring(0, 15) + '...',
      keyLength: normalizedKey.length,
      totalKeysChecked: allKeys.length
    });
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

