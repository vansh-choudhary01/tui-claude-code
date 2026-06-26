import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { callLlm } from "../actions/llm";

interface TUIChatProps {}

type Message = string;

interface SubmitHandler {
  (value: string): void;
}

export function TUIChat(props: TUIChatProps): React.ReactElement {
  const [input, setInput] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);

  useInput((input, key) => {
    if (key.escape) {
      process.exit(0);
    }
  });

  async function handleSubmit(value: string) {
    if (!value.trim()) return;

    // const llmResponse = await callLlm(value); // Call the LLM with the user input

    setMessages((prev) => [
      ...prev,
      `You: ${value}`,
      `AI: Received "${value}"`, // Display the LLM response
    ]);

    setInput("");
  }

  return (
    <Box flexDirection="column">
      <Text color="green">opencode TUI Chat</Text>
      <Text dimColor>Press Esc to exit</Text>

      <Box flexDirection="column" marginTop={1}>
        {messages.map((msg, index) => (
          <Text key={index}>{msg}</Text>
        ))}
      </Box>

      <Box marginTop={1}>
        <Text>{"> "}</Text>
        <TextInput
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
        />
      </Box>
    </Box>
  );
}