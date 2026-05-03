/**
 * Questions Module - Barrel Export
 * 
 * Re-exports all question-related modules for backward compatibility.
 * 
 * ## Backward Compatibility
 * 
 * Existing imports continue to work without changes:
 * ```ts
 * import { questions } from '@/data/questions';
 * ```
 * 
 * ## New Tree-Shaking Optimized Imports
 * 
 * For better bundle optimization, import directly from modules:
 * ```ts
 * import { questions } from '@/data/questions/questions';
 * import { sections } from '@/data/questions/sections';
 * import { groups } from '@/data/questions/groups';
 * ```
 */

export { questions, coreQuestions } from './questions.ts';
export type { QuestionSection } from './sections.ts';
export { sections } from './sections.ts';
export type { QuestionGroup } from './groups.ts';
export { groups } from './groups.ts';

// Re-export main questions array as default for convenience
export { questions as default } from './questions.ts';
