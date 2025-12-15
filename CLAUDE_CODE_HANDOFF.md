# ORPHEUS: Claude Code Project Handoff

**Last Updated**: 2024-12-15
**Project Status**: Foundation built, awaiting build verification and frontier model integration

---

## Executive Summary

Orpheus is a multi-AI agent orchestration system that coordinates OpenAI, Anthropic, and Google models into a unified execution framework. Named for the musician whose song compelled even the gods—smooth like butter, hooks like the devil.

### Architecture

```
┌─────────────────────────────────────┐
│           ORPHEUS-CORE              │  ← Planning & Orchestration
│       (Council Deliberation)        │     Task decomposition
└──────────────┬──────────────────────┘     Prompt synthesis
               │                            Dispatch routing
               │ subtasks
               ▼
┌─────────────────────────────────────┐
│            EXECUTORS                │  ← Specialized Execution
│  ┌─────────┬─────────┬───────────┐  │
│  │  Codex  │ Sonnet  │  Gemini   │  │
│  │(OpenAI) │(Claude) │ (Google)  │  │
│  └─────────┴─────────┴───────────┘  │
└──────────────┬──────────────────────┘
               │
               │ events
               ▼
┌─────────────────────────────────────┐
│             MEMORY                  │  ← Persistence Layer
│           (SQLite)                  │     Event logging
└─────────────────────────────────────┘     State retrieval
```

---

## CRITICAL: Frontier Models (As of 2024-12-15)

These models MUST be used. Update if stale.

| Provider | Frontier Model | Model String | Use Case |
|----------|---------------|--------------|----------|
| **OpenAI** | GPT-4o | `gpt-4o` | Code generation, tool use |
| **OpenAI** | o1 | `o1` | Complex reasoning (limited availability) |
| **Anthropic** | Claude Opus 4.5 | `claude-opus-4-5-20251101` | Council deliberation, planning |
| **Anthropic** | Claude Sonnet 4.5 | `claude-sonnet-4-5-20250929` | Execution tasks |
| **Google** | Gemini 2.0 Flash | `gemini-2.0-flash-exp` | Multimodal, research |
| **Google** | Gemini 2.5 Pro | `gemini-2.5-pro-preview-06-05` | Advanced reasoning |

### Model Selection Rules

1. **Council/Planning Phase**: Use Opus 4.5 (orchestrator decides)
2. **Code Execution**: GPT-4o or Sonnet 4.5
3. **Research/Multimodal**: Gemini 2.5 Pro or 2.0 Flash
4. **Cost-Sensitive**: Sonnet 4.5 or Gemini Flash

---

## Project Structure

```
orpheus/
├── package.json              # Workspace root (npm workspaces)
├── .env.example              # Template for API keys
├── .gitignore                # Standard ignores
├── README.md                 # Project documentation
├── CLAUDE_CODE_HANDOFF.md    # THIS FILE
│
├── orpheus-core/             # Orchestrator module
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts          # Main entry, Orpheus class
│       ├── types.ts          # Shared TypeScript interfaces
│       ├── planner.ts        # Task decomposition logic
│       └── dispatcher.ts     # Routes tasks to executors
│
├── executors/                # Provider-specific executors
│   ├── codex/                # OpenAI GPT executor
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/index.ts
│   │
│   ├── sonnet/               # Anthropic Claude executor
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/index.ts
│   │
│   └── gemini/               # Google Gemini executor
│       ├── package.json
│       ├── tsconfig.json
│       └── src/index.ts
│
└── memory/                   # Persistence layer
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── index.ts          # Exports
        └── store.ts          # SQLite implementation
```

---

## Immediate Tasks (Priority Order)

### Task 1: Verify Build
```bash
cd orpheus
npm install
npm run build
```

**Expected**: All TypeScript compiles without errors. If errors occur, fix them before proceeding.

### Task 2: Update Executor Model Constants

Update each executor to use frontier models:

**File**: `executors/codex/src/index.ts`
```typescript
const DEFAULT_MODEL = 'gpt-4o';  // Verified current as of 2024-12-15
```

**File**: `executors/sonnet/src/index.ts`
```typescript
const DEFAULT_MODEL = 'claude-sonnet-4-5-20250929';  // UPDATE THIS
```

**File**: `executors/gemini/src/index.ts`
```typescript
const DEFAULT_MODEL = 'gemini-2.0-flash-exp';  // Or gemini-2.5-pro-preview-06-05
```

