import { type AiConfig } from './ai-config';

export interface LlmResponse {
    text: string;
    model: string;
    promptTokens?: number;
    completionTokens?: number;
    durationMs: number;
}

export async function callLlm(config: AiConfig, prompt: string, systemPrompt?: string): Promise<LlmResponse> {
    const start = Date.now();

    if (config.provider === 'ollama') {
        return callOllama(config, prompt, systemPrompt, start);
    }
    if (config.provider === 'openai') {
        return callOpenAi(config, prompt, systemPrompt, start);
    }

    throw new Error(`LLM provider "${config.provider}" not configured`);
}

async function callOllama(config: AiConfig, prompt: string, systemPrompt: string | undefined, start: number): Promise<LlmResponse> {
    const url = `${config.endpoint}/api/generate`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.timeout);

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: config.model,
                prompt,
                system: systemPrompt,
                stream: false,
                options: {
                    temperature: config.temperature,
                    num_predict: config.maxTokens,
                },
            }),
            signal: controller.signal,
        });

        if (!res.ok) {
            const errText = await res.text().catch(() => '');
            throw new Error(`Ollama error ${res.status}: ${errText}`);
        }

        const data = await res.json();
        return {
            text: data.response || '',
            model: data.model || config.model,
            promptTokens: data.prompt_eval_count,
            completionTokens: data.eval_count,
            durationMs: Date.now() - start,
        };
    } finally {
        clearTimeout(timer);
    }
}

async function callOpenAi(config: AiConfig, prompt: string, systemPrompt: string | undefined, start: number): Promise<LlmResponse> {
    const url = `${config.endpoint}/v1/chat/completions`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.timeout);

    const messages: { role: string; content: string }[] = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: prompt });

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(process.env.OPENAI_API_KEY && { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }),
            },
            body: JSON.stringify({
                model: config.model,
                messages,
                temperature: config.temperature,
                max_tokens: config.maxTokens,
            }),
            signal: controller.signal,
        });

        if (!res.ok) {
            const errText = await res.text().catch(() => '');
            throw new Error(`OpenAI-compatible error ${res.status}: ${errText}`);
        }

        const data = await res.json();
        return {
            text: data.choices?.[0]?.message?.content || '',
            model: data.model || config.model,
            promptTokens: data.usage?.prompt_tokens,
            completionTokens: data.usage?.completion_tokens,
            durationMs: Date.now() - start,
        };
    } finally {
        clearTimeout(timer);
    }
}

export async function checkLlmHealth(config: AiConfig): Promise<{ online: boolean; models?: string[] }> {
    try {
        if (config.provider === 'ollama') {
            const res = await fetch(`${config.endpoint}/api/tags`, { signal: AbortSignal.timeout(5000) });
            if (!res.ok) return { online: false };
            const data = await res.json();
            return { online: true, models: data.models?.map((m: any) => m.name) };
        }
        if (config.provider === 'openai') {
            const res = await fetch(`${config.endpoint}/v1/models`, {
                headers: process.env.OPENAI_API_KEY ? { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` } : {},
                signal: AbortSignal.timeout(5000),
            });
            return { online: res.ok };
        }
        return { online: false };
    } catch {
        return { online: false };
    }
}
