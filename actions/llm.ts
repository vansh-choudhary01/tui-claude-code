import { GoogleGenAI } from "@google/genai";
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
    tools: [{
        name: "WebSearch",
        args: {"query": "What is the capital of France?"}
    }, {
        name: "BashTool",
        args: {"command": "ls -la"}
    }, {
        name: "ReadFileTool",
        args: {"filePath": "/path/to/file.txt"}
    }, {
        name: "WriteFileTool",
        args: {"filePath": "/path/to/file.txt", "content": "Hello, World!"}
    }],
}`;

async function callGemini(prompt: string): Promise<string> {
    const genai = new GoogleGenAI({ apiKey: setKeys.gemini });
    const toolCalls: any[] = [];
    let initialPrompt = true;
    let finalPrompt = prompt;
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
        response = response.replace(/```json/g, "").replace(/```/g, "").trim();

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

export async function callLlm(userMessage: string): Promise<string> {
    pushMessage("user", userMessage);

    const prompt = `You are a helpful coding assistant. Use the following tools when needed: ${toolDescriptions}.
If you use a tool, respond ONLY with json in this format: {tools: [{ "name": "<tool_name>", "args": { <args> } }]}
tool examples:
${toolExamples}

otherwise, respond with a helpful answer to the user's message formatted as follows:
{
    "thoughts": "your reasoning about the user request and what files need to be updated and this will show directly to user so it's not include what you are thinking it's for user.",
    "appendSummary": "a concise summary of the changes made and the current state of the project after this update, and make sure don't repeat existing summery i'll just append this to the existing summery and use it as context for future interactions, and if no changes were made, stay silent and don't include this field in your response"
}

Previous summary:
${getSummary() || "No conversation yet."}

Message history:
${getFormattedHistory()}

User message: ${userMessage}`;

    let response = "";

    if (defaultProvider.name === "gemini") {
        response = await callGemini(prompt);
    } else {
        throw new Error(`Unsupported provider: ${defaultProvider.name}`);
    }

    pushMessage("assistant", response);

    // append summary if LLM returned one
    const isJson = response.trim().startsWith("{") && response.trim().endsWith("}");
    if (isJson) {
        const parsed = JSON.parse(response);
        if (parsed.appendSummary) {
            appendSummary(parsed.appendSummary);
        }
    }

    // compress summary when it grows too long
    if (getSummary().length > SUMMARY_COMPRESS_THRESHOLD) {
        const summaryResponse = await (defaultProvider.name === "gemini"
            ? callGemini(generateSummeryGenerationPrompt())
            : Promise.reject(new Error("Unsupported provider")));
        const parsed = JSON.parse(summaryResponse);
        replaceSummary(parsed.newSummary);
        console.log("New Summary after summarization:", parsed.newSummary);
    }

    return response;
}
