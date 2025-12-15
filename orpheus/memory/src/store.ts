/**
 * Orpheus Memory - SQLite Store
 * Event logging and state persistence
 */

import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';

// Types inlined to avoid circular dependency with orpheus-core
// These mirror the types in orpheus-core/src/types.ts

export type EventType = 
  | 'task_created'
  | 'task_started'
  | 'task_completed'
  | 'task_failed'
  | 'executor_called'
  | 'executor_responded'
  | 'plan_created'
  | 'system_error';

export type ExecutorType = 'codex' | 'sonnet' | 'gemini';

export interface MemoryEvent {
  id: string;
  type: EventType;
  timestamp: Date;
  taskId?: string;
  executorType?: ExecutorType;
  payload: Record<string, unknown>;
}

export interface MemoryStore {
  logEvent(event: Omit<MemoryEvent, 'id' | 'timestamp'>): Promise<string>;
  getEvents(filter?: Partial<MemoryEvent>): Promise<MemoryEvent[]>;
  getTaskHistory(taskId: string): Promise<MemoryEvent[]>;
  clear(): Promise<void>;
  close(): void;
}

interface EventRow {
  id: string;
  type: string;
  timestamp: string;
  task_id: string | null;
  executor_type: string | null;
  payload: string;
}

export class SQLiteStore implements MemoryStore {
  private db: Database.Database;

  constructor(dbPath: string = ':memory:') {
    this.db = new Database(dbPath);
    this.initialize();
  }

  private initialize(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        task_id TEXT,
        executor_type TEXT,
        payload TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
      CREATE INDEX IF NOT EXISTS idx_events_task_id ON events(task_id);
      CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
    `);
  }

  async logEvent(event: Omit<MemoryEvent, 'id' | 'timestamp'>): Promise<string> {
    const id = randomUUID();
    const timestamp = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO events (id, type, timestamp, task_id, executor_type, payload)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      event.type,
      timestamp,
      event.taskId ?? null,
      event.executorType ?? null,
      JSON.stringify(event.payload)
    );

    return id;
  }

  async getEvents(filter?: Partial<MemoryEvent>): Promise<MemoryEvent[]> {
    let sql = 'SELECT * FROM events WHERE 1=1';
    const params: unknown[] = [];

    if (filter?.type) {
      sql += ' AND type = ?';
      params.push(filter.type);
    }

    if (filter?.taskId) {
      sql += ' AND task_id = ?';
      params.push(filter.taskId);
    }

    if (filter?.executorType) {
      sql += ' AND executor_type = ?';
      params.push(filter.executorType);
    }

    sql += ' ORDER BY timestamp ASC';

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as EventRow[];

    return rows.map(this.rowToEvent);
  }

  async getTaskHistory(taskId: string): Promise<MemoryEvent[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM events 
      WHERE task_id = ? 
      ORDER BY timestamp ASC
    `);

    const rows = stmt.all(taskId) as EventRow[];
    return rows.map(this.rowToEvent);
  }

  async clear(): Promise<void> {
    this.db.exec('DELETE FROM events');
  }

  close(): void {
    this.db.close();
  }

  /**
   * Get event count (for debugging/stats)
   */
  getEventCount(): number {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM events');
    const result = stmt.get() as { count: number };
    return result.count;
  }

  /**
   * Get recent events
   */
  async getRecentEvents(limit: number = 10): Promise<MemoryEvent[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM events 
      ORDER BY timestamp DESC 
      LIMIT ?
    `);

    const rows = stmt.all(limit) as EventRow[];
    return rows.map(this.rowToEvent).reverse();
  }

  private rowToEvent(row: EventRow): MemoryEvent {
    return {
      id: row.id,
      type: row.type as EventType,
      timestamp: new Date(row.timestamp),
      taskId: row.task_id ?? undefined,
      executorType: row.executor_type as ExecutorType | undefined,
      payload: JSON.parse(row.payload),
    };
  }
}

export function createMemoryStore(dbPath?: string): MemoryStore {
  return new SQLiteStore(dbPath);
}
