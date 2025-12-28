import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

class JsonStorage<T extends { id: number }> {
  private filePath: string;
  private data: T[] = [];
  private nextId: number = 1;

  constructor(fileName: string) {
    // Use the database path directly as the directory
    this.filePath = join(config.database.path, `${fileName}.json`);
    logger.info(`Initializing JSON storage for ${fileName}`, {
      filePath: this.filePath,
      databasePath: config.database.path
    });
    this.load();
  }

  private load(): void {
    try {
      const fileExists = existsSync(this.filePath);
      logger.debug(`Loading JSON storage`, {
        filePath: this.filePath,
        exists: fileExists
      });
      
      if (fileExists) {
        const content = readFileSync(this.filePath, 'utf-8');
        this.data = JSON.parse(content);
        logger.info(`Loaded ${this.data.length} items from ${this.filePath}`);
        // Find the highest ID to set nextId
        if (this.data.length > 0) {
          this.nextId = Math.max(...this.data.map(item => item.id)) + 1;
        }
      } else {
        // Ensure directory exists
        const dbDir = dirname(this.filePath);
        mkdirSync(dbDir, { recursive: true });
        logger.info(`Created new storage file at ${this.filePath}`);
        this.data = [];
        this.save();
      }
    } catch (error: any) {
      logger.error(`Error loading JSON storage from ${this.filePath}`, { 
        error: error.message,
        stack: error.stack
      });
      this.data = [];
      this.save();
    }
  }

  private save(): void {
    try {
      writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (error) {
      logger.error(`Error saving JSON storage to ${this.filePath}`, { error });
      throw error;
    }
  }

  create(item: Partial<T> & { id?: number }): T {
    const now = new Date().toISOString();
    const newItem = {
      ...item,
      id: item.id || this.nextId++,
      created_at: (item as any).created_at || now,
      updated_at: now,
    } as unknown as T;

    this.data.push(newItem);
    this.save();
    return newItem;
  }

  findById(id: number): T | null {
    return this.data.find(item => item.id === id) || null;
  }

  findAll(): T[] {
    logger.debug(`findAll() called, returning ${this.data.length} items`, {
      filePath: this.filePath
    });
    return [...this.data];
  }

  findBy(field: keyof T, value: any): T | null {
    return this.data.find(item => item[field] === value) || null;
  }

  findAllBy(field: keyof T, value: any): T[] {
    return this.data.filter(item => item[field] === value);
  }

  update(id: number, updates: Partial<T>): boolean {
    const index = this.data.findIndex(item => item.id === id);
    if (index === -1) {
      return false;
    }

    this.data[index] = {
      ...this.data[index],
      ...updates,
      updated_at: new Date().toISOString(),
    } as T;
    this.save();
    return true;
  }

  delete(id: number): boolean {
    const index = this.data.findIndex(item => item.id === id);
    if (index === -1) {
      return false;
    }
    this.data.splice(index, 1);
    this.save();
    return true;
  }

  query(filter: (item: T) => boolean, sort?: (a: T, b: T) => number, limit?: number, offset?: number): T[] {
    let results = this.data.filter(filter);
    
    if (sort) {
      results.sort(sort);
    }
    
    if (offset) {
      results = results.slice(offset);
    }
    
    if (limit) {
      results = results.slice(0, limit);
    }
    
    return results;
  }

  count(filter?: (item: T) => boolean): number {
    if (filter) {
      return this.data.filter(filter).length;
    }
    return this.data.length;
  }

  // Reload data from disk (useful if file was modified externally)
  reload(): void {
    logger.info(`Reloading storage from ${this.filePath}`);
    this.load();
  }
}

// Singleton instances to ensure data consistency
let apiKeysStorageInstance: JsonStorage<any> | null = null;
let emailLogsStorageInstance: JsonStorage<any> | null = null;

export function getApiKeysStorage(): JsonStorage<any> {
  if (!apiKeysStorageInstance) {
    apiKeysStorageInstance = new JsonStorage<any>('api_keys');
  }
  return apiKeysStorageInstance;
}

export function getEmailLogsStorage(): JsonStorage<any> {
  if (!emailLogsStorageInstance) {
    emailLogsStorageInstance = new JsonStorage<any>('email_logs');
  }
  return emailLogsStorageInstance;
}

export function initializeStorage(): void {
  // Initialize storage files
  getApiKeysStorage();
  getEmailLogsStorage();
  logger.info('JSON storage initialized');
}

