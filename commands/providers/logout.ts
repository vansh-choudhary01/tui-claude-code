import { Command } from 'commander';
import { providersList, setKeys } from '../../store/db';
import { resetDb } from '../../store/db1';

export const logoutCommand = new Command("logout")
    .description('Lets user logout from the provider')
    .option('-p, --provider <providerName>', 'Name of the provider (gemini, claude etc)', '')
    .action((options) => {
        console.log("logging out for provider " + options.provider)
        if (providersList.includes(options.provider)) {
            delete setKeys[options.provider];
            resetDb();
        }
    })

