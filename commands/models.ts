import { Command } from "commander";
import { providersModels } from "../store/db";

export const modelsCommand = new Command("models")
  .description('Returns all the supported models')
  .option('-m, --model <modelName>', 'name of the model', 'all')
  .action((options) => {
    console.log("Listing models...");

    // console.log(options)
    console.log(providersModels);
});