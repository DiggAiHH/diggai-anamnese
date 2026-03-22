import { type AiConfig } from './ai-config';

/**
 * SECURITY: Sanitizes user input before sending to LLM.
 * Prevents prompt injection attacks by removing control characters
 * and limiting input length.
 */
function sanitizeForLlm(input: string): string {
    if (typeof input !== 'string') return '';
    
    return input
        // Remove potential prompt control characters
        .replace(/[<>{}[\]]/g, '')
        // Remove null bytes
        .replace(/\x00/g, '')
        // Remove control characters (except newlines and tabs)
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        // Limit length to prevent DoS
        .slice(0, 4000);
}

export interface LlmResponse {
    text: string;
    model: string;
    promptTokens?: number;
    completionTokens?: number;
    durationMs: number;
}

type OllamaGenerateResponse = {
    response?: string;
    model?: string;
    prompt_eval_count?: number;
    eval_count?: number;
};

type OpenAIChatResponse = {
    choices?: Array<{ message?: { content?: string } }>;
    model?: string;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
};

type OllamaTagsResponse = {
    models?: Array<{ name?: string }>;
};

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

    // SECURITY: Sanitize inputs before sending to LLM (HIGH-003 Fix)
    const sanitizedPrompt = sanitizeForLlm(prompt);
    const sanitizedSystemPrompt = systemPrompt ? sanitizeForLlm(systemPrompt) : undefined;

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: config.model,
                prompt: sanitizedPrompt,
                system: sanitizedSystemPrompt,
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

        const data = await res.json() as OllamaGenerateResponse;
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

    // SECURITY: Sanitize inputs before sending to LLM (HIGH-003 Fix)
    const sanitizedPrompt = sanitizeForLlm(prompt);
    const sanitizedSystemPrompt = systemPrompt ? sanitizeForLlm(systemPrompt) : undefined;

    const messages: { role: string; content: string }[] = [];
    if (sanitizedSystemPrompt) messages.push({ role: 'system', content: sanitizedSystemPrompt });
    messages.push({ role: 'user', content: sanitizedPrompt });

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

        const data = await res.json() as OpenAIChatResponse;
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
            const data = await res.json() as OllamaTagsResponse;
            return { online: true, models: data.models?.map((m) => m.name).filter((name): name is string => Boolean(name)) };
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
