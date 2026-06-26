import { Command } from 'commander';
import { render } from 'ink';
import React from 'react';
import { TUIChat } from '../tui/TUIChat'  // your component

export const chatCommand = new Command('chat')
  .description('Interactive chat TUI')
  .action(async (options) => {
    const { waitUntilExit } = render(<TUIChat />);
    await waitUntilExit();  // keeps process alive until user exits
  });