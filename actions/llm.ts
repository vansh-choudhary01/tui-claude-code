import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import { defaultProvider, setKeys } from "../store/db";
import { tools, runTool } from "./tools";
import {
    pushMessage,
    appendSummary,
    replaceSummary,
    getSummary,
    getFormattedHistory,
    generateSummeryGenerationPrompt,
} from "./memory";

const SUMMARY_COMPRESS_THRESHOLD = 30;

const toolDescriptions = tools.map(t =>
    `${t.name}: ${t.description} : ${t.args.map(a => `${a.name}: ${a.type}`).join(", ")}`
).join("; ");

const toolExamples = `{
    "tools": [{
        "name": "WebSearch",
        "args": {"query": "What is the capital of France?"}
    }, {
        "name": "BashTool",
        "args": {"command": "ls -la"}
    }, {
        "name": "ReadFileTool",
        "args": {"filePath": "/path/to/file.txt"}
    }, {
        "name": "WriteFileTool",
        "args": {"filePath": "/path/to/file.txt", "content": "import express from 'express';
        const app = express();
        app.get('/', (req, res) => {
            res.send('Hello World!');
        });
        app.listen(3000, () => {
            console.log('Server is running on port 3000');
        });"}
    }, {
        "name": "updateFileContent",
        "args": {"filePath": "/path/to/file.txt", "startLine": 4, "endLine": 6, "newContent": "const count = 5;
        array.forEach(item, idx => {
            if (idx === count) {
                console.log('Reached the count limit.');
            }
            console.log(item);
        });"}
    }],
}`;

async function callGemini(systemPrompt: string, userMessage: string): Promise<string> {
    const genai = new GoogleGenAI({ apiKey: setKeys.gemini });
    const toolCalls: any[] = [];
    let initialPrompt = true;
    let finalPrompt = `${systemPrompt}\nUser message: ${userMessage}`;
    let response = "";

    while (toolCalls.length > 0 || initialPrompt) {
        initialPrompt = false;

        if (toolCalls.length > 0) {
            const toolCallResults = await Promise.all(toolCalls.map(tc => runTool(tc)));
            toolCalls.length = 0;
            finalPrompt += `\nTool call results: ${JSON.stringify(toolCallResults)}\nBased on the above tool call results, answer the original question.`;
        }

        const responseStream = await genai.models.generateContentStream({
            model: defaultProvider.model,
            contents: finalPrompt,
        });

        response = "";
        for await (const part of responseStream) {
            response += part.text;
        }

        // remove ```json and ``` if present
        response = response.replace(/```json/g, "").replace(/```/g, "").trim().replace(/,(\s*[}\]])/g, "$1");

        const isJson = response.trim().startsWith("{") && response.trim().endsWith("}");
        const parsed = isJson ? JSON.parse(response.trim()) : null;

        if (parsed?.tools) {
            toolCalls.push(...parsed.tools);
            finalPrompt = `prev context - ${finalPrompt}\nYou responded with: ${response}\nIf you need to call any tools use this format:\n${toolExamples}\nonly respond with json tools array, no other text.`;
        } else if (parsed?.appendSummary) {
            appendSummary(parsed.appendSummary);
        }
    }

    console.log("Final response from Gemini:", response);
    return response;
}

async function callOpenAI(systemPrompt: string, userMessage: string): Promise<string> {
    const openai = new OpenAI({ apiKey: setKeys.openai });
    const toolCalls: any[] = [];
    let initialPrompt = true;
    let finalPrompt = systemPrompt;
    let response = "";

    while (toolCalls.length > 0 || initialPrompt) {
        initialPrompt = false;

        if (toolCalls.length > 0) {
            const toolCallResults = await Promise.all(toolCalls.map(tc => runTool(tc)));
            toolCalls.length = 0;
            finalPrompt += `\nTool call results: ${JSON.stringify(toolCallResults)}\nBased on the above tool call results, answer the original question.`;
        }

        const responseStream = await openai.chat.completions.create({
            model: defaultProvider.model,
            messages: [{ role: "user", content: userMessage }, { role: "system", content: finalPrompt }],
            stream: true
        });

        response = "";
        for await (const part of responseStream) {
            response += part.choices[0].delta.content || "";
        }

        // remove ```json and ``` if present
        response = response.replace(/```json/g, "").replace(/```/g, "").trim().replace(/,(\s*[}\]])/g, "$1");
        console.log("Raw response from OpenAI:", response);

        const isJson = response.trim().startsWith("{") && response.trim().endsWith("}");
        const parsed = isJson ? JSON.parse(response.trim()) : null;

        if (parsed?.tools) {
            toolCalls.push(...parsed.tools);
            finalPrompt = `prev context - ${finalPrompt}\nYou responded with: ${response}\nIf you need to call any tools use this format:\n${toolExamples}\nonly respond with json tools array, no other text.`;
        } else if (parsed?.appendSummary) {
            appendSummary(parsed.appendSummary);
        }
    }

    console.log("Final response from OpenAI:", response);
    return response;
}

