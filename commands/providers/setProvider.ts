
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