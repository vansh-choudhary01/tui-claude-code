# opencode — Terminal AI Coding Agent

A CLI-based AI coding agent with a terminal UI (TUI) that can read/write files, run shell commands, search the web, and delegate tasks to sub-agents — all from your terminal.

## Features

- Interactive TUI chat interface powered by [Ink](https://github.com/vadimdemedes/ink)
- Supports multiple LLM providers: **Gemini**, **OpenAI**, and a **local model** (via `http://localhost:8080/chat`)
- Tool-calling loop: the LLM invokes tools autonomously until a task is complete
- Parallel tool execution with `dependsOn` dependency resolution
- Streaming responses with real-time chunk display and thinking indicator
- Conversation memory with automatic summarization when context grows too large
- Agent workspace auto-created at `.agent_workspace/projects/` on startup

## Tools Available to the Agent

| Tool | Description |
|------|-------------|
| `WebSearch` | Searches Google via SerpAPI |
| `BashTool` | Executes shell commands (2s idle timeout, 15s max) |
| `ReadFileTool` | Reads a file from the workspace |
| `WriteFileTool` | Writes/creates a file (auto-creates parent directories) |
| `UpdateFileContentTool` | Replaces specific line ranges in a file |
| `runAgentTool` | Spawns a sub-agent with a given prompt |

## Prerequisites

- [Bun](https://bun.sh) or Node.js
- API keys for your chosen provider(s)

## Installation

```bash
npm install
# or
bun install
```

## Configuration

`store/data.json` is auto-created on first run with these defaults:

```json
{
  "defaultProvider": { "name": "gemini", "model": "gemini-flash" },
  "setKeys": {}
}
```

Set your provider and API key via CLI:

```bash
# Set default provider and model
npx ts-node cli.ts providers set <providerName> <modelName>

# Save your API key
npx ts-node cli.ts providers login --provider gemini --api_key <your_api_key>

# For web search (optional) — add to .env
SERP_API_KEY=<your_serp_key>
```

## Usage

### Interactive TUI Chat

```bash
npx ts-node cli.ts chat
```

Type your prompt and press Enter. Press `Esc` to exit.

### One-shot Agent

```bash
npx ts-node cli.ts agent --prompt "Create a React todo app in the workspace"
```

### List Available Models

```bash
npx ts-node cli.ts models
```

### Provider Management

```bash
npx ts-node cli.ts providers list
npx ts-node cli.ts providers login --provider gemini --api_key <key>
npx ts-node cli.ts providers logout --provider gemini
npx ts-node cli.ts providers set <providerName> <modelName>
```

## Project Structure

```
.
├── cli.ts                  # Entry point — registers commands, creates workspace dir
├── actions/
│   ├── llm.ts              # LLM streaming, tool loop, JSON parsing, memory compression
│   ├── tools.ts            # Tool definitions and implementations
│   └── memory.ts           # Message history (last 20) and summary memory
├── commands/
│   ├── chat.tsx            # `chat` command — launches Ink TUI
│   ├── agent.ts            # `agent` command — one-shot prompt
│   ├── models.ts           # `models` command — lists all provider models
│   └── providers/
│       ├── index.ts        # Registers provider subcommands
│       ├── login.ts        # Saves API key to data.json
│       ├── logout.ts       # Removes API key from data.json
│       └── setProvider.ts  # Sets default provider/model, lists providers
├── tui/
│   └── TUIChat.tsx         # Ink chat UI with streaming chunks + spinner
├── store/
│   ├── data.json           # Auto-created on first run — persists provider/key config
│   ├── db.ts               # Exports provider config and supported providers/models
│   └── db1.ts              # Reads/writes data.json (auto-creates file if missing)
└── .agent_workspace/
    └── projects/           # Agent's sandboxed file workspace (auto-created on startup)
```

## How It Works

1. User sends a message via TUI or CLI.
2. `callLlm` builds a system prompt with tool definitions, conversation history, and summary, then streams from the active provider.
3. The LLM responds with `{ "tools": [...] }` to invoke tools or `{ "answer": "..." }` to finish.
4. Tools with no unmet `dependsOn` run in parallel; results are fed back to the LLM, and the loop continues.
5. On a final answer, `appendSummary` is called if the LLM includes one. When the summary exceeds 3000 tokens, it is compressed automatically.

## Supported Providers

| Provider | Example models |
|----------|----------------|
| `gemini` | `gemini-2.5-flash`, `gemini-2.5-flash-lite`, `gemini-2.5-pro` |
| `chatgpt` | `gpt-4.1`, `gpt-4o`, `gpt-4o-mini` |
| `anthropic` | `claude-sonnet-4-20250514`, `claude-opus-4-20250514`, `claude-3-5-haiku-latest` |
| `local` | any local model name accepted |

You can set a provider and model like this:

```bash
npx ts-node cli.ts providers set gemini gemini-2.5-flash
```