export async function callLlm(userMessage: string): Promise<string> {
    pushMessage("user", userMessage);

    const systemPrompt = `
You are a task-completion agent with access to tools. You MUST respond with ONLY valid JSON — no prose, no markdown, no extra text.

---

## AVAILABLE TOOLS
${toolDescriptions}

---

## CORE BEHAVIOR

You are a **coding agent**, not an advisor. When the user asks you to update, create, or modify files:
- You MUST use tools to READ the actual files first, then WRITE the changes.
- NEVER describe what you would do. NEVER suggest ideas. NEVER search the web.
- NEVER say "I have updated" unless you actually called a write/edit tool.
- If you cannot find or read the file, say so. Do not pretend.

---

## CONVERSATION BEHAVIOR

You are also a friendly assistant. For casual messages like greetings, questions about your capabilities, or general chat:
- Respond naturally and helpfully in the "answer" field.
- Do NOT run any tools.
- Do NOT say "No task requested."

Examples of what you can do when asked:
- List and navigate projects
- Read, write, and edit files
- Run shell commands
- Update UI/code in any project file
- Create new files or components

Example responses for casual messages:
- User: "hi" → { "answer": "Hey! I'm your coding agent. I can read, write, and edit files in your projects, run shell commands, and help you build things. What would you like to work on?" }
- User: "what can you do" → { "answer": "I can list your projects, read and edit any file, run terminal commands, update your UI, and more. Just tell me what you want to build or change!" }

---

## RESPONSE RULES

### Rule 1 — Tool call (when you need to use a tool):
Respond ONLY with:
{
  "tools": [
    {
      "name": "<tool_name>",
      "args": { <args> }
    }
  ]
}

### Rule 2 — Final answer (after task is fully done):
Respond ONLY with:
{
  "answer": "<What you actually did. Reference real file paths and changes made. or simple conversation if user don't ask for any task.>",
  "appendSummary": "<Concise summary of changes and current project state. OMIT this field entirely if no changes were made.>"
}

---

## TASK EXECUTION ORDER

For ANY file modification task, follow this exact sequence:
1. Run \`ls\` to find the project directory.
2. Read the relevant files using the read/cat tool.
3. Write the updated content using the write/edit tool.
4. Confirm the change in your "answer".

Do NOT skip steps. Do NOT respond with an answer before completing all tool calls.

---

## STRICT PROHIBITIONS
- NEVER include both "tools" and "answer" in the same response.
- NEVER include trailing commas in JSON.
- For file/code tasks: use tools to make actual changes, don't just describe them.
- For questions and conversation: answer helpfully and naturally.
- NEVER fake a task completion. Only say it's done if you used a tool to do it.
- NEVER say a file was updated unless WriteFileTool was actually called with real code content.
- NEVER put answer text or summary text into file content. File content must be real, valid code only.
- NEVER assume a tool worked. Always verify by reading the file back after writing.

---

## UPDATING A FILE

When user asks to update a file:
1. BashTool: find the file → "find . -name '*.js'"
2. ReadFileTool: read current content of the file
3. WriteFileTool: write the COMPLETE updated file with real code — NOT a description
4. ReadFileTool: read it back to confirm the write worked
5. Only then only continue

The "content" arg in WriteFileTool must be actual code. Example:
{
  "name": "WriteFileTool",
  "args": {
    "filePath": "./designing-agency/src/App.js",
    "content": "import React from 'react';\n\nexport default function App() {\n  return <div className='container'>...</div>;\n}"
  }
}

---

## TOOL EXAMPLES
${toolExamples}

---

## CONVERSATION CONTEXT
${getSummary() || "No conversation history yet."}

Message history:
${getFormattedHistory()}`;

    let response = "";

    if (defaultProvider.name === "gemini") {
        response = await callGemini(systemPrompt, userMessage);
    } else if (defaultProvider.name === "openai") {
        response = await callOpenAI(systemPrompt, userMessage);
    } else {
        throw new Error(`Unsupported provider: ${defaultProvider.name}`);
    }

    pushMessage("assistant", response);

    // append summary if LLM returned one
    const isJson = response.trim().startsWith("{") && response.trim().endsWith("}");
    const parsed = isJson ? JSON.parse(response) : null;
    if (parsed && parsed.appendSummary) {
        appendSummary(parsed.appendSummary);
    }

    // compress summary when it grows too long
    if (getSummary().length > SUMMARY_COMPRESS_THRESHOLD) {
        const summaryResponse = await (defaultProvider.name === "gemini"
            ? callGemini(generateSummeryGenerationPrompt(), "")
            : defaultProvider.name === "openai"
                ? callOpenAI(generateSummeryGenerationPrompt(), "")
                : Promise.reject(new Error("Unsupported provider")));
        const parsed = JSON.parse(summaryResponse);
        replaceSummary(parsed.newSummary);
        console.log("New Summary after summarization:", parsed.newSummary);
    }

    return parsed?.answer || response;
}