### Task 3: Create Root CLI Entry Point

Create `orpheus/src/cli.ts` that:
1. Loads environment variables
2. Initializes memory store
3. Registers all available executors (based on which API keys are present)
4. Accepts a prompt from command line
5. Runs the full pipeline: plan → dispatch → return results

### Task 4: Add Model Registry

Create `orpheus-core/src/models.ts`:
```typescript
export const FRONTIER_MODELS = {
  openai: {
    flagship: 'gpt-4o',
    reasoning: 'o1',
    updated: '2024-12-15',
  },
  anthropic: {
    flagship: 'claude-opus-4-5-20251101',
    execution: 'claude-sonnet-4-5-20250929',
    updated: '2024-12-15',
  },
  google: {
    flagship: 'gemini-2.5-pro-preview-06-05',
    fast: 'gemini-2.0-flash-exp',
    updated: '2024-12-15',
  },
} as const;
```

### Task 5: Add Integration Tests

Create `orpheus/tests/` with:
- `memory.test.ts` - Verify SQLite store works
- `executors.test.ts` - Verify each executor can ping its API
- `pipeline.test.ts` - End-to-end test of plan → dispatch → result

---

## Design Principles

1. **Boring Reliability Over Clever Hacks**: Simple, predictable code that works.

2. **Fail Gracefully**: If an executor is unavailable, fall back to alternatives. Never crash on API failures.

3. **Log Everything**: Every task, every API call, every result goes to the memory store.

4. **Type Safety**: Strict TypeScript. No `any` unless absolutely necessary.

5. **Minimal Dependencies**: Only add packages that provide clear value.

---

## Environment Variables

```bash
# Required for full functionality
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=...

# Optional configuration
ORPHEUS_LOG_LEVEL=info          # debug | info | warn | error
ORPHEUS_MEMORY_PATH=./orpheus.db  # SQLite database location
```

---

## Council Deliberation (Future Feature)

The "Council" is the planned feature where all three frontier models deliberate on complex tasks before execution:

1. **Prompt Broadcast**: Same prompt sent to Opus, GPT-4o, and Gemini Pro
2. **Response Collection**: Gather all three perspectives
3. **Synthesis**: Opus synthesizes into unified plan
4. **Subagent Creation**: Plan specifies which executor handles which subtask
5. **Execution**: Dispatcher routes according to plan

This is NOT yet implemented. Current system uses simple heuristic routing in `planner.ts`.

---

## Known Issues / TODOs

- [ ] Sonnet executor uses old model string (`claude-sonnet-4-20250514`) - needs update
- [ ] No CLI entry point yet - `npm run orpheus` won't work until Task 3 complete
- [ ] Gemini executor untested with live API
- [ ] No error handling for rate limits
- [ ] No streaming support (all responses are blocking)
- [ ] Types are duplicated across executors (should import from orpheus-core)

---

## Session Startup Protocol

**EVERY SESSION**, before doing any work:

1. Search web for current frontier models from OpenAI, Anthropic, Google
2. Compare against `FRONTIER_MODELS` in codebase
3. If stale, update the constants AND this handoff document
4. Log the check in memory store (when available)

---

## Commands Reference

```bash
# Install all dependencies
npm install

# Build all packages
npm run build

# Clean build artifacts
npm run clean

# Run Orpheus (after CLI is implemented)
npm run orpheus "Your task here"

# Run specific executor in isolation (for testing)
npx ts-node executors/codex/src/index.ts
```

---

## Contact / Context

- **Human**: Dave - high context, high competence, no hand-holding needed
- **Communication Style**: Direct, substantive, wit welcome
- **Project Origin**: Evolution from earlier "dual-flow" prototype
- **Name Etymology**: Orpheus - the musician who descended to the underworld and returned, whose song stopped rivers and made Hades weep

---

## File Checksums (for verification)

After successful build, these files should exist:
- `orpheus-core/dist/index.js`
- `orpheus-core/dist/types.js`
- `orpheus-core/dist/planner.js`
- `orpheus-core/dist/dispatcher.js`
- `memory/dist/index.js`
- `memory/dist/store.js`
- `executors/codex/dist/index.js`
- `executors/sonnet/dist/index.js`
- `executors/gemini/dist/index.js`

---

*"Smooth like butter, hooks like the devil."*
