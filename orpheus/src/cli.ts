#!/usr/bin/env node
/**
 * Orpheus CLI
 * Multi-AI Agent Orchestration System
 *
 * Usage:
 *   npx orpheus "Your task here"
 *   npm run orpheus -- "Your task here"
 */

import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
loadEnv({ path: resolve(process.cwd(), '.env') });

import { Orpheus, FRONTIER_MODELS } from 'orpheus-core';
import { createMemoryStore } from 'orpheus-memory';
import { createCodexExecutor } from 'orpheus-executor-codex';
import { createSonnetExecutor } from 'orpheus-executor-sonnet';
import { createGeminiExecutor } from 'orpheus-executor-gemini';

interface CLIOptions {
  json: boolean;
  help: boolean;
  verbose: boolean;
}

function parseArgs(args: string[]): { prompt: string; options: CLIOptions } {
  const options: CLIOptions = {
    json: args.includes('--json'),
    help: args.includes('--help') || args.includes('-h'),
    verbose: args.includes('--verbose') || args.includes('-v'),
  };

  const prompt = args
    .filter(a => !a.startsWith('--') && !a.startsWith('-'))
    .join(' ');

  return { prompt, options };
}

function printHelp(): void {
  console.log(`
Orpheus - Multi-AI Agent Orchestration System
"Smooth like butter, hooks like the devil."

Usage:
  npx orpheus "Your task here"
  npm run orpheus -- "Your task here"

Options:
  --json      Output results as JSON
  --verbose   Show detailed execution info
  --help, -h  Show this help message

Environment Variables (set in .env):
  OPENAI_API_KEY      Enable Codex executor (GPT-4o)
  ANTHROPIC_API_KEY   Enable Sonnet executor (Claude)
  GOOGLE_AI_API_KEY   Enable Gemini executor

Current Frontier Models:
  OpenAI:    ${FRONTIER_MODELS.openai.flagship} (code), ${FRONTIER_MODELS.openai.reasoning} (reasoning)
  Anthropic: ${FRONTIER_MODELS.anthropic.execution} (execution)
  Google:    ${FRONTIER_MODELS.google.fast} (fast), ${FRONTIER_MODELS.google.flagship} (advanced)

Examples:
  npx orpheus "Write a function to check if a number is prime"
  npx orpheus "Research the latest developments in quantum computing"
  npx orpheus "Analyze the trade-offs between REST and GraphQL"
`);
}

async function main(): Promise<void> {
  const { prompt, options } = parseArgs(process.argv.slice(2));

  if (options.help || !prompt) {
    printHelp();
    process.exit(options.help ? 0 : 1);
  }

  // Initialize memory store
  const memoryPath = process.env.ORPHEUS_MEMORY_PATH ?? './orpheus.db';
  const memory = createMemoryStore(memoryPath);

  // Initialize Orpheus
  const orpheus = new Orpheus({
    logLevel: options.verbose ? 'debug' : 'info',
  });

  orpheus.useMemory(memory);

  // Register available executors based on API keys
  let executorCount = 0;

  if (process.env.OPENAI_API_KEY) {
    orpheus.useExecutor(createCodexExecutor({
      apiKey: process.env.OPENAI_API_KEY,
      model: FRONTIER_MODELS.openai.flagship,
    }));
    executorCount++;
    if (options.verbose) console.log('[CLI] Codex executor registered');
  }

  if (process.env.ANTHROPIC_API_KEY) {
    orpheus.useExecutor(createSonnetExecutor({
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: FRONTIER_MODELS.anthropic.execution,
    }));
    executorCount++;
    if (options.verbose) console.log('[CLI] Sonnet executor registered');
  }

  if (process.env.GOOGLE_AI_API_KEY) {
    orpheus.useExecutor(createGeminiExecutor({
      apiKey: process.env.GOOGLE_AI_API_KEY,
      model: FRONTIER_MODELS.google.fast,
    }));
    executorCount++;
    if (options.verbose) console.log('[CLI] Gemini executor registered');
  }

  if (executorCount === 0) {
    console.error('Error: No API keys found. Set at least one of:');
    console.error('  OPENAI_API_KEY, ANTHROPIC_API_KEY, or GOOGLE_AI_API_KEY');
    console.error('\nSee --help for more information.');
    process.exit(1);
  }

  if (options.verbose) {
    console.log(`[CLI] ${executorCount} executor(s) registered`);
    console.log(`[CLI] Memory: ${memoryPath}`);
    console.log(`[CLI] Prompt: "${prompt}"`);
    console.log('');
  }

  try {
    const { plan, results } = await orpheus.execute(prompt);

    if (options.json) {
      console.log(JSON.stringify({ plan, results }, null, 2));
    } else {
      // Human-readable output
      console.log('\n─────────────────────────────────────');
      console.log(`Strategy: ${plan.strategy}`);
      console.log('─────────────────────────────────────\n');

      for (const result of results) {
        if (result.result.success) {
          console.log(result.result.content);
        } else {
          console.error(`Error: ${result.result.error}`);
        }

        if (options.verbose && result.result.usage) {
          console.log(`\n[Tokens: ${result.result.usage.totalTokens}, Time: ${result.result.durationMs}ms]`);
        }
      }
    }

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (options.json) {
      console.log(JSON.stringify({ error: message }));
    } else {
      console.error(`Fatal error: ${message}`);
    }
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
