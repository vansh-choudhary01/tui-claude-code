import { Command, program } from 'commander';
import { loginCommand } from './login';
import { logoutCommand } from './logout';
import { listCommand, setCommand } from './setProvider';

export const providerCommand = new Command("providers")
    .description("Provider related information")
    .addCommand(loginCommand)
    .addCommand(logoutCommand)
    .addCommand(listCommand)
    .addCommand(setCommand)