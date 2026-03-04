// ── CustomForm / FormBuilder Types ──────────────────────────────────

export type QuestionType =
  | 'TEXT'
  | 'TEXTAREA'
  | 'SELECT'
  | 'MULTI_SELECT'
  | 'RADIO'
  | 'CHECKBOX'
  | 'DATE'
  | 'NUMBER'
  | 'SCALE'
  | 'FILE';

export interface FormQuestion {
  id: string;
  type: QuestionType;
  label: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
  validation?: Record<string, any>;
  conditionalOn?: { questionId: string; value: any };
}

export interface CustomFormRecord {
  id: string;
  praxisId: string;
  createdBy: string;
  name: string;
  description?: string;
  aiGenerated: boolean;
  aiPrompt?: string;
  logic: Record<string, any>;
  questions: FormQuestion[];
  tags: string[];
  ageRange?: { min?: number; max?: number };
  usageCount: number;
  isActive: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateFormInput {
  praxisId: string;
  createdBy: string;
  name: string;
  description?: string;
  questions: FormQuestion[];
  logic?: Record<string, any>;
  tags?: string[];
  ageRange?: { min?: number; max?: number };
}

export interface UpdateFormInput {
  name?: string;
  description?: string;
  questions?: FormQuestion[];
  logic?: Record<string, any>;
  tags?: string[];
  ageRange?: { min?: number; max?: number };
  isActive?: boolean;
}

export interface AiGenerateInput {
  praxisId: string;
  createdBy: string;
  prompt: string;
  language?: string;
}
