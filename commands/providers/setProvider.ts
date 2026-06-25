
import { Command } from 'commander';
import { loginCommand } from './login';
import { defaultProvider, providersList } from '../../store/db';
import { resetDb } from '../../store/db1';

export const listCommand = new Command("list")
.description('List all the available providers')
    .action(() => {
        console.log(providersList.join('\n'));
    })

export const setCommand = new Command("set")
.description('Set the default provider')
    .argument('<providerName>', 'Name of the provider (gemini, claude etc)')
    .argument('<modelName>', 'Name of the model')
    .action((providerName, modelName) => {
        console.log('Setting default provider to ' + providerName);
        console.log('and model to ' + modelName)
        if (providersList.includes(providerName)) {
            defaultProvider.name = providerName;
            defaultProvider.model = modelName;
            resetDb();
            console.log('Default provider is set to ' + providerName);
        } else {
            console.log('Provider not found');
        }
    })

export const setProviderCommand = new Command("providers")
    .description('Lets user set the default provider')
    .option('-p, --provider <providerName>', 'Name of the provider (gemini, claude etc)', '')
    .action((options) => {
        console.log("provider is  " + JSON.stringify(options))
    })

    // .addCommand(loginCommand)
    // .command('list')
    // .description('List all the available providers')
    // .action(() => {
    //     console.log(providersList.join('\n'));
    // })
    // .command('set')
    // .description('Set the default provider')
    // .argument('<providerName>', 'Name of the provider (gemini, claude etc)')
    // .argument('<modelName>', 'Name of the model')
    // .action((providerName, modelName) => {
    //     console.log('Setting default provider to ' + providerName);
    //     console.log('and model to ' + modelName)
    //     if (providersList.includes(providerName)) {
    //         defaultProvider.name = providerName;
    //         defaultProvider.model = modelName;
    //         resetDb();
    //         console.log('Default provider is set to ' + providerName);
    //     } else {
    //         console.log('Provider not found');
    //     }
    // })



//     program
//  .command('add <a> <b>')
//  .description('Add two numbers')
//  .action((a, b) => {
//    console.log(`Result: ${parseInt(a) + parseInt(b)}`);
//  });
// program
//  .command('subtract <a> <b>')
//  .description('Subtract two numbers')
//  .action((a, b) => {
//    console.log(`Result: ${a - b}`);
//  });
// program.parse(process.argv);