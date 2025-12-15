# Orpheus

**Multi-AI Agent Orchestration System**

*Smooth like butter, hooks like the devil.*

---

Orpheus is an orchestration layer that coordinates multiple AI models (OpenAI, Anthropic, Google) into a unified execution framework. Named for the musician whose song compelled even the gods, Orpheus aims to present a seamless interface over the chaos of multi-model AI workflows.

## Architecture

```
┌─────────────────────────────────────┐
│           ORPHEUS-CORE              │  ← Planning & Orchestration
│         (Claude Opus 4.5)           │     Task decomposition
└──────────────┬──────────────────────┘     Prompt synthesis
               │                            Dispatch routing
               │ subtasks
               ▼
┌─────────────────────────────────────┐
│            EXECUTORS                │  ← Specialized Execution
│  ┌─────────┬─────────┬───────────┐  │
│  │  Codex  │ Sonnet  │  Gemini   │  │
│  │ (GPT-5) │(Claude) │ (Google)  │  │
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

## The Mythology

Orpheus descended into the underworld and returned. His song stopped rivers, tamed beasts, and made Hades weep. The system follows this pattern:

- **Katabasis** (descent): Tasks decompose and dispatch into the depths of execution
- **The Song**: A unified interface that conceals complexity
- **Anabasis** (return): Results aggregate back with full memory of the journey

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env
# Edit .env with your API keys

# Build all packages
npm run build

# Run Orpheus
npm run orpheus "Your task here"
```

## Project Structure

```
orpheus/
├── orpheus-core/     # Orchestrator (planning, dispatch)
├── executors/
│   ├── codex/        # OpenAI GPT/Codex executor
│   ├── sonnet/       # Anthropic Claude executor
│   └── gemini/       # Google Gemini executor
└── memory/           # SQLite persistence layer
```

## Configuration

All configuration via environment variables. See `.env.example` for the full list.

## Status

Pre-production. The architecture is set; implementations are being built.

## License

MIT
