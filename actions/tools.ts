import { ChildProcess, exec, spawn } from "child_process";
import fs from "fs/promises";
import { callLlm, ToolCalls } from "./llm";
import { randomUUID } from "crypto";

interface WebSearchResponse {
    organic_results?: Array<{
        title: string;
        link: string;
        snippet: string;
    }>;
}

interface SearchResult {
    title: string;
    link: string;
    snippet: string;
}

interface SuccessResponse {
    ok: true;
    result: SearchResult[] | string;
}

interface ErrorResponse {
    ok: false;
    error: string;
}

type WebSearchResult = SuccessResponse | ErrorResponse;

export interface Tool {
    name: string;
    description: string;
    args: Array<{
        name: string;
        type: string;
        description: string;
    }>;
}

export type ToolCall = {
    name: string;
    args: Record<string, any>;
};

export type ToolRunResult = {
    tool: string;
    args: Record<string, any>;
    result?: unknown;
    error?: string;
};

export const tools: Tool[] = [
    {
        name: "WebSearch",
        description: "Search on the web for up-to-date information.",
        args: [{
            name: "query",
            type: "string",
            description: "The search query."
        }]
    }, {
        name: "BashTool",
        description: "Execute bash commands.",
        args: [{
            name: "command",
            type: "string",
            description: "The bash command to execute."
        }]
    }, {
        name: "ReadFileTool",
        description: "Read the contents of a file.",
        args: [{
            name: "filePath",
            type: "string",
            description: "The path to the file to read."
        }]
    }, {
        name: "WriteFileTool",
        description: "Write content to a file.",
        args: [{
            name: "filePath",
            type: "string",
            description: "The path to the file to write."
        }, {
            name: "content",
            type: "string",
            description: "The content to write to the file."
        }]
    }, {
        name: "UpdateFileContentTool",
        description: "Update specific lines in a file with new content.",
        args: [{
            name: "filePath",
            type: "string",
            description: "The path to the file to update."
        }, {
            name: "startLine",
            type: "number",
            description: "The starting line number to replace."
        }, {
            name: "endLine",
            type: "number",
            description: "The ending line number to replace."
        }, {
            name: "newContent",
            type: "string",
            description: "The new content to insert."
        }]
    }, {
        name: "runAgentTool",
        description: "Run an agent with a specific prompt and get the result.",
        args: [{
            name: "agentId",
            type: "string",
            description: "The ID of the agent to run."
        }, {
            name: "prompt",
            type: "string",
            description: "The prompt to give the agent."
        }]
    }
];

export async function WebSearch(query: string): Promise<WebSearchResult> {
    try {
        const { getJson: serpWebSearch } = require("serpapi");
        const response: WebSearchResponse = await serpWebSearch({
            engine: "google",
            api_key: process.env.SERP_API_KEY, // must be defined
            q: query
        });

        const results = response.organic_results || [];

        const formatted: SearchResult[] = results.slice(0, 3).map(r => ({
            title: r.title,
            link: r.link,
            snippet: r.snippet
        }));

        return {
            ok: true,
            result: formatted.length ? formatted : "No results found"
        };

    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.log("Error in WebSearchTool:", message);

        return {
            ok: false,
            error: message
        };
    }
}

type RunningProcess = {
    child: ChildProcess;
    command: string;
    startedAt: Date;
};

const runningProcesses = new Map<number, RunningProcess>();

const pwd = process.cwd() + "/.agent_workspace/projects";

export async function BashTool(command: string) {
    return new Promise<{
        output: string;
        errorOutput: string;
        pid: number | null;
        running: boolean;
    }>((resolve, reject) => {

        const child = spawn(command, {
            cwd: pwd,
            shell: true,
        });

        let stdout = "";
        let stderr = "";

        let finished = false;

        let idleTimer: NodeJS.Timeout;
        let maxTimer: NodeJS.Timeout;

        function finish(running: boolean) {
            if (finished) return;

            finished = true;

            clearTimeout(idleTimer);
            clearTimeout(maxTimer);

            if (running && child.pid) {
                runningProcesses.set(child.pid, {
                    child,
                    command,
                    startedAt: new Date(),
                });
            }

            resolve({
                output: stdout,
                errorOutput: stderr,
                pid: child.pid ?? null,
                running,
            });
        }

        function resetIdleTimer() {
            clearTimeout(idleTimer);

            idleTimer = setTimeout(() => {
                // no output for 2 sec
                finish(!child.killed);
            }, 2000);
        }

        child.stdout.on("data", chunk => {
            const text = chunk.toString();

            process.stdout.write(text);

            stdout += text;

            resetIdleTimer();
        });

        child.stderr.on("data", chunk => {
            const text = chunk.toString();

            process.stderr.write(text);

            stderr += text;

            resetIdleTimer();
        });

        child.on("error", reject);

        child.on("close", () => {
            finish(false);
        });

        // absolute max wait
        maxTimer = setTimeout(() => {
            finish(!child.killed);
        }, 15000);

        resetIdleTimer();
    });
}

