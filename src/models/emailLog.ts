import { getEmailLogsStorage } from '../database/jsonStorage.js';

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
  private storage = getEmailLogsStorage();

  create(data: CreateEmailLogData): EmailLog {
    const emailLog: EmailLog = this.storage.create({
      api_key_id: data.api_key_id || null,
      to_email: data.to_email,
      from_email: data.from_email,
      subject: data.subject,
      template_id: data.template_id || null,
      status: data.status,
      error_message: data.error_message || null,
      message_id: data.message_id || null,
      sent_at: null,
    } as any);

    return emailLog;
  }

  findById(id: number): EmailLog | null {
    return this.storage.findById(id) as EmailLog | null;
  }

  findByMessageId(messageId: string): EmailLog | null {
    return this.storage.findBy('message_id', messageId) as EmailLog | null;
  }

  updateStatus(id: number, status: EmailStatus, errorMessage?: string | null, messageId?: string | null): void {
    const updates: any = {
      status,
      error_message: errorMessage || null,
      message_id: messageId || null,
    };

    if (status === 'sent') {
      updates.sent_at = new Date().toISOString();
    }

    this.storage.update(id, updates);
  }

  query(query: EmailLogQuery): { logs: EmailLog[]; total: number } {
    const filter = (log: EmailLog) => {
      if (query.status && log.status !== query.status) {
        return false;
      }
      if (query.from_date && log.created_at < query.from_date) {
        return false;
      }
      if (query.to_date && log.created_at > query.to_date) {
        return false;
      }
      return true;
    };

    const sort = (a: EmailLog, b: EmailLog) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime();

    const total = this.storage.count(filter);
    const logs = this.storage.query(
      filter,
      sort,
      query.limit || 50,
      query.offset || 0
    ) as EmailLog[];

    return { logs, total };
  }
}
