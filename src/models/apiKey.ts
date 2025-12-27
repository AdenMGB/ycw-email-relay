import { getApiKeysStorage } from '../database/jsonStorage.js';

export interface ApiKey {
  id: number;
  key_hash: string;
  name: string;
  client_id: string;
  permissions: string | null;
  rate_limit: number;
  is_active: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateApiKeyData {
  key_hash: string;
  name: string;
  client_id: string;
  permissions?: string[];
  rate_limit?: number;
  expires_at?: string | null;
}

export interface ApiKeyPublic {
  client_id: string;
  name: string;
  permissions: string[];
  rate_limit: number;
  is_active: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export class ApiKeyModel {
  private storage = getApiKeysStorage();

  create(data: CreateApiKeyData): ApiKey {
    const permissionsJson = data.permissions ? JSON.stringify(data.permissions) : null;
    
    const apiKey: ApiKey = this.storage.create({
      key_hash: data.key_hash,
      name: data.name,
      client_id: data.client_id,
      permissions: permissionsJson,
      rate_limit: data.rate_limit || 100,
      expires_at: data.expires_at || null,
      is_active: true,
      last_used_at: null,
    } as any);

    return apiKey;
  }

  findByKeyHash(keyHash: string): ApiKey | null {
    return this.storage.findBy('key_hash', keyHash) as ApiKey | null;
  }

  findByClientId(clientId: string): ApiKey | null {
    return this.storage.findBy('client_id', clientId) as ApiKey | null;
  }

  findById(id: number): ApiKey | null {
    return this.storage.findById(id) as ApiKey | null;
  }

  findAll(): ApiKey[] {
    return this.storage.findAll().sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ) as ApiKey[];
  }

  updateLastUsed(id: number): void {
    this.storage.update(id, {
      last_used_at: new Date().toISOString(),
    } as any);
  }

  revoke(clientId: string): boolean {
    const apiKey = this.findByClientId(clientId);
    if (!apiKey) {
      return false;
    }
    return this.storage.update(apiKey.id, {
      is_active: false,
    } as any);
  }

  toPublic(apiKey: ApiKey): ApiKeyPublic {
    return {
      client_id: apiKey.client_id,
      name: apiKey.name,
      permissions: apiKey.permissions ? JSON.parse(apiKey.permissions) : [],
      rate_limit: apiKey.rate_limit,
      is_active: Boolean(apiKey.is_active),
      last_used_at: apiKey.last_used_at,
      expires_at: apiKey.expires_at,
      created_at: apiKey.created_at,
    };
  }
}
