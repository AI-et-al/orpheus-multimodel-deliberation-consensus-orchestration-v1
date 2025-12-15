/**
 * Orpheus Core Types
 * Shared interfaces across all modules
 */

// ============================================
// Executor Types
// ============================================

export type ExecutorType = 'codex' | 'sonnet' | 'gemini';

export interface ExecutorConfig {
  type: ExecutorType;
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
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

// ============================================
// Task Types
// ============================================

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
  parentId?: string;  // For subtasks
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskResult {
  taskId: string;
  result: ExecutorResult;
  subtaskResults?: TaskResult[];
}

// ============================================
// Planning Types
// ============================================

export interface Plan {
  id: string;
  originalPrompt: string;
  tasks: Task[];
  strategy: string;
  createdAt: Date;
}

export interface PlannerConfig {
  maxSubtasks: number;
  defaultExecutor: ExecutorType;
  parallelExecution: boolean;
}

// ============================================
// Memory Types
// ============================================

export type EventType = 
  | 'task_created'
  | 'task_started'
  | 'task_completed'
  | 'task_failed'
  | 'executor_called'
  | 'executor_responded'
  | 'plan_created'
  | 'system_error';

export interface MemoryEvent {
  id: string;
  type: EventType;
  timestamp: Date;
  taskId?: string;
  executorType?: ExecutorType;
  payload: Record<string, unknown>;
}

export interface MemoryStore {
  logEvent(event: Omit<MemoryEvent, 'id' | 'timestamp'>): Promise<string>;
  getEvents(filter?: Partial<MemoryEvent>): Promise<MemoryEvent[]>;
  getTaskHistory(taskId: string): Promise<MemoryEvent[]>;
  clear(): Promise<void>;
}

// ============================================
// Dispatcher Types
// ============================================

export interface DispatcherConfig {
  executors: Map<ExecutorType, Executor>;
  memory: MemoryStore;
  retryAttempts: number;
  retryDelayMs: number;
}

export interface DispatchResult {
  task: Task;
  result: ExecutorResult;
  attempts: number;
}

// ============================================
// Orpheus Core Config
// ============================================

export interface OrpheusConfig {
  openaiApiKey?: string;
  anthropicApiKey?: string;
  googleApiKey?: string;
  memoryPath: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  planner: PlannerConfig;
}

export function createDefaultConfig(): OrpheusConfig {
  return {
    memoryPath: './orpheus.db',
    logLevel: 'info',
    planner: {
      maxSubtasks: 10,
      defaultExecutor: 'sonnet',
      parallelExecution: false,
    },
  };
}
