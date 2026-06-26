import { exec, spawn } from "child_process";
import fs from "fs/promises";

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
    result: unknown;
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

// 2. bash tool
// 3. readFile tool
// 4. writeFile tool

const pwd = "" + process.cwd() + "/.agent_workspace/projects";

export async function BashTool(command: string): Promise<string> {
    const fullCommand = `cd ${pwd} && ${command}`;

    const child = spawn(fullCommand, { shell: true });

    let output = "";
    let errorOutput = "";

    child.stdout.on("data", (data) => {
        console.log(`stdout: ${data}`);
        output += data.toString();
    });

    child.stderr.on("data", (data) => {
        console.error(`stderr: ${data}`);
        errorOutput += data.toString();
    });
    
    // setTimeout(() => {
    //     child.kill();
    // }, 10000); // Kill the process after 10 seconds

    await Promise.race([
        new Promise<void>((resolve) => {
            child.on("close", () => resolve());
        })
    ]);

    if (errorOutput) {
        console.error("Error executing BashTool:", errorOutput);
        return `Error: ${errorOutput}`;
    }
    return output;
}

export async function ReadFileTool(filePath: string): Promise<string> {
    const fullFilePath = `${pwd}/${filePath}`;
    return await fs.readFile(fullFilePath, "utf8");
}

export async function WriteFileTool(filePath: string, content: string): Promise<void> {
    const fullFilePath = `${pwd}/${filePath}`;
    await fs.writeFile(fullFilePath, content, "utf8");
}

export async function runTool(toolCall: ToolCall): Promise<ToolRunResult> {
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

        return {
            tool: toolCall.name,
            args,
            result: `Unknown tool: ${toolCall.name}`
        };
    } catch (error) {
        return {
            tool: toolCall.name,
            args: toolCall.args,
            result: `Error executing tool: ${error instanceof Error ? error.message : String(error)}`
        };
    }
}
