import { getDatabase } from '../database/db.js';
import type Database from 'better-sqlite3';

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
  private db: Database.Database;

  constructor() {
    this.db = getDatabase();
  }

  create(data: CreateApiKeyData): ApiKey {
    const permissionsJson = data.permissions ? JSON.stringify(data.permissions) : null;
    
    const stmt = this.db.prepare(`
      INSERT INTO api_keys (key_hash, name, client_id, permissions, rate_limit, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.key_hash,
      data.name,
      data.client_id,
      permissionsJson,
      data.rate_limit || 100,
      data.expires_at || null
    );

    return this.findById(result.lastInsertRowid as number)!;
  }

  findByKeyHash(keyHash: string): ApiKey | null {
    const stmt = this.db.prepare('SELECT * FROM api_keys WHERE key_hash = ?');
    return stmt.get(keyHash) as ApiKey | null;
  }

  findByClientId(clientId: string): ApiKey | null {
    const stmt = this.db.prepare('SELECT * FROM api_keys WHERE client_id = ?');
    return stmt.get(clientId) as ApiKey | null;
  }

  findById(id: number): ApiKey | null {
    const stmt = this.db.prepare('SELECT * FROM api_keys WHERE id = ?');
    return stmt.get(id) as ApiKey | null;
  }

  findAll(): ApiKey[] {
    const stmt = this.db.prepare('SELECT * FROM api_keys ORDER BY created_at DESC');
    return stmt.all() as ApiKey[];
  }

  updateLastUsed(id: number): void {
    const stmt = this.db.prepare('UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?');
    stmt.run(id);
  }

  revoke(clientId: string): boolean {
    const stmt = this.db.prepare('UPDATE api_keys SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE client_id = ?');
    const result = stmt.run(clientId);
    return result.changes > 0;
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

