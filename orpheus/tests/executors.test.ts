/**
 * Executor Availability Tests
 * Verify each executor can connect to its API
 *
 * NOTE: These tests require valid API keys to pass.
 * Set OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_AI_API_KEY in environment.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { config as loadEnv } from 'dotenv';

loadEnv();

import { createCodexExecutor } from 'orpheus-executor-codex';
import { createSonnetExecutor } from 'orpheus-executor-sonnet';
import { createGeminiExecutor } from 'orpheus-executor-gemini';
import { FRONTIER_MODELS } from 'orpheus-core';

describe('Executors', () => {
  describe('Codex (OpenAI)', () => {
    const apiKey = process.env.OPENAI_API_KEY;

    it('should be skipped without API key', { skip: !apiKey }, async () => {
      const executor = createCodexExecutor({
        apiKey: apiKey!,
        model: FRONTIER_MODELS.openai.flagship,
      });

      const available = await executor.isAvailable();
      assert.strictEqual(available, true, 'Codex should be available');
    });

    it('should report correct type', { skip: !apiKey }, () => {
      const executor = createCodexExecutor({
        apiKey: apiKey!,
      });

      assert.strictEqual(executor.type, 'codex');
    });
  });

  describe('Sonnet (Anthropic)', () => {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    it('should be skipped without API key', { skip: !apiKey }, async () => {
      const executor = createSonnetExecutor({
        apiKey: apiKey!,
        model: FRONTIER_MODELS.anthropic.execution,
      });

      const available = await executor.isAvailable();
      assert.strictEqual(available, true, 'Sonnet should be available');
    });

    it('should report correct type', { skip: !apiKey }, () => {
      const executor = createSonnetExecutor({
        apiKey: apiKey!,
      });

      assert.strictEqual(executor.type, 'sonnet');
    });
  });

  describe('Gemini (Google)', () => {
    const apiKey = process.env.GOOGLE_AI_API_KEY;

    it('should be skipped without API key', { skip: !apiKey }, async () => {
      const executor = createGeminiExecutor({
        apiKey: apiKey!,
        model: FRONTIER_MODELS.google.fast,
      });

      const available = await executor.isAvailable();
      assert.strictEqual(available, true, 'Gemini should be available');
    });

    it('should report correct type', { skip: !apiKey }, () => {
      const executor = createGeminiExecutor({
        apiKey: apiKey!,
      });

      assert.strictEqual(executor.type, 'gemini');
    });
  });
});

console.log('Running executor tests...\n');
console.log('Note: Tests requiring API keys will be skipped if keys are not set.\n');
