import { getDatabase } from '../database/db.js';
import type Database from 'better-sqlite3';

export type EmailStatus = 'pending' | 'sent' | 'failed' | 'bounced';

export interface EmailLog {
  id: number;
  api_key_id: number | null;
  to_email: string;
  from_email: string;
  subject: string;
  template_id: string | null;
  status: EmailStatus;
  error_message: string | null;
  message_id: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface CreateEmailLogData {
  api_key_id?: number | null;
  to_email: string;
  from_email: string;
  subject: string;
  template_id?: string | null;
  status: EmailStatus;
  error_message?: string | null;
  message_id?: string | null;
}

export interface EmailLogQuery {
  limit?: number;
  offset?: number;
  status?: EmailStatus;
  from_date?: string;
  to_date?: string;
}

export class EmailLogModel {
  private db: Database.Database;

  constructor() {
    this.db = getDatabase();
  }

  create(data: CreateEmailLogData): EmailLog {
    const stmt = this.db.prepare(`
      INSERT INTO email_logs (api_key_id, to_email, from_email, subject, template_id, status, error_message, message_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.api_key_id || null,
      data.to_email,
      data.from_email,
      data.subject,
      data.template_id || null,
      data.status,
      data.error_message || null,
      data.message_id || null
    );

    return this.findById(result.lastInsertRowid as number)!;
  }

  findById(id: number): EmailLog | null {
    const stmt = this.db.prepare('SELECT * FROM email_logs WHERE id = ?');
    return stmt.get(id) as EmailLog | null;
  }

  findByMessageId(messageId: string): EmailLog | null {
    const stmt = this.db.prepare('SELECT * FROM email_logs WHERE message_id = ?');
    return stmt.get(messageId) as EmailLog | null;
  }

  updateStatus(id: number, status: EmailStatus, errorMessage?: string | null, messageId?: string | null): void {
    const stmt = this.db.prepare(`
      UPDATE email_logs 
      SET status = ?, error_message = ?, message_id = ?, sent_at = CASE WHEN ? = 'sent' THEN CURRENT_TIMESTAMP ELSE sent_at END
      WHERE id = ?
    `);
    stmt.run(status, errorMessage || null, messageId || null, status, id);
  }

  query(query: EmailLogQuery): { logs: EmailLog[]; total: number } {
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (query.status) {
      whereClause += ' AND status = ?';
      params.push(query.status);
    }

    if (query.from_date) {
      whereClause += ' AND created_at >= ?';
      params.push(query.from_date);
    }

    if (query.to_date) {
      whereClause += ' AND created_at <= ?';
      params.push(query.to_date);
    }

    const limit = query.limit || 50;
    const offset = query.offset || 0;

    const countStmt = this.db.prepare(`SELECT COUNT(*) as count FROM email_logs ${whereClause}`);
    const total = (countStmt.get(...params) as { count: number }).count;

    const selectStmt = this.db.prepare(`
      SELECT * FROM email_logs 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `);
    const logs = selectStmt.all(...params, limit, offset) as EmailLog[];

    return { logs, total };
  }
}

