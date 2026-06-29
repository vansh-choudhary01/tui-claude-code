# opencode — Terminal AI Coding Agent

A CLI-based AI coding agent with a terminal UI (TUI) that can read/write files, run shell commands, search the web, and delegate tasks to sub-agents — all from your terminal.

## Features

- Interactive TUI chat interface powered by [Ink](https://github.com/vadimdemedes/ink)
- Supports multiple LLM providers: **Gemini**, **OpenAI**, and a local model
- Tool-calling loop: the LLM can invoke tools autonomously until a task is complete
- Streaming responses with real-time chunk display
- Conversation memory with automatic summarization when context grows too large
- Agent workspace at `.agent_workspace/projects/` for all file operations

## Tools Available to the Agent

| Tool | Description |
|------|-------------|
| `WebSearch` | Searches Google via SerpAPI |
| `BashTool` | Executes shell commands |
| `ReadFileTool` | Reads a file from the workspace |
| `WriteFileTool` | Writes/creates a file (auto-creates directories) |
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

Set your provider and API keys using the CLI:

```bash
# Set provider (gemini | openai)
npx ts-node cli.ts providers set --provider gemini --model gemini-flash

# Log in with your API key
npx ts-node cli.ts providers login --provider gemini --key <your_api_key>

# For web search (optional)
# Add SERP_API_KEY to your .env file
```

Or edit `store/data.json` directly:

```json
{
  "defaultProvider": { "name": "gemini", "model": "gemini-flash" },
  "setKeys": { "gemini": "<your_key>", "openai": "<your_key>" }
}
```

## Usage

### Interactive TUI Chat

```bash
npx ts-node cli.ts chat
```

Type your prompt, press Enter to send. Press `Esc` to exit.

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
npx ts-node cli.ts providers login --provider openai --key <key>
npx ts-node cli.ts providers logout --provider openai
npx ts-node cli.ts providers set --provider gemini --model gemini-flash
```

## Project Structure

```
.
├── cli.ts                  # Entry point, registers all commands
├── actions/
│   ├── llm.ts              # LLM call logic (Gemini & OpenAI), tool loop, memory management
│   ├── tools.ts            # Tool definitions and implementations
│   └── memory.ts           # Message history and summary memory
├── commands/
│   ├── chat.tsx            # `chat` command — launches TUI
│   ├── agent.ts            # `agent` command — one-shot prompt
│   ├── models.ts           # `models` command — list models
│   └── providers/          # `providers` subcommands (login/logout/set/list)
├── tui/
│   └── TUIChat.tsx         # Ink-based interactive chat UI
├── store/
│   ├── data.json           # Persisted provider/key config
│   ├── db.ts               # Exports provider config
│   └── db1.ts              # Reads/writes data.json
└── .agent_workspace/
    └── projects/           # Agent's sandboxed file workspace
```

## How It Works

1. User sends a message via TUI or CLI.
2. `callLlm` builds a system prompt with tool definitions and conversation history, then calls the active provider.
3. The LLM responds with either a `{ "tools": [...] }` JSON to invoke tools, or a `{ "answer": "..." }` to finish.
4. Tools are executed (in parallel where `dependsOn` allows), results are fed back to the LLM, and the loop continues until a final answer is produced.
5. Conversation summaries are compressed automatically when they exceed a token threshold.