export async function ReadFileTool(filePath: string): Promise<string> {
    const fullFilePath = `${pwd}/${filePath}`;
    return await fs.readFile(fullFilePath, "utf8");
}

export async function WriteFileTool(filePath: string, content: string): Promise<void> {
    const fullFilePath = `${pwd}/${filePath}`;
    await fs.writeFile(fullFilePath, content, "utf8");
}

export async function UpdateFileContentTool(filePath: string, startLine: number, endLine: number, newContent: string): Promise<void> {
    const fullFilePath = `${pwd}/${filePath}`;

    const fileContent = await fs.readFile(fullFilePath, "utf8");
    const lines = fileContent.split("\n");

    const newLines = newContent.split("\n");

    lines.splice(startLine - 1, endLine - startLine + 1, ...newLines);
    await fs.writeFile(fullFilePath, lines.join("\n"), "utf8");
}

// create agent tool (that run an task and response back with result and with summery what it did (means thoughts))
export async function runAgentTool(agentId: string, prompt: string): Promise<string> {
    return await callLlm(prompt, () => {}, {
        agentId,
        agentMode: "tool",
    });
}

export async function runTool(toolCall: ToolCall): Promise<ToolRunResult> {
    console.log("Running tool:", toolCall);
    try {
        const args = toolCall.args ?? {};

        if (toolCall.name === "WebSearch") {
            return { 
                tool: toolCall.name,
                args,
                result: await WebSearch(String(args.query ?? ""))
            };
        }

        if (toolCall.name === "BashTool") {
            return {
                tool: toolCall.name,
                args,
                result: await BashTool(String(args.command ?? ""))
            };
        }

        if (toolCall.name === "ReadFileTool") {
            return {
                tool: toolCall.name,
                args,
                result: await ReadFileTool(String(args.filePath ?? ""))
            };
        }

        if (toolCall.name === "WriteFileTool") {
            await WriteFileTool(String(args.filePath ?? ""), String(args.content ?? ""));
            return {
                tool: toolCall.name,
                args,
                result: "File written successfully"
            };
        }

        if (toolCall.name === "UpdateFileContentTool") {
            await UpdateFileContentTool(
                String(args.filePath ?? ""),
                Number(args.startLine ?? 0),
                Number(args.endLine ?? 0),
                String(args.newContent ?? "")
            );
            return {
                tool: toolCall.name,
                args,
                result: "File content updated successfully"
            };
        }

        if (toolCall.name === "runAgentTool") {
            return {
                tool: toolCall.name,
                args,
                result: await runAgentTool(String(args.agentId ?? randomUUID()), String(args.prompt ?? ""))
            };
        }

        if (toolCall.name === "__retry__") {
            return {
                tool: toolCall.name,
                args,
                result: "Your last response was invalid JSON."
            }
        }

        return {
            tool: toolCall.name,
            args,
            result: `Unknown tool: ${toolCall.name}`
        };
    } catch (error) {
        return {
            tool: toolCall.name,
            args: toolCall.args,
            error: error instanceof Error ? error.message : String(error)
        };
    }
}

export interface ToolState {
    tool: ToolCalls;
    dependencies: number[]; // indices of tools that must be completed before this tool can run
    lastRunResult?: ToolRunResult;
    toolExecution: "idle" | "running" | "completed" | "error";
}

export function getRunnableTools(toolStates: ToolState[]): ToolCalls[] {
    return toolStates
        .filter((state): state is ToolState => state.toolExecution === "idle" && state.dependencies.every(depIndex => toolStates[depIndex]?.toolExecution === "completed"))
        .map((state) => state.tool);
}