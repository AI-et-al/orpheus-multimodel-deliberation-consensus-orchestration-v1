/**
 * Orpheus Codex Executor
 * OpenAI GPT/Codex integration for code generation tasks
 */

import OpenAI from 'openai';

// Types inlined to avoid workspace dependency issues during initial setup
export type ExecutorType = 'codex' | 'sonnet' | 'gemini';
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed';
export type TaskPriority = 'low' | 'normal' | 'high' | 'critical';

export interface Task {
  id: string;
  prompt: string;
  systemPrompt?: string;
  preferredExecutor?: ExecutorType;
  fallbackExecutors?: ExecutorType[];
  priority: TaskPriority;
  status: TaskStatus;
  parentId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExecutorResult {
  executor: ExecutorType;
  success: boolean;
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  error?: string;
  durationMs: number;
}

export interface Executor {
  type: ExecutorType;
  execute(task: Task): Promise<ExecutorResult>;
  isAvailable(): Promise<boolean>;
}

export interface CodexConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

const DEFAULT_MODEL = 'gpt-4o';  // Or 'gpt-4-turbo' for cost efficiency
const DEFAULT_MAX_TOKENS = 4096;
const DEFAULT_TEMPERATURE = 0.7;

const DEFAULT_SYSTEM_PROMPT = `You are Codex, an expert code generation assistant within the Orpheus multi-AI orchestration system.

Your role:
- Generate clean, efficient, well-documented code
- Follow best practices for the target language
- Provide working implementations, not pseudocode
- Include error handling where appropriate
- Be concise but complete

When asked to implement something, output the code directly.`;

export class CodexExecutor implements Executor {
  readonly type: ExecutorType = 'codex';
  
  private client: OpenAI;
  private model: string;
  private maxTokens: number;
  private temperature: number;

  constructor(config: CodexConfig) {
    this.client = new OpenAI({ apiKey: config.apiKey });
    this.model = config.model ?? DEFAULT_MODEL;
    this.maxTokens = config.maxTokens ?? DEFAULT_MAX_TOKENS;
    this.temperature = config.temperature ?? DEFAULT_TEMPERATURE;
  }

  async execute(task: Task): Promise<ExecutorResult> {
    const startTime = Date.now();

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        messages: [
          {
            role: 'system',
            content: task.systemPrompt ?? DEFAULT_SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: task.prompt,
          },
        ],
      });

      const durationMs = Date.now() - startTime;
      const choice = response.choices[0];
      const content = choice?.message?.content ?? '';

      return {
        executor: 'codex',
        success: true,
        content,
        usage: response.usage ? {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        } : undefined,
        durationMs,
      };

    } catch (err) {
      const durationMs = Date.now() - startTime;
      const errorMessage = err instanceof Error ? err.message : String(err);

      return {
        executor: 'codex',
        success: false,
        content: '',
        error: errorMessage,
        durationMs,
      };
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Quick API check with minimal tokens
      const response = await this.client.chat.completions.create({
        model: this.model,
        max_tokens: 5,
        messages: [{ role: 'user', content: 'ping' }],
      });
      return response.choices.length > 0;
    } catch {
      return false;
    }
  }
}

export function createCodexExecutor(config: CodexConfig): Executor {
  return new CodexExecutor(config);
}
