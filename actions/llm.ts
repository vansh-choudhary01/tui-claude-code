import { GoogleGenAI } from "@google/genai";
import { defaultProvider, setKeys } from "../store/db";
import { getJson } from "serpapi";

interface Tool {
    name: string;
    description: string;
    args: Array<{
        name: string;
        type: string;
        description: string;
    }>;
}

interface SearchResult {
    title: string;
    link: string;
    snippet: string;
}

interface WebSearchResponse {
    organic_results?: Array<{
        title: string;
        link: string;
        snippet: string;
    }>;
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

const tools: Tool[] = [{
    name: "WebSearch",
    description: "Search on the web for up-to-date information.",
    args: [{
        name: "query",
        type: "string",
        description: "The search query."
    }]
}];

export async function callLlm(prompt: string): Promise<void> {
    prompt = prompt;
    let finalPrompt = `You are a helpful coding assistant. Use the following tool when needed: ${tools.map(t => `${t.name}: ${t.description} : ${t.args.map(a => `${a.name}: ${a.type}`).join(", ")}`).join("; ")}. Always use tools when you think they can help you get the right answer. If you use a tool, use the following format: {tools: [{ "name": "<tool_name>", "args": { <args> } }]}. Here is user asked: ${prompt}
            tool examples:
            {
                tools: [{
                    name: "WebSearch",
                    args: {"query": "What is the capital of France?"}
                }, {
                    name: "Tool2",
                    args: {"arg1": "value1", "arg2": "value2"}
                }],
            }, 
            if you are using a tool, then only respond with json, tools array with the format mentioned above, do not include any other text in your response. If you are not using any tool, then respond with the answer to the question without mentioning anything about tools.
            `;

    if (defaultProvider.name === "gemini") {
        const genai = new GoogleGenAI({
            apiKey: setKeys.gemini
        });
        const toolCalls = [];
        let initialPrompt = true;

        let response = "";
        while (toolCalls.length > 0 || initialPrompt) {
            initialPrompt = false;
            const toolCallResults = [];

            if (toolCalls.length > 0) {
                for (const toolCall of toolCalls) {
                    console.log("Processing tool call:", toolCall);
                    if (toolCall.name === "WebSearch") {
                        const args = toolCall.args;
                        const searchResult = await WebSearch(args.query);
                        console.log("WebSearch result:", searchResult);
                        toolCallResults.push({
                            tool: "WebSearch",
                            args,
                            result: searchResult
                        });
                    } else {
                        console.log(`Unknown tool: ${toolCall.name}`);
                    }
                }

                if (toolCallResults.length > 0) {
                    finalPrompt += `\nTool call results: ${JSON.stringify(toolCallResults)}\nBased on the above tool call results, answer the original question: ${prompt}`;
                }
            }
            const responseStream = await genai.models.generateContentStream({
                model: defaultProvider.model,
                contents: finalPrompt, // You can format this prompt as needed
            })

            for await (const part of responseStream) {
                response += part.text;
                console.log(part.text);
                // await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate streaming delay
            }

            const isJson = response.trim().startsWith("{") && response.trim().endsWith("}");

            const parsedResponse = isJson ? JSON.parse(response) : null;
            if (parsedResponse && parsedResponse.tools) {
                toolCalls.push(...parsedResponse.tools);
            } else {
                toolCalls.length = 0; // Clear tool calls to exit loop if response is not a tool call
            }
            finalPrompt = `prev context - ${finalPrompt}\nYou responded with: ${response}\nIf you need to call any tools to answer the question then use this format
            tool examples:
            {
            tools: [{
                name: "WebSearch",
                args: {"query": "What is the capital of France?"}
            }, {
                name: "Tool2",
                args: {"arg1": "value1", "arg2": "value2"}
            }]
        }
            if you are using a tool, then only respond with json tools array with the format mentioned above, do not include any other text in your response. If you are not using any tool, then respond with the answer to the question without mentioning anything about tools.
            `;
        }

        return;
    }

    throw new Error(`Unsupported provider: ${defaultProvider.name}`);
}

async function WebSearch(query: string): Promise<WebSearchResult> {
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