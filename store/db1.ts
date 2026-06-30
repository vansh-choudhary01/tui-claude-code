const fs = require('fs');
const path = require('path');

import { defaultProvider, IProvider, setKeys } from "./db";

export const getDb = (): IProvider => {
    const filename = path.join(process.cwd(), '/store/data.json');

    const data = fs.readFileSync(filename, 'utf8');
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
        if (err) throw err;
        console.log("New data added");
    });
}