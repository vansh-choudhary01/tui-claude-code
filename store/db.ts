// export const provider = {
//     name: 'gemini',

import { getDb } from "./db1";

// }
export const defaultProvider = getDb().defaultProvider;

export const setKeys = getDb().setKeys;

export const providersList = ['gemini', 'chatgpt', 'anthropic'];

export const providersModels = {
    gemini: [
        'gemini-pro',
        'gemini-flash',
        'gemini-ultra'
    ],
    chatgpt: [
        'gpt-4',
        'gpt-3.5-turbo',
        'gpt-4-turbo'
    ],
    anthropic: [
        'claude-3-opus',
        'claude-3-sonnet',
        'claude-3-haiku'
    ]
}

export interface IProvider {
    defaultProvider: {
        name: string,
        model: string,
    }
    setKeys: Record<string, string>,
}
