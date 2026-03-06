import { prisma } from '../../db';

export interface AiConfig {
    provider: 'none' | 'ollama' | 'openai';
    model: string;
    endpoint: string;
    temperature: number;
    maxTokens: number;
    timeout: number;
}

const DEFAULTS: AiConfig = {
    provider: 'none',
    model: 'llama3',
    endpoint: 'http://ollama:11434',
    temperature: 0.3,
    maxTokens: 4096,
    timeout: 30000,
};

export async function getAiConfig(): Promise<AiConfig> {
    const settings = await prisma.systemSetting.findMany({
        where: { category: 'llm' },
    });

    const map = new Map<string, string>(settings.map(s => [s.key, s.value]));

    return {
        provider: (map.get('llm.provider') as AiConfig['provider']) || DEFAULTS.provider,
        model: map.get('llm.model') || DEFAULTS.model,
        endpoint: map.get('llm.endpoint') || DEFAULTS.endpoint,
        temperature: parseFloat(map.get('llm.temperature') || String(DEFAULTS.temperature)),
        maxTokens: parseInt(map.get('llm.maxTokens') || String(DEFAULTS.maxTokens), 10),
        timeout: parseInt(map.get('llm.timeout') || String(DEFAULTS.timeout), 10),
    };
}

export function isAiAvailable(config: AiConfig): boolean {
    return config.provider !== 'none';
}
