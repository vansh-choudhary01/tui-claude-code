import { Command } from "commander";
import { callLlm } from "../actions/llm";

export const agentCommand = new Command("agent")
  .description('Runs the agent')
  .option('-p, --prompt <prompt>', 'prompt', '')
  .action((options) => {
    console.log("User prompt is ..." + options.prompt);
    callLlm(options.prompt);
  });