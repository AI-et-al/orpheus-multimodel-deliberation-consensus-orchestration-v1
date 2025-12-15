/**
 * Orpheus Core
 * Multi-AI Agent Orchestration System
 * 
 * "Smooth like butter, hooks like the devil."
 */

import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';

// Load environment from root
loadEnv({ path: resolve(process.cwd(), '.env') });

// Re-export types
export * from './types.js';

// Re-export modules
export { Planner, createPlanner } from './planner.js';
export { Dispatcher, createDispatcher } from './dispatcher.js';
export { FRONTIER_MODELS, getModel } from './models.js';

import { createPlanner } from './planner.js';
import { createDispatcher } from './dispatcher.js';
import type { 
  OrpheusConfig, 
  Executor, 
  ExecutorType,
  MemoryStore,
  Plan,
  DispatchResult,
} from './types.js';

/**
 * Main Orpheus orchestrator
 */
export class Orpheus {
  private config: OrpheusConfig;
  private planner: ReturnType<typeof createPlanner>;
  private dispatcher: ReturnType<typeof createDispatcher> | null = null;
  private executors: Map<ExecutorType, Executor> = new Map();
  private memory: MemoryStore | null = null;

  constructor(config: Partial<OrpheusConfig> = {}) {
    this.config = {
      openaiApiKey: config.openaiApiKey ?? process.env.OPENAI_API_KEY,
      anthropicApiKey: config.anthropicApiKey ?? process.env.ANTHROPIC_API_KEY,
      googleApiKey: config.googleApiKey ?? process.env.GOOGLE_AI_API_KEY,
      memoryPath: config.memoryPath ?? process.env.ORPHEUS_MEMORY_PATH ?? './orpheus.db',
      logLevel: config.logLevel ?? (process.env.ORPHEUS_LOG_LEVEL as OrpheusConfig['logLevel']) ?? 'info',
      planner: config.planner ?? {
        maxSubtasks: 10,
        defaultExecutor: 'sonnet',
        parallelExecution: false,
      },
    };

    this.planner = createPlanner(this.config.planner);
    this.log('info', 'Orpheus initialized');
  }

  /**
   * Register a memory store
   */
  useMemory(memory: MemoryStore): this {
    this.memory = memory;
    this.rebuildDispatcher();
    this.log('info', 'Memory store registered');
    return this;
  }

  /**
   * Register an executor
   */
  useExecutor(executor: Executor): this {
    this.executors.set(executor.type, executor);
    this.rebuildDispatcher();
    this.log('info', `Executor registered: ${executor.type}`);
    return this;
  }

  /**
   * Execute a prompt through the full pipeline
   */
  async execute(prompt: string): Promise<{
    plan: Plan;
    results: DispatchResult[];
  }> {
    if (!this.dispatcher) {
      throw new Error('Orpheus not ready: register memory and at least one executor');
    }

    this.log('info', `Executing: "${prompt.slice(0, 50)}..."`);

    // Create plan
    const plan = await this.planner.createPlan(prompt);
    this.log('debug', `Plan created: ${plan.tasks.length} task(s), strategy: ${plan.strategy}`);

    // Dispatch tasks
    const results = await this.dispatcher.dispatchAll(
      plan.tasks,
      this.config.planner.parallelExecution
    );

    // Log results summary
    const succeeded = results.filter(r => r.result.success).length;
    this.log('info', `Completed: ${succeeded}/${results.length} tasks succeeded`);

    return { plan, results };
  }

  /**
   * Get configuration (for debugging)
   */
  getConfig(): Readonly<OrpheusConfig> {
    // Return copy without API keys
    return {
      ...this.config,
      openaiApiKey: this.config.openaiApiKey ? '[REDACTED]' : undefined,
      anthropicApiKey: this.config.anthropicApiKey ? '[REDACTED]' : undefined,
      googleApiKey: this.config.googleApiKey ? '[REDACTED]' : undefined,
    };
  }

  /**
   * Check which executors are ready
   */
  async checkExecutors(): Promise<Record<ExecutorType, boolean>> {
    const status: Record<string, boolean> = {};
    
    for (const [type, executor] of this.executors) {
      status[type] = await executor.isAvailable().catch(() => false);
    }

    return status as Record<ExecutorType, boolean>;
  }

  private rebuildDispatcher(): void {
    if (this.memory && this.executors.size > 0) {
      this.dispatcher = createDispatcher(this.executors, this.memory);
    }
  }

  private log(level: OrpheusConfig['logLevel'], message: string): void {
    const levels = ['debug', 'info', 'warn', 'error'];
    const configLevel = levels.indexOf(this.config.logLevel);
    const msgLevel = levels.indexOf(level);

    if (msgLevel >= configLevel) {
      const prefix = `[Orpheus:${level.toUpperCase()}]`;
      console.log(`${prefix} ${message}`);
    }
  }
}

/**
 * CLI entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
Orpheus - Multi-AI Agent Orchestration System

Usage:
  npx orpheus-core "Your task here"
  
Options:
  --json    Output results as JSON
  --help    Show this help

Orpheus requires executors and memory to be configured.
See README.md for setup instructions.
`);
    process.exit(0);
  }

  const prompt = args.filter(a => !a.startsWith('--')).join(' ');
  const jsonOutput = args.includes('--json');

  if (!prompt) {
    console.error('Error: No prompt provided');
    process.exit(1);
  }

  // Initialize Orpheus
  const orpheus = new Orpheus();

  // Note: In actual use, you'd register executors and memory here
  // This CLI is a stub - the real entry point will be the root package

  console.log('Orpheus core initialized.');
  console.log('Prompt:', prompt);
  console.log('');
  console.log('To execute tasks, register executors via the programmatic API.');
  console.log('See: npm run orpheus (from root package)');
}

// Run CLI if executed directly
const isMainModule = process.argv[1]?.includes('orpheus-core');
if (isMainModule) {
  main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
