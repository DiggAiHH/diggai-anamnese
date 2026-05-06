import { getAiConfig, isAiAvailable, type AiConfig } from './ai-config';
import { callLlm, checkLlmHealth } from './llm-client';
import { PROMPT_TEMPLATES, renderTemplate } from './prompt-templates';
import { aggregateSessionContext } from './context-aggregator';
import {
    parseLlmJson,
    validateTherapySuggestion,
    type TherapySuggestion,
    type SessionSummary,
    type IcdSuggestionResult,
} from './response-parser';
import { suggestIcdCodes, generateRuleSummary } from './lite-engine.service';
import { requireDecisionSupport } from '../../config/featureFlags';
import * as crypto from 'crypto';

// Class-IIa-Schutz: Diese Engine produziert klinische Entscheidungs-Hinweise
// (Therapie-Vorschlag, ICD-Codierung, Session-Summary). In einem Capture-Build
// (DECISION_SUPPORT_ENABLED=false) MUSS jeder Aufruf hart failen — damit ist
// die Class-I-Position auch dann gewährleistet, wenn versehentlich ein Suite-
// Code-Pfad in den Capture-Bundle gelangt. Anker: DiggAi-Restrukturierungs-
// Plan v1.0 §6.2 (Stufe 2) und Open-Items-Tracker B4.

export interface AiEngineStatus {
    available: boolean;
    provider: string;
    model: string;
    online: boolean;
    models?: string[];
}

export class AiEngine {
    private configCache: AiConfig | null = null;
    private configCacheTime = 0;
    private readonly CACHE_TTL = 60_000;

    private async getConfig(): Promise<AiConfig> {
        const now = Date.now();
        if (this.configCache && now - this.configCacheTime < this.CACHE_TTL) {
            return this.configCache;
        }
        this.configCache = await getAiConfig();
        this.configCacheTime = now;
        return this.configCache;
    }

    async getStatus(): Promise<AiEngineStatus> {
        const config = await this.getConfig();
        if (!isAiAvailable(config)) {
            return { available: false, provider: 'none', model: config.model, online: false };
        }
        const health = await checkLlmHealth(config);
        return {
            available: true,
            provider: config.provider,
            model: config.model,
            online: health.online,
            models: health.models,
        };
    }

    async suggestTherapy(sessionId: string): Promise<{
        suggestion: TherapySuggestion;
        aiModel: string;
        aiConfidence: number;
        aiPromptHash: string;
        durationMs: number;
        mode: 'pro' | 'lite';
    }> {
        requireDecisionSupport('AiEngine.suggestTherapy');
        const config = await this.getConfig();
        const ctx = await aggregateSessionContext(sessionId);

        if (!isAiAvailable(config)) {
            // Lite mode fallback
            const icdSugg = suggestIcdCodes(ctx.symptoms);
            const suggestion: TherapySuggestion = {
                diagnosis: icdSugg[0]?.display || 'Nicht spezifiziert',
                icdCodes: icdSugg.map(s => s.code),
                confidence: icdSugg[0]?.confidence || 0.3,
                summary: generateRuleSummary(
                    ctx.answers.split('\n').filter(Boolean).map(line => {
                        const [q, ...rest] = line.replace(/^- /, '').split(': ');
                        return { question: q, value: rest.join(': ') };
                    })
                ),
                measures: [],
                warnings: ['Regelbasierter Vorschlag — keine KI-Analyse verfügbar'],
            };
            return {
                suggestion,
                aiModel: 'lite-rules-v1',
                aiConfidence: suggestion.confidence,
                aiPromptHash: '',
                durationMs: 0,
                mode: 'lite',
            };
        }

        const prompt = renderTemplate(PROMPT_TEMPLATES.THERAPY_SUGGEST, ctx as unknown as Record<string, string>);
        const promptHash = crypto.createHash('sha256').update(prompt).digest('hex').slice(0, 16);

        const response = await callLlm(config, prompt, PROMPT_TEMPLATES.SYSTEM_MEDICAL);
        const parsed = parseLlmJson(response.text);
        const suggestion = validateTherapySuggestion(parsed);

        return {
            suggestion,
            aiModel: response.model,
            aiConfidence: suggestion.confidence,
            aiPromptHash: promptHash,
            durationMs: response.durationMs,
            mode: 'pro',
        };
    }

    async summarizeSession(sessionId: string): Promise<{
        summary: SessionSummary;
        aiModel: string;
        durationMs: number;
        mode: 'pro' | 'lite';
    }> {
        requireDecisionSupport('AiEngine.summarizeSession');
        const config = await this.getConfig();
        const ctx = await aggregateSessionContext(sessionId);

        if (!isAiAvailable(config)) {
            const answerParts = ctx.answers.split('\n').filter(Boolean).map(line => {
                const [q, ...rest] = line.replace(/^- /, '').split(': ');
                return { question: q, value: rest.join(': ') };
            });
            return {
                summary: {
                    chiefComplaint: 'Regelbasierte Zusammenfassung',
                    historyOfPresentIllness: generateRuleSummary(answerParts),
                    suggestedIcdCodes: suggestIcdCodes(ctx.symptoms).map(s => s.code),
                },
                aiModel: 'lite-rules-v1',
                durationMs: 0,
                mode: 'lite',
            };
        }

        const prompt = renderTemplate(PROMPT_TEMPLATES.SESSION_SUMMARY, ctx as unknown as Record<string, string>);
        const response = await callLlm(config, prompt, PROMPT_TEMPLATES.SYSTEM_MEDICAL);
        const summary = parseLlmJson<SessionSummary>(response.text);

        return {
            summary,
            aiModel: response.model,
            durationMs: response.durationMs,
            mode: 'pro',
        };
    }

    async suggestIcd(symptoms: string): Promise<{
        suggestions: IcdSuggestionResult['suggestions'];
        mode: 'pro' | 'lite';
    }> {
        requireDecisionSupport('AiEngine.suggestIcd');
        const config = await this.getConfig();

        if (!isAiAvailable(config)) {
            return {
                suggestions: suggestIcdCodes(symptoms).map(s => ({
                    ...s,
                    reasoning: 'Keyword-basiert',
                })),
                mode: 'lite',
            };
        }

        const prompt = renderTemplate(PROMPT_TEMPLATES.ICD_SUGGEST, { symptoms });
        const response = await callLlm(config, prompt, PROMPT_TEMPLATES.SYSTEM_MEDICAL);
        const result = parseLlmJson<IcdSuggestionResult>(response.text);

        return { suggestions: result.suggestions || [], mode: 'pro' };
    }
}

export const aiEngine = new AiEngine();
