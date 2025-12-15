# CLAUDE.md

## What is this?

Orpheus is a multi-AI agent orchestration system. It routes tasks to OpenAI (Codex), Anthropic (Sonnet), and Google (Gemini) based on task type, with automatic fallback and retry logic. SQLite-backed event logging for full auditability.

## Quick Start

```bash
cd orpheus
npm install
npm run build
```

## Architecture

```
User Prompt → Planner → Dispatcher → Executor(s) → Result
                           ↓
                       Memory (SQLite)
```

**Planner**: Analyzes prompts, creates execution plans, routes to appropriate executor
**Dispatcher**: Executes tasks with retry/fallback logic, logs all events
**Executors**: Provider-specific API wrappers (Codex/Sonnet/Gemini)
**Memory**: SQLite store for event persistence and task history

## Project Structure

```
orpheus/
├── orpheus-core/src/
│   ├── index.ts      # Main Orpheus class, CLI stub
│   ├── types.ts      # All TypeScript interfaces
│   ├── planner.ts    # Task decomposition, executor routing
│   └── dispatcher.ts # Task dispatch with retry/fallback
├── executors/
│   ├── codex/        # OpenAI GPT-4o
│   ├── sonnet/       # Anthropic Claude
│   └── gemini/       # Google Gemini
├── memory/
│   └── store.ts      # SQLite event store
└── package.json      # npm workspaces root
```

## Frontier Models (keep current)

| Provider | Model | String | Use |
|----------|-------|--------|-----|
| OpenAI | GPT-4o | `gpt-4o` | Code generation |
| OpenAI | o1 | `o1` | Complex reasoning |
| Anthropic | Opus 4.5 | `claude-opus-4-5-20251101` | Council/planning |
| Anthropic | Sonnet 4.5 | `claude-sonnet-4-5-20250929` | Execution |
| Google | Gemini 2.5 Pro | `gemini-2.5-pro-preview-06-05` | Advanced reasoning |
| Google | Gemini 2.0 Flash | `gemini-2.0-flash-exp` | Fast/multimodal |

## Environment Variables

```bash
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=...
ORPHEUS_LOG_LEVEL=info        # debug|info|warn|error
ORPHEUS_MEMORY_PATH=./orpheus.db
```

## Routing Logic

The planner routes based on keywords in the prompt:

- **Code keywords** (function, class, typescript, api, sql) → Codex
- **Research keywords** (research, analyze, compare, multimodal) → Gemini
- **Default** → Sonnet

See `orpheus-core/src/planner.ts:83-121` for exact logic.

## Key Interfaces

```typescript
// Task execution
interface Executor {
  type: ExecutorType;
  execute(task: Task): Promise<ExecutorResult>;
  isAvailable(): Promise<boolean>;
}

// Event logging
interface MemoryStore {
  logEvent(event): Promise<string>;
  getEvents(filter?): Promise<MemoryEvent[]>;
  getTaskHistory(taskId): Promise<MemoryEvent[]>;
}
```

## Commands

```bash
npm install          # Install all workspace dependencies
npm run build        # Build all packages
npm run clean        # Remove dist/ and node_modules/
npm run orpheus      # Run CLI (needs executors registered)
```

## Known Issues

- [ ] Sonnet uses old model `claude-sonnet-4-20250514` → update to `claude-sonnet-4-5-20250929`
- [ ] No CLI entry point yet - root `npm run orpheus` is a stub
- [ ] Types duplicated across executors (should import from orpheus-core)
- [ ] No streaming support
- [ ] No rate limit handling

## Session Protocol

Every session:
1. Verify frontier models are current (check provider docs if stale)
2. Update model constants if needed
3. Run `npm run build` to verify compilation

## Design Principles

1. **Boring reliability** - simple code that works
2. **Fail gracefully** - fallback to alternatives, never crash on API failures
3. **Log everything** - all events go to memory store
4. **Strict TypeScript** - no `any` unless necessary
5. **Minimal dependencies** - only add what provides clear value

## Future: Council Deliberation

Planned feature where all three frontier models deliberate before execution:
1. Broadcast same prompt to Opus, GPT-4o, Gemini Pro
2. Collect all perspectives
3. Opus synthesizes unified plan
4. Dispatcher routes according to plan

Not yet implemented - current system uses heuristic routing.
