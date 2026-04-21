import type { Question, Answer, ConditionalRouting } from '../types/question';
import i18n from '../i18n';
import {
    getQuestionTriageMessageKey,
    getQuestionValidationKey,
    translateStableText,
} from '../lib/patientFlow';

/** Context passed through the question logic for conditional evaluation */
interface QuestionContext {
    gender?: string;
    age?: number | null;
    selectedReason?: string;
    [key: string]: unknown;
}

/**
 * Calculates age from birth date
 */
export function calculateAge(birthDate: Date): number {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

/**
 * Validates a single answer based on question rules
 */
export function validateAnswer(
    question: Question,
    value: string | string[] | boolean | number | Record<string, unknown> | Date | null | undefined,
    allAnswers?: Record<string, Answer>
): string | null {
    if (question.validation?.required && (value === undefined || value === null || value === '')) {
        return i18n.t('validation.please_fill', 'Bitte füllen Sie dieses Pflichtfeld aus');
    }

    if (question.type === 'number' && value !== '') {
        const num = Number(value);

        // Age-conditional min validation
        let effectiveMin = question.validation?.min;
        if (question.validation?.ageConditionalMin && allAnswers) {
            const birthDateAnswer = allAnswers['0003'];
            if (birthDateAnswer?.value) {
                const birthDate = new Date(birthDateAnswer.value as string);
                if (!isNaN(birthDate.getTime())) {
                    const age = calculateAge(birthDate);
                    const { ageThreshold, minIfBelow, minIfAbove } = question.validation.ageConditionalMin;
                    effectiveMin = age < ageThreshold ? minIfBelow : minIfAbove;
                }
            }
        }

        if (effectiveMin !== undefined && num < effectiveMin) {
            return i18n.t('validation.minValue', { min: effectiveMin, defaultValue: 'Hier passt ein Wert ab {{min}}.' });
        }
        if (question.validation?.max !== undefined && num > question.validation.max) {
            return i18n.t('validation.maxValue', { max: question.validation.max, defaultValue: 'Hier passt ein Wert bis {{max}}.' });
        }
    }

    // Pattern validation for text, email, and tel types
    if ((question.type === 'text' || question.type === 'email' || question.type === 'tel') && value !== '' && value !== undefined && value !== null) {
        if (question.validation?.pattern) {
            const regex = new RegExp(question.validation.pattern);
            if (typeof value === 'string' && !regex.test(value)) {
                return question.validation.customMessage
                    ? translateStableText(i18n.t.bind(i18n), getQuestionValidationKey(question.id, 'customMessage'), question.validation.customMessage)
                    : i18n.t('validation.invalidFormat', 'Das Format passt noch nicht ganz — schauen Sie bitte kurz drauf.');
            }
        }
    }

    if (question.type === 'date' && value instanceof Date) {
        if (question.validation?.ageOver) {
            if (calculateAge(value) < question.validation.ageOver) {
                return question.validation.customMessage
                    ? translateStableText(i18n.t.bind(i18n), getQuestionValidationKey(question.id, 'customMessage'), question.validation.customMessage)
                    : i18n.t('validation.ageOver', { age: question.validation.ageOver, defaultValue: 'Für diesen Bereich brauchen wir ein Alter ab {{age}} Jahren.' });
            }
        }
    }

    // Cross-field validation: at least one of the specified fields must be filled
    if (question.validation?.crossFieldRequired && allAnswers) {
        const { fields, message } = question.validation.crossFieldRequired;
        const anyFilled = fields.some(fieldId => {
            const answer = fieldId === question.id ? value : allAnswers[fieldId]?.value;
            return answer !== undefined && answer !== null && answer !== '';
        });
        if (!anyFilled) {
            return translateStableText(i18n.t.bind(i18n), getQuestionValidationKey(question.id, 'crossFieldRequired'), message);
        }
    }

    return null;
}

/**
 * Determines if a question should be shown based on its showIf conditions
 */
export function shouldShowQuestion(
    question: Question,
    allAnswers: Record<string, Answer>,
    context?: QuestionContext
): boolean {
    if (!question.logic?.showIf || question.logic.showIf.length === 0) {
        return true;
    }

    // Every condition must be met (AND logic)
    return question.logic.showIf.every(condition => {
        if (condition.operator.startsWith('context') && context && condition.key) {
            // For example context.gender or context.age
            const contextVal = context[condition.key];
            if (contextVal === undefined || contextVal === null) return false;

            switch (condition.operator) {
                case 'contextEquals':
                    return contextVal === condition.value;
                case 'contextGreaterThan':
                    return Number(contextVal) > Number(condition.value);
                case 'contextLessThan':
                    return Number(contextVal) < Number(condition.value);
                default:
                    return false;
            }
        }

        if (!condition.questionId) return false;

        const answer = allAnswers[condition.questionId];
        if (!answer) return false;

        const val = answer.value;
        switch (condition.operator) {
            case 'equals':
                return val === condition.value;
            case 'notEquals':
                return val !== condition.value;
            case 'contains':
                return Array.isArray(val) ? val.includes(condition.value as string) : String(val).includes(condition.value as string);
            case 'greaterThan':
                return Number(val) > Number(condition.value);
            case 'lessThan':
                return Number(val) < Number(condition.value);
            default:
                return false;
        }
    });
}

/**
 * Determines the next question(s) to show after answering currentQuestion
 */
export function getNextQuestions(
    currentQuestion: Question,
    currentAnswer: Answer,
    _allQuestions: Question[],
    context?: QuestionContext,
    allAnswers?: Record<string, Answer>
): string[] {
    // 1. Follow-up questions defined in options (Multi-step branching)
    if (currentQuestion.options && currentAnswer.value) {
        if (Array.isArray(currentAnswer.value)) {
            const followUps: string[] = [];
            for (const val of currentAnswer.value) {
                const selectedOption = currentQuestion.options.find(opt => opt.value === val);
                if (selectedOption?.followUpQuestions) {
                    followUps.push(...selectedOption.followUpQuestions);
                }
            }
            if (followUps.length > 0) {
                // Return unique follow ups, plus any default next at the end?
                // For now, exactly the follow-ups. Then we might need logic.next as a fallback or end.
                // Let's just return the accumulated followUps.
                let nextList = [...new Set(followUps)];
                if (currentQuestion.logic?.next && currentQuestion.logic.next.length > 0) {
                    nextList = [...nextList, ...currentQuestion.logic.next];
                }
                return nextList;
            }
        } else {
            const selectedOption = currentQuestion.options.find(opt => opt.value === currentAnswer.value);
            if (selectedOption?.followUpQuestions) {
                let nextList = [...selectedOption.followUpQuestions];
                if (currentQuestion.logic?.next && currentQuestion.logic.next.length > 0) {
                    nextList = [...nextList, ...currentQuestion.logic.next];
                }
                return nextList;
            }
        }
    }

    // 2. Complex Conditional Routing
    if (currentQuestion.logic?.conditional) {
        for (const route of currentQuestion.logic.conditional) {
            const result = evaluateConditionalRouting(route, currentAnswer, context, allAnswers);
            if (result) {
                return Array.isArray(result) ? result : [result];
            }
        }
    }

    // 3. Static Next
    if (currentQuestion.logic?.next) {
        return currentQuestion.logic.next;
    }

    return [];
}

/**
 * Evaluates complex conditional routing rules
 */
function evaluateConditionalRouting(
    route: ConditionalRouting,
    answer: Answer,
    context?: QuestionContext,
    allAnswers?: Record<string, Answer>
): string | string[] | null {
    let valueToCompare: unknown = answer.value;

    if (route.context === 'selectedReason') {
        valueToCompare = context?.selectedReason;
    } else if (route.when) {
        valueToCompare = allAnswers?.[route.when]?.value;
    }

    const equalsArr = Array.isArray(route.equals) ? route.equals : null;
    const isMatch = equalsArr
        ? (Array.isArray(valueToCompare) ? equalsArr.some(v => (valueToCompare as (string | number | boolean)[]).includes(v as string | number | boolean)) : equalsArr.includes(valueToCompare as never))
        : valueToCompare === route.equals;

    if (isMatch) {
        // If 'then' is a question ID string or string array, return it
        if (typeof route.then === 'string') {
            return route.then;
        }

        if (Array.isArray(route.then)) {
            // Check if it's an array of strings (Question IDs)
            if (route.then.length > 0 && typeof route.then[0] === 'string') {
                return route.then as string[];
            }

            // IT IS a nested array of ConditionalRouting objects
            const nestedRoutes = route.then as ConditionalRouting[];
            for (const nested of nestedRoutes) {
                const result = evaluateConditionalRouting(nested, answer, context, allAnswers);
                if (result) return result;
            }
        }
    }

    return null;
}

/**
 * Evaluates clinical triage (Red Flags)
 */
export function getTriageAlert(
    question: Question,
    answer: Answer
): { level: 'warning' | 'critical'; message: string } | null {
    if (!question.logic?.triage) return null;

    const { when, level, message } = question.logic.triage;
    const answerVal = answer.value;
    const isMatched = Array.isArray(when)
        ? (Array.isArray(answerVal) ? when.some(w => answerVal.includes(w)) : typeof answerVal === 'string' && when.includes(answerVal))
        : (Array.isArray(answerVal) ? answerVal.includes(when) : answerVal === when);

    if (isMatched) {
        return {
            level,
            message: translateStableText(i18n.t.bind(i18n), getQuestionTriageMessageKey(question.id), message),
        };
    }

    return null;
}

export function getActivePath(
    questions: Question[],
    allAnswers: Record<string, Answer>,
    context?: QuestionContext
): string[] {
    const path: string[] = [];
    let queue: string[] = ['0000'];

    while (queue.length > 0) {
        const currentId = queue.shift()!;

        // Prevent infinite loops safely without breaking reconvergence
        if (path.includes(currentId)) continue;

        const currentQuestion = questions.find(q => q.id === currentId);
        if (!currentQuestion) continue;

        const isVisible = shouldShowQuestion(currentQuestion, allAnswers, context);

        if (isVisible) {
            path.push(currentId);

            const answer = allAnswers[currentId];
            if (!answer) {
                // Not answered yet => stops determining the further active path accurately
                break;
            }

            const nextIds = getNextQuestions(currentQuestion, answer, questions, context, allAnswers);
            if (nextIds.length > 0) {
                queue.unshift(...nextIds);
                // Keep ONLY the LAST occurrence of duplicate nodes in the queue.
                // This correctly defers reconvergence nodes until all parallel follow-ups run.
                queue = queue.filter((item, index) => queue.lastIndexOf(item) === index);
            }
        } else {
            // Skipped question
            const dummyAnswer = { questionId: currentId, value: null, answeredAt: new Date() } as unknown as Answer;
            const nextIds = getNextQuestions(currentQuestion, dummyAnswer, questions, context, allAnswers);
            if (nextIds.length > 0) {
                queue.unshift(...nextIds);
                queue = queue.filter((item, index) => queue.lastIndexOf(item) === index);
            }
        }
    }

    return path;
}

/**
 * Estimates the full path length by walking the question tree without stopping
 * at unanswered questions. Uses actual answers where available, defaults for the rest.
 * This gives a stable denominator for the progress bar.
 */
export function estimateFullPath(
    questions: Question[],
    allAnswers: Record<string, Answer>,
    context?: QuestionContext
): string[] {
    const path: string[] = [];
    let queue: string[] = ['0000'];
    const maxIterations = 200; // safety limit
    let iterations = 0;

    while (queue.length > 0 && iterations < maxIterations) {
        iterations++;
        const currentId = queue.shift()!;

        if (path.includes(currentId)) continue;

        const currentQuestion = questions.find(q => q.id === currentId);
        if (!currentQuestion) continue;

        const isVisible = shouldShowQuestion(currentQuestion, allAnswers, context);

        if (isVisible) {
            path.push(currentId);

            // Use actual answer if available, otherwise use first option / default
            const answer = allAnswers[currentId] ||
                ({ questionId: currentId, value: currentQuestion.options?.[0]?.value ?? '', answeredAt: new Date() } as unknown as Answer);

            const nextIds = getNextQuestions(currentQuestion, answer, questions, context, allAnswers);
            if (nextIds.length > 0) {
                queue.unshift(...nextIds);
                queue = queue.filter((item, index) => queue.lastIndexOf(item) === index);
            }
        } else {
            const dummyAnswer = { questionId: currentId, value: null, answeredAt: new Date() } as unknown as Answer;
            const nextIds = getNextQuestions(currentQuestion, dummyAnswer, questions, context, allAnswers);
            if (nextIds.length > 0) {
                queue.unshift(...nextIds);
                queue = queue.filter((item, index) => queue.lastIndexOf(item) === index);
            }
        }
    }

    return path;
}

