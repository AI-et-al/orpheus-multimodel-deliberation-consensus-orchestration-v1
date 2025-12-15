/**
 * Orpheus Planner
 * Task decomposition and prompt synthesis
 */

import { randomUUID } from 'crypto';
import type { 
  Task, 
  Plan, 
  PlannerConfig, 
  TaskPriority,
  ExecutorType 
} from './types.js';

export class Planner {
  private config: PlannerConfig;

  constructor(config: PlannerConfig) {
    this.config = config;
  }

  /**
   * Analyze a prompt and create an execution plan
   * 
   * For now, this creates a single-task plan.
   * Future: LLM-driven decomposition into subtasks.
   */
  async createPlan(prompt: string): Promise<Plan> {
    const planId = randomUUID();
    const now = new Date();

    // Analyze the prompt to determine executor routing
    const analysis = this.analyzePrompt(prompt);

    const task = this.createTask({
      prompt,
      preferredExecutor: analysis.recommendedExecutor,
      priority: analysis.priority,
    });

    return {
      id: planId,
      originalPrompt: prompt,
      tasks: [task],
      strategy: analysis.strategy,
      createdAt: now,
    };
  }

  /**
   * Create a task with defaults
   */
  createTask(params: {
    prompt: string;
    systemPrompt?: string;
    preferredExecutor?: ExecutorType;
    priority?: TaskPriority;
    parentId?: string;
    metadata?: Record<string, unknown>;
  }): Task {
    const now = new Date();
    
    return {
      id: randomUUID(),
      prompt: params.prompt,
      systemPrompt: params.systemPrompt,
      preferredExecutor: params.preferredExecutor ?? this.config.defaultExecutor,
      fallbackExecutors: this.getFallbackOrder(params.preferredExecutor),
      priority: params.priority ?? 'normal',
      status: 'pending',
      parentId: params.parentId,
      metadata: params.metadata,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Analyze prompt to determine routing and priority
   * 
   * Simple heuristics for now. Future: use an LLM for this.
   */
  private analyzePrompt(prompt: string): {
    recommendedExecutor: ExecutorType;
    priority: TaskPriority;
    strategy: string;
  } {
    const lower = prompt.toLowerCase();

    // Code-related tasks → Codex
    if (this.matchesPatterns(lower, [
      'code', 'function', 'class', 'implement', 'debug', 'refactor',
      'typescript', 'javascript', 'python', 'rust', 'script',
      'api', 'endpoint', 'database', 'sql', 'query'
    ])) {
      return {
        recommendedExecutor: 'codex',
        priority: 'normal',
        strategy: 'Code generation task routed to Codex',
      };
    }

    // Research/multimodal → Gemini
    if (this.matchesPatterns(lower, [
      'research', 'analyze image', 'compare', 'summarize document',
      'multimodal', 'vision', 'video', 'search'
    ])) {
      return {
        recommendedExecutor: 'gemini',
        priority: 'normal',
        strategy: 'Research/multimodal task routed to Gemini',
      };
    }

    // Default: reasoning tasks → Sonnet
    return {
      recommendedExecutor: 'sonnet',
      priority: 'normal',
      strategy: 'General reasoning task routed to Sonnet',
    };
  }

  private matchesPatterns(text: string, patterns: string[]): boolean {
    return patterns.some(p => text.includes(p));
  }

  private getFallbackOrder(preferred?: ExecutorType): ExecutorType[] {
    const all: ExecutorType[] = ['sonnet', 'codex', 'gemini'];
    if (!preferred) return all;
    return [preferred, ...all.filter(e => e !== preferred)];
  }
}

export function createPlanner(config?: Partial<PlannerConfig>): Planner {
  const defaults: PlannerConfig = {
    maxSubtasks: 10,
    defaultExecutor: 'sonnet',
    parallelExecution: false,
  };
  
  return new Planner({ ...defaults, ...config });
}
