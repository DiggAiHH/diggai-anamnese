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

export { questions, coreQuestions } from './questions';
export type { QuestionSection } from './sections';
export { sections } from './sections';
export type { QuestionGroup } from './groups';
export { groups } from './groups';

// Re-export main questions array as default for convenience
export { questions as default } from './questions';
