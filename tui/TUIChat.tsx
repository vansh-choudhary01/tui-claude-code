import React, { useState, useRef } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
// Using a simple emoji instead of ink-spinner to avoid incompatible JSX types
import { callLlm } from "../actions/llm";
import Spinner from "ink-spinner";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export function TUIChat(): React.ReactElement {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chunks, setChunks] = useState(0);
  const [thinkingText, setThinkingText] = useState(""); // accumulates chunks

  useInput((_, key) => {
    if (key.escape) process.exit(0);
  });

  async function handleSubmit(value: string) {
    if (!value.trim() || loading) return;

    // Add user message
    setMessages((prev) => [...prev, { role: "user", content: value }]);
    setInput("");
    setLoading(true);
    setError(null);
    setChunks(0);
    setThinkingText("");

    try {
      // Stream chunks, append to thinkingText
      const response = await callLlm(value, (chunk: string) => {
        setChunks((prev) => prev + 1);
        setThinkingText((prev) => prev + chunk);
      });

      // After stream finishes, add the final assistant message
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response },
      ]);
      setThinkingText(""); // clear thinking area
    } catch (err) {
      setError(err instanceof Error ? err.stack as string : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box borderStyle="round" borderColor="green" paddingX={1}>
        <Text color="green" bold>🧠 Claude Code</Text>
      </Box>
      <Text dimColor>Press Esc to exit</Text>

      {/* Messages */}
      <Box flexDirection="column" marginTop={1} marginBottom={1}>
        {messages.map((msg, idx) => (
          <Box key={idx} marginBottom={1}>
            <Text color={msg.role === "user" ? "cyan" : "yellow"}>
              {msg.role === "user" ? "You" : "Claude"}:{" "}
            </Text>
            <Text>{msg.content}</Text>
          </Box>
        ))}

        {/* Thinking area (only shown while loading) */}
        {loading && (
          <Box marginBottom={1} flexDirection="column">
            <Box>
              <Text color="yellow">
                <Spinner/> Thinking
                {chunks > 0 && ` (${chunks} chunks received)`}
              </Text>
            </Box>
            {thinkingText && (
              <Box paddingLeft={2}>
                <Text dimColor>{thinkingText}</Text>
              </Box>
            )}
          </Box>
        )}

        {/* Error */}
        {error && (
          <Box marginBottom={1}>
            <Text color="red">⚠️ {error}</Text>
          </Box>
        )}
      </Box>

      {/* Separator */}
      <Box borderStyle="single" borderColor="gray" marginBottom={1} />

      {/* Input */}
      <Box>
        <Text color="green">{"> "}</Text>
        <TextInput
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          placeholder="Type your message..."
        />
      </Box>
    </Box>
  );
}