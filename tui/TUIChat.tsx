import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import Spinner from "ink-spinner";
import { callLlm } from "../actions/llm";

interface TUIChatProps {}

type Message = {
  role: "user" | "assistant";
  content: string;
};

export function TUIChat(props: TUIChatProps): React.ReactElement {
  const [input, setInput] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [chunks, setChunks] = useState<number>();

  useInput((input, key) => {
    if (key.escape) {
      process.exit(0);
    }
  });

  async function handleSubmit(value: string) {
    if (!value.trim() || loading) return;

    // Add user message immediately
    const userMessage: Message = { role: "user", content: value };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const assistantMessage: Message = {
        role: "assistant",
        content: '',
      };
      setChunks(0);
      setMessages((prev) => [...prev, assistantMessage]);
      const llmResponse = await callLlm(value, (chunk: string) => {
        setChunks(prev => (prev || 0) + 1)
        assistantMessage.content += chunk;
      });
    } catch (err) {
      console.log(err)
      setError(err instanceof Error ? err.stack as string : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box borderStyle="round" borderColor="green" paddingX={1}>
        <Text color="green" bold>
          🧠 Claude Code
        </Text>
      </Box>
      <Text dimColor>Press Esc to exit</Text>

      {/* Messages */}
      <Box flexDirection="column" marginTop={1} marginBottom={1}>
        {messages.map((msg, index) => (
          <Box key={index} marginBottom={1}>
            <Text color={msg.role === "user" ? "cyan" : "yellow"}>
              {msg.role === "user" ? "You" : "Claude"}
              {": "}
            </Text>
            <Text>{msg.content}</Text>
          </Box>
        ))}
        {chunks !== undefined && chunks > 0 && (
          <Box marginBottom={1}>
            <Text color="blue">Received {chunks} chunks</Text>
          </Box>
        )}
        {loading && (
          <Box marginBottom={1}>
            <Text color="yellow">
              <Spinner type="dots" /> Claude is thinking...
            </Text>
          </Box>
        )}
        {error && (
          <Box marginBottom={1}>
            <Text color="red">⚠️ {error}</Text>
          </Box>
        )}
      </Box>

      {/* Input separator */}
      <Box borderStyle="single" borderColor="gray" marginBottom={1} />

      {/* Input line */}
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