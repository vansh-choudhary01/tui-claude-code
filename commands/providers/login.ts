
import { Command } from 'commander';
import { providersList, setKeys } from '../../store/db';
import { resetDb } from '../../store/db1';

export const loginCommand = new Command("login")
    .description('Lets user login into the provider (use it as default)')
    .option('-p, --provider <providerName>', 'Name of the provider (gemini, claude etc)', '')
    .option('-a, --api_key <apiKey>', 'Your api key', '')
    .action((options) => {
        console.log("logging into " + JSON.stringify(options))
        if (providersList.includes(options.provider)) {
            setKeys[options.provider] = options.api_key;
            resetDb();
        }
    })
    // .command('--provider <providerName>')
    // .description('provider name')
    // .action((provider) => {
    //     console.log(provider)
    //     if (providersList.includes(provider)) {
    //         console.log("provider is valid")
    //     } else {
    //         console.log("provider is invalid")
    //     }
    // })

// import { program } from 'commander';

// program
//   .option('--first')
//   .option('-s, --separator <char>')
//   .argument('<string>');

// program.parse();

// const options = program.opts();
// const limit = options.first ? 1 : undefined;
// console.log(program.args[0].split(options.separator, limit));