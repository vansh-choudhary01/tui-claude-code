const fs = require('fs');
const path = require('path');

import { defaultProvider, IProvider, setKeys } from "./db";

const DEFAULT_DATA: IProvider = {
    defaultProvider: { name: 'gemini', model: 'gemini-3.1-pro-preview' },
    setKeys: {},
};

export const getDb = (): IProvider => {
    const filename = path.join(process.cwd(), '/store/data.json');

    if (!fs.existsSync(filename)) {
        fs.writeFileSync(filename, JSON.stringify(DEFAULT_DATA, null, 2));
        return DEFAULT_DATA;
    }

    const data = fs.readFileSync(filename, 'utf8');
    return JSON.parse(data);
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