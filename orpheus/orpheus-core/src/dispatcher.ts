/**
 * Orpheus Dispatcher
 * Routes tasks to executors, handles failures and retries
 */

import type {
  Task,
  Executor,
  ExecutorType,
  ExecutorResult,
  MemoryStore,
  DispatchResult,
} from './types.js';

export interface DispatcherOptions {
  retryAttempts: number;
  retryDelayMs: number;
}

export class Dispatcher {
  private executors: Map<ExecutorType, Executor>;
  private memory: MemoryStore;
  private options: DispatcherOptions;

  constructor(
    executors: Map<ExecutorType, Executor>,
    memory: MemoryStore,
    options?: Partial<DispatcherOptions>
  ) {
    this.executors = executors;
    this.memory = memory;
    this.options = {
      retryAttempts: options?.retryAttempts ?? 3,
      retryDelayMs: options?.retryDelayMs ?? 1000,
    };
  }

  /**
   * Dispatch a task to its preferred executor with fallback
   */
  async dispatch(task: Task): Promise<DispatchResult> {
    // Update task status
    task.status = 'running';
    task.updatedAt = new Date();

    await this.memory.logEvent({
      type: 'task_started',
      taskId: task.id,
      payload: { prompt: task.prompt.slice(0, 100) },
    });

    // Build executor priority list
    const executorOrder = this.getExecutorOrder(task);
    let lastError: string | undefined;
    let attempts = 0;

    for (const executorType of executorOrder) {
      const executor = this.executors.get(executorType);
      
      if (!executor) {
        console.warn(`Executor '${executorType}' not registered, skipping`);
        continue;
      }

      // Check availability
      const available = await executor.isAvailable().catch(() => false);
      if (!available) {
        console.warn(`Executor '${executorType}' not available, skipping`);
        continue;
      }

      // Attempt execution with retries
      for (let attempt = 1; attempt <= this.options.retryAttempts; attempt++) {
        attempts++;

        await this.memory.logEvent({
          type: 'executor_called',
          taskId: task.id,
          executorType,
          payload: { attempt },
        });

        try {
          const result = await executor.execute(task);

          await this.memory.logEvent({
            type: 'executor_responded',
            taskId: task.id,
            executorType,
            payload: { 
              success: result.success,
              durationMs: result.durationMs,
              usage: result.usage,
            },
          });

          if (result.success) {
            task.status = 'completed';
            task.updatedAt = new Date();

            await this.memory.logEvent({
              type: 'task_completed',
              taskId: task.id,
              payload: { executorType, attempts },
            });

            return { task, result, attempts };
          }

          lastError = result.error;
        } catch (err) {
          lastError = err instanceof Error ? err.message : String(err);
          console.error(`Attempt ${attempt} failed for ${executorType}:`, lastError);
        }

        // Delay before retry (unless last attempt)
        if (attempt < this.options.retryAttempts) {
          await this.delay(this.options.retryDelayMs * attempt);
        }
      }
    }

    // All executors failed
    task.status = 'failed';
    task.updatedAt = new Date();

    const failureResult: ExecutorResult = {
      executor: task.preferredExecutor ?? 'sonnet',
      success: false,
      content: '',
      error: lastError ?? 'All executors failed',
      durationMs: 0,
    };

    await this.memory.logEvent({
      type: 'task_failed',
      taskId: task.id,
      payload: { error: failureResult.error, attempts },
    });

    return { task, result: failureResult, attempts };
  }

  /**
   * Dispatch multiple tasks (sequential or parallel based on config)
   */
  async dispatchAll(
    tasks: Task[], 
    parallel: boolean = false
  ): Promise<DispatchResult[]> {
    if (parallel) {
      return Promise.all(tasks.map(t => this.dispatch(t)));
    }

    const results: DispatchResult[] = [];
    for (const task of tasks) {
      results.push(await this.dispatch(task));
    }
    return results;
  }

  /**
   * Register an executor at runtime
   */
  registerExecutor(executor: Executor): void {
    this.executors.set(executor.type, executor);
  }

  /**
   * Get registered executor types
   */
  getRegisteredExecutors(): ExecutorType[] {
    return Array.from(this.executors.keys());
  }

  private getExecutorOrder(task: Task): ExecutorType[] {
    if (task.fallbackExecutors && task.fallbackExecutors.length > 0) {
      return task.fallbackExecutors;
    }
    if (task.preferredExecutor) {
      return [task.preferredExecutor];
    }
    return Array.from(this.executors.keys());
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export function createDispatcher(
  executors: Map<ExecutorType, Executor>,
  memory: MemoryStore,
  options?: Partial<DispatcherOptions>
): Dispatcher {
  return new Dispatcher(executors, memory, options);
}
