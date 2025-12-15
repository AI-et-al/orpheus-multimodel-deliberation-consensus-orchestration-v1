/**
 * Orpheus Sonnet Executor
 * Anthropic Claude integration for reasoning and analysis tasks
 */

import Anthropic from '@anthropic-ai/sdk';

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

export interface SonnetConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
const DEFAULT_MAX_TOKENS = 4096;
const DEFAULT_TEMPERATURE = 0.7;

const DEFAULT_SYSTEM_PROMPT = `You are Sonnet, a reasoning and analysis assistant within the Orpheus multi-AI orchestration system.

Your role:
- Provide thoughtful, well-reasoned analysis
- Break down complex problems into clear components
- Consider multiple perspectives when relevant
- Be direct and substantive
- Support conclusions with clear reasoning

Focus on quality of thought over quantity of output.`;

export class SonnetExecutor implements Executor {
  readonly type: ExecutorType = 'sonnet';
  
  private client: Anthropic;
  private model: string;
  private maxTokens: number;
  private temperature: number;

  constructor(config: SonnetConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.model = config.model ?? DEFAULT_MODEL;
    this.maxTokens = config.maxTokens ?? DEFAULT_MAX_TOKENS;
    this.temperature = config.temperature ?? DEFAULT_TEMPERATURE;
  }

  async execute(task: Task): Promise<ExecutorResult> {
    const startTime = Date.now();

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        system: task.systemPrompt ?? DEFAULT_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: task.prompt,
          },
        ],
      });

      const durationMs = Date.now() - startTime;
      
      // Extract text content from response
      const content = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map(block => block.text)
        .join('\n');

      return {
        executor: 'sonnet',
        success: true,
        content,
        usage: {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        },
        durationMs,
      };

    } catch (err) {
      const durationMs = Date.now() - startTime;
      const errorMessage = err instanceof Error ? err.message : String(err);

      return {
        executor: 'sonnet',
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
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'ping' }],
      });
      return response.content.length > 0;
    } catch {
      return false;
    }
  }
}

export function createSonnetExecutor(config: SonnetConfig): Executor {
  return new SonnetExecutor(config);
}
