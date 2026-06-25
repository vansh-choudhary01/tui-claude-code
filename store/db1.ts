const fs = require('fs');
const path = require('path');
// fs.readFile('data.json', 'utf8', (err: any, data: { top: string, subTop: string | undefined, value: string | undefined }) => {
//     if (err) {
//         console.error('Error reading file:', err);
//         return;
//     }
//     const jsonData = JSON.parse(data);
//     console.log(jsonData);
//     //    if (data.top) {
//     //     jsonData.[data.top] = data.top;
//     //    }
//     //    if (data.subTop) {
//     //     jsonData.top.subTop = 
//     //    }

import { defaultProvider, IProvider, setKeys } from "./db";

// });

// Filename - index.js

// // Requiring fs module
// const fs = require("fs");

// // Storing the JSON format data in myObject
// var data = fs.readFileSync("data.json");
// var myObject = JSON.parse(data);

// // Defining new data to be added
// let newData = {
//     country: "England",
// };

// // Adding the new data to our object
// myObject.push(newData);

// // Writing to our JSON file
// fs.writeFile("data2.json", newData2, (err) => {
//     // Error checking
//     if (err) throw err;
//     console.log("New data added");
// });

export const getDb = (): IProvider => {
    // const filename = command + "\" + "data.json";
    // Build the file path safely
    const filename = path.join(process.cwd(), '/store/data.json');

    // Read file synchronously with UTF-8 encoding
    const data = fs.readFileSync(filename, 'utf8');
    // var data = fs.readFileSync(filename);
    var myObject = JSON.parse(data);
    return myObject;
}

export const resetDb = () => {
    const myObject: IProvider = {
        defaultProvider: defaultProvider,
        setKeys: setKeys,
    }
    var newData2 = JSON.stringify(myObject);
    const filename = path.join(process.cwd(), '/store/data.json');
    fs.writeFile(filename, newData2, (err: any) => {
        // Error checking
        if (err) throw err;
        console.log("New data added");
    });
}