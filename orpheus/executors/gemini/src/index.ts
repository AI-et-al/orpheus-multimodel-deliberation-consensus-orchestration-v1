/**
 * Orpheus Gemini Executor
 * Google Gemini integration for multimodal and research tasks
 * 
 * NOTE: This executor is scaffolded for Gemini 2.0/2.5.
 * When Gemini 3.0 releases, update the model constant.
 */

import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

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

export interface GeminiConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

// Gemini 2.0 Flash is the current recommended model
// Update to 'gemini-3.0-...' when available
const DEFAULT_MODEL = 'gemini-2.0-flash-exp';
const DEFAULT_MAX_TOKENS = 4096;
const DEFAULT_TEMPERATURE = 0.7;

const DEFAULT_SYSTEM_PROMPT = `You are Gemini, a research and multimodal assistant within the Orpheus multi-AI orchestration system.

Your role:
- Conduct thorough research and analysis
- Process and interpret multimodal inputs when provided
- Synthesize information from multiple sources
- Provide well-sourced, accurate information
- Handle complex, open-ended queries

Focus on breadth and accuracy of information.`;

export class GeminiExecutor implements Executor {
  readonly type: ExecutorType = 'gemini';
  
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;
  private maxTokens: number;
  private temperature: number;
  private systemPrompt: string;

  constructor(config: GeminiConfig) {
    this.genAI = new GoogleGenerativeAI(config.apiKey);
    this.maxTokens = config.maxTokens ?? DEFAULT_MAX_TOKENS;
    this.temperature = config.temperature ?? DEFAULT_TEMPERATURE;
    this.systemPrompt = DEFAULT_SYSTEM_PROMPT;
    
    // Initialize model with generation config
    this.model = this.genAI.getGenerativeModel({
      model: config.model ?? DEFAULT_MODEL,
      generationConfig: {
        maxOutputTokens: this.maxTokens,
        temperature: this.temperature,
      },
    });
  }

  async execute(task: Task): Promise<ExecutorResult> {
    const startTime = Date.now();

    try {
      // Combine system prompt with user prompt
      // Gemini doesn't have a separate system message, so we prepend it
      const fullPrompt = task.systemPrompt 
        ? `${task.systemPrompt}\n\n---\n\n${task.prompt}`
        : `${this.systemPrompt}\n\n---\n\n${task.prompt}`;

      const result = await this.model.generateContent(fullPrompt);
      const response = result.response;
      const durationMs = Date.now() - startTime;

      const content = response.text();

      // Gemini's usage metadata access
      const usageMetadata = response.usageMetadata;
      const usage = usageMetadata ? {
        promptTokens: usageMetadata.promptTokenCount ?? 0,
        completionTokens: usageMetadata.candidatesTokenCount ?? 0,
        totalTokens: usageMetadata.totalTokenCount ?? 0,
      } : undefined;

      return {
        executor: 'gemini',
        success: true,
        content,
        usage,
        durationMs,
      };

    } catch (err) {
      const durationMs = Date.now() - startTime;
      const errorMessage = err instanceof Error ? err.message : String(err);

      return {
        executor: 'gemini',
        success: false,
        content: '',
        error: errorMessage,
        durationMs,
      };
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const result = await this.model.generateContent('ping');
      return result.response.text().length > 0;
    } catch {
      return false;
    }
  }
}

export function createGeminiExecutor(config: GeminiConfig): Executor {
  return new GeminiExecutor(config);
}
