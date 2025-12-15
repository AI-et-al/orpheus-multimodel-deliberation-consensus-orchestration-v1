/**
 * Memory Store Tests
 * Verify SQLite event store functionality
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { createMemoryStore, type MemoryStore } from 'orpheus-memory';
import { unlink } from 'fs/promises';

const TEST_DB = './test-memory.db';

describe('SQLiteStore', () => {
  let store: MemoryStore & { close(): void };

  before(() => {
    store = createMemoryStore(TEST_DB) as MemoryStore & { close(): void };
  });

  after(async () => {
    store.close();
    try {
      await unlink(TEST_DB);
    } catch {
      // Ignore if file doesn't exist
    }
  });

  it('should log events and retrieve them', async () => {
    const eventId = await store.logEvent({
      type: 'task_created',
      taskId: 'test-task-1',
      payload: { prompt: 'Test prompt' },
    });

    assert.ok(eventId, 'Event ID should be returned');
    assert.strictEqual(typeof eventId, 'string');

    const events = await store.getEvents({ taskId: 'test-task-1' });
    assert.strictEqual(events.length, 1);
    assert.strictEqual(events[0].type, 'task_created');
    assert.deepStrictEqual(events[0].payload, { prompt: 'Test prompt' });
  });

  it('should retrieve task history', async () => {
    const taskId = 'test-task-history';

    await store.logEvent({
      type: 'task_created',
      taskId,
      payload: { step: 1 },
    });

    await store.logEvent({
      type: 'task_started',
      taskId,
      payload: { step: 2 },
    });

    await store.logEvent({
      type: 'task_completed',
      taskId,
      payload: { step: 3 },
    });

    const history = await store.getTaskHistory(taskId);
    assert.strictEqual(history.length, 3);
    assert.strictEqual(history[0].type, 'task_created');
    assert.strictEqual(history[1].type, 'task_started');
    assert.strictEqual(history[2].type, 'task_completed');
  });

  it('should filter events by type', async () => {
    await store.logEvent({
      type: 'system_error',
      payload: { error: 'Test error' },
    });

    const errors = await store.getEvents({ type: 'system_error' });
    assert.ok(errors.length >= 1);
    assert.ok(errors.every(e => e.type === 'system_error'));
  });

  it('should clear all events', async () => {
    await store.clear();
    const events = await store.getEvents();
    assert.strictEqual(events.length, 0);
  });
});

// Run tests
console.log('Running memory store tests...\n');
