// export const provider = {
//     name: 'gemini',

import { getDb } from "./db1";

// }
export const defaultProvider = getDb().defaultProvider;

export const setKeys = getDb().setKeys;

export const providersList = ['gemini', 'chatgpt', 'anthropic'];

export const providersModels = {
    gemini: [
        'gemini-2.5-flash',
        'gemini-2.5-flash-lite',
        'gemini-2.5-pro'
    ],
    chatgpt: [
        'gpt-4.1',
        'gpt-4o',
        'gpt-4o-mini'
    ],
    anthropic: [
        'claude-sonnet-4-20250514',
        'claude-opus-4-20250514',
        'claude-3-5-haiku-latest'
    ]
}

export interface IProvider {
    defaultProvider: {
        name: string,
        model: string,
    }
    setKeys: Record<string, string>,
}
