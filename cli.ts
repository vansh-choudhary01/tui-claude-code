import { program } from 'commander';
import { modelsCommand } from './commands/models';
import { agentCommand } from './commands/agent';
import { providerCommand } from './commands/providers';
import { chatCommand } from './commands/chat';
import fs from 'fs';
import path from 'path';

const WORKSPACE_DIR = path.join(process.cwd(), '.agent_workspace', 'projects');
fs.mkdirSync(WORKSPACE_DIR, { recursive: true });

program
  .name('opencode')
  .description('Coding agent cli')
  .version('0.1.0')
  .addCommand(chatCommand)
  .addCommand(modelsCommand)
  .addCommand(agentCommand)
  .addCommand(providerCommand);

program.parse();
