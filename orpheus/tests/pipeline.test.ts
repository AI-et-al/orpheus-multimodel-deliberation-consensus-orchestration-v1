/**
 * Pipeline Integration Tests
 * End-to-end test of plan → dispatch → result
 *
 * NOTE: Requires at least one valid API key to run full pipeline.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { config as loadEnv } from 'dotenv';
import { unlink } from 'fs/promises';

loadEnv();

import { Orpheus, createPlanner, FRONTIER_MODELS } from 'orpheus-core';
import { createMemoryStore, type MemoryStore } from 'orpheus-memory';
import { createCodexExecutor } from 'orpheus-executor-codex';
import { createSonnetExecutor } from 'orpheus-executor-sonnet';
import { createGeminiExecutor } from 'orpheus-executor-gemini';

const TEST_DB = './test-pipeline.db';

describe('Pipeline', () => {
  describe('Planner', () => {
    it('should create a plan from a prompt', async () => {
      const planner = createPlanner();
      const plan = await planner.createPlan('Write a hello world function');

      assert.ok(plan.id, 'Plan should have an ID');
      assert.strictEqual(plan.originalPrompt, 'Write a hello world function');
      assert.ok(plan.tasks.length > 0, 'Plan should have at least one task');
      assert.ok(plan.strategy, 'Plan should have a strategy');
    });

    it('should route code tasks to Codex', async () => {
      const planner = createPlanner();
      const plan = await planner.createPlan('Write a TypeScript function to sort an array');

      assert.strictEqual(plan.tasks[0].preferredExecutor, 'codex');
    });

    it('should route research tasks to Gemini', async () => {
      const planner = createPlanner();
      const plan = await planner.createPlan('Research the history of quantum computing');

      assert.strictEqual(plan.tasks[0].preferredExecutor, 'gemini');
    });

    it('should route general tasks to Sonnet', async () => {
      const planner = createPlanner();
      const plan = await planner.createPlan('Explain the concept of recursion');

      assert.strictEqual(plan.tasks[0].preferredExecutor, 'sonnet');
    });
  });

  describe('Full Pipeline', () => {
    let store: MemoryStore & { close(): void };
    const hasAnyKey = !!(
      process.env.OPENAI_API_KEY ||
      process.env.ANTHROPIC_API_KEY ||
      process.env.GOOGLE_AI_API_KEY
    );

    before(() => {
      store = createMemoryStore(TEST_DB) as MemoryStore & { close(): void };
    });

    after(async () => {
      store.close();
      try {
        await unlink(TEST_DB);
      } catch {
        // Ignore
      }
    });

    it('should execute a prompt through the full pipeline', { skip: !hasAnyKey }, async () => {
      const orpheus = new Orpheus({ logLevel: 'warn' });
      orpheus.useMemory(store);

      // Register available executors
      if (process.env.OPENAI_API_KEY) {
        orpheus.useExecutor(createCodexExecutor({
          apiKey: process.env.OPENAI_API_KEY,
          model: FRONTIER_MODELS.openai.flagship,
        }));
      }

      if (process.env.ANTHROPIC_API_KEY) {
        orpheus.useExecutor(createSonnetExecutor({
          apiKey: process.env.ANTHROPIC_API_KEY,
          model: FRONTIER_MODELS.anthropic.execution,
        }));
      }

      if (process.env.GOOGLE_AI_API_KEY) {
        orpheus.useExecutor(createGeminiExecutor({
          apiKey: process.env.GOOGLE_AI_API_KEY,
          model: FRONTIER_MODELS.google.fast,
        }));
      }

      const { plan, results } = await orpheus.execute('Say "hello" in one word');

      assert.ok(plan, 'Should return a plan');
      assert.ok(results.length > 0, 'Should return results');
      assert.strictEqual(results[0].result.success, true, 'First result should succeed');
      assert.ok(results[0].result.content.toLowerCase().includes('hello'), 'Response should contain hello');
    });

    it('should log events to memory', { skip: !hasAnyKey }, async () => {
      // Events from previous test should be logged
      const events = await store.getEvents();
      assert.ok(events.length > 0, 'Should have logged events');

      const taskEvents = events.filter(e => e.taskId);
      assert.ok(taskEvents.length > 0, 'Should have task-related events');
    });
  });
});

console.log('Running pipeline tests...\n');
