import { type AiConfig } from './ai-config';

/**
 * SECURITY: Patterns for detecting prompt injection attempts
 * These patterns identify common jailbreak and prompt manipulation techniques
 */
const INJECTION_PATTERNS = [
    /ignore\s+(previous|all|the)\s+(instructions?|prompt|context)/i,
    /system\s*prompt/i,
    /override\s+(instructions?|rules?)/i,
    /disregard\s+(previous|all)/i,
    /\bDAN\b|\bdo\s+anything\s+now\b/i,
    /jailbreak/i,
    /\[\s*insert\s+/i,
    /\{\s*system\s*\}/i,
    /new\s+command:/i,
    /you\s+are\s+now/i,
    /from\s+now\s+on/i,
    /forget\s+(everything|all|previous)/i,
    /pretend\s+you\s+are/i,
    /act\s+as\s+(if\s+you\s+are)?/i,
    /roleplay\s+as/i,
    /\[\/system\]/i,
    /\[\/user\]/i,
    /\[\/assistant\]/i,
    /<\|system\|>/i,
    /<\|user\|>/i,
    /<\|assistant\|>/i,
];

const MAX_INPUT_LENGTH = 4000;

/**
 * SECURITY: Detects potential prompt injection attempts in user input
 * @param input - The user input to analyze
 * @returns Detection result with pattern information
 */
export function detectPromptInjection(input: string): { 
    detected: boolean; 
    pattern?: string; 
    matches: string[];
} {
    const matches: string[] = [];
    
    for (const pattern of INJECTION_PATTERNS) {
        if (pattern.test(input)) {
            matches.push(pattern.source);
        }
    }
    
    return {
        detected: matches.length > 0,
        pattern: matches.length > 0 ? matches[0] : undefined,
        matches,
    };
}

/**
 * SECURITY: Sanitizes user input before sending to LLM.
 * Prevents prompt injection attacks by removing control characters
 * and limiting input length.
 * 
 * Enhanced with injection detection (HIGH-003 Fix)
 */
export function sanitizeForLlm(input: string): { 
    sanitized: string; 
    blocked: boolean; 
    warnings: string[];
} {
    const warnings: string[] = [];
    
    if (typeof input !== 'string') {
        return { 
            sanitized: '', 
            blocked: true, 
            warnings: ['Input must be a string'] 
        };
    }
    
    // Check for injection attempts
    const injectionCheck = detectPromptInjection(input);
    if (injectionCheck.detected) {
        warnings.push(`Potential prompt injection detected: ${injectionCheck.matches.join(', ')}`);
        // Log security event (don't expose details to user)
        console.warn(`[Security] Prompt injection attempt detected: ${injectionCheck.matches.length} pattern(s)`);
    }
    
    let sanitized = input
        // Remove potential prompt control characters
        .replace(/[<>{}[\]]/g, '')
        // Remove null bytes
        .replace(/\x00/g, '')
        // Remove control characters (except newlines and tabs)
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    
    // Check length limit to prevent DoS
    if (sanitized.length > MAX_INPUT_LENGTH) {
        warnings.push(`Input truncated from ${sanitized.length} to ${MAX_INPUT_LENGTH} characters`);
        sanitized = sanitized.slice(0, MAX_INPUT_LENGTH);
    }
    
    return {
        sanitized,
        blocked: injectionCheck.detected,
        warnings,
    };
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

    // SECURITY: Block requests with detected injection attempts
    if (sanitizedPrompt.blocked) {
        console.warn('[Security] Blocking LLM request due to detected prompt injection');
    }

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: config.model,
                prompt: sanitizedPrompt.sanitized,
                system: sanitizedSystemPrompt?.sanitized,
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

    // SECURITY: Block requests with detected injection attempts
    if (sanitizedPrompt.blocked) {
        console.warn('[Security] Blocking LLM request due to detected prompt injection');
    }

    const messages: { role: string; content: string }[] = [];
    if (sanitizedSystemPrompt?.sanitized) messages.push({ role: 'system', content: sanitizedSystemPrompt.sanitized });
    messages.push({ role: 'user', content: sanitizedPrompt.sanitized });

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
