export type Message = {
    role: "user" | "assistant";
    content: string;
    createdAt: string;
};

export const messageHistory: Message[] = [];
export let summeryMemory: string = '';

export function pushMessage(role: Message["role"], content: string) {
    messageHistory.push({ role, content, createdAt: new Date().toISOString() });
}

export function appendSummary(text: string) {
    summeryMemory += "\n" + text;
}

export function replaceSummary(text: string) {
    summeryMemory = text;
}

export function getSummary(): string {
    return summeryMemory;
}

export function getFormattedHistory(): string {
    return messageHistory.map(m => `- ${m.role}: ${m.content}`).join("\n");
}

export function generateSummeryGenerationPrompt(): string {
    return `You are an assistant that summarizes the already summeryzed conversation. Your task is to generate a concise summary of the conversation so far, which can be used to provide context for future interactions. The summary should capture the main points and decisions made during the conversation, as well as any important details about the project updates that have been discussed. The summary should be clear, concise, and informative, providing a quick overview of the conversation history without going into unnecessary detail.
it needs summarize again because the summery memory has a token limit and now the conversation is too long to fit in the context window. Please generate a new summary that captures the most important information from the conversation while staying within the token limit.
try to cut 50% of the content from the original summery, but make sure to keep all important information and details. The goal is to create a more concise summary that still provides a clear overview of the conversation history and project updates. and respond only with the new summary and nothing else, don't explain anything. just give me the new summary. if the summery is already concise and short and doesn't need to be cut down, just return it as is without any changes. here is the original summery:
"${summeryMemory}",
response format:
{
  newSummary: "the new concise summary of the conversation so far, capturing the main points and decisions made during the conversation, as well as any important details about the project updates that have been discussed, while staying within the token limit, i'm directly switch my prev summery with this new summary so don't just add new summary here not your thoughts, just give me the new summary and nothing else, don't explain anything, just give me the new summary and nothing else",
  thoughts: "your reasoning about how you generated the new summary and what information you included or excluded to make it more concise while still capturing the main points and decisions made during the conversation, as well as any important details about the project updates that have been discussed"
}`;
}
