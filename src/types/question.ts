export type QuestionType =
  | 'text'
  | 'number'
  | 'select'
  | 'multiselect'
  | 'radio'
  | 'date'
  | 'time'
  | 'email'
  | 'tel'
  | 'textarea'
  | 'file'
  | 'bg-form'
  | 'surgery-form'
  | 'patient-identify';

export interface Question {
  id: string;
  type: QuestionType;
  question: string;
  description?: string;
  section: string;
  order: number;
  placeholder?: string;
  options?: Option[];
  validation?: ValidationRules;
  errorMessage?: string;
  logic?: QuestionLogic;
  /** i18n key for a plain-language explanation of a medical term */
  helpText?: string;
  /** i18n key explaining why we ask this question (trust transparency) */
  whyWeAsk?: string;
  /** Whether this field collects sensitive/health data (shows lock icon) */
  sensitive?: boolean;
}

export interface Option {
  value: string;
  label: string;
  followUpQuestions?: string[];
}

export interface ValidationRules {
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  ageOver?: number;
  customMessage?: string;
  /** Cross-field validation: at least one of the listed fields must be non-empty */
  crossFieldRequired?: {
    fields: string[];
    message: string;
  };
  /** Age-dependent min value: uses lower min for children below ageThreshold */
  ageConditionalMin?: {
    ageThreshold: number;
    minIfBelow: number;
    minIfAbove: number;
  };
}

export interface QuestionLogic {
  next?: string[];
  conditional?: ConditionalRouting[];
  showIf?: ConditionalLogic[];
  computed?: {
    dependsOn: string[];
    compute: (values: Record<string, unknown>) => unknown;
  };
  triage?: {
    when: string | string[];
    level: 'warning' | 'critical';
    message: string;
  };
  fallback?: {
    condition: 'fieldEmpty' | 'validationFail' | 'custom';
    dialogOptions: Array<{ value: string; label?: string; }>;
    onFallback?: string; // Flag mechanism (e.g., 'SET_FLAG emailStatus:PHONE_ONLY')
  };
}

export interface ConditionalRouting {
  when?: string; // questionId to check
  context?: 'selectedReason'; // metadata field
  equals: string | string[] | boolean | number;
  then: string[] | string | ConditionalRouting[];
}

export interface ConditionalLogic {
  questionId?: string;
  operator: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan' | 'contextEquals' | 'contextGreaterThan' | 'contextLessThan';
  key?: 'gender' | 'age';
  value: string | number | boolean | string[];
}

export type AnswerValue = string | string[] | boolean | number | Record<string, unknown> | null;

export interface Answer {
  atomId: string;
  value: AnswerValue;
  answeredAt: Date;
}

export interface PatientData {
  id: string;
  isNewPatient: boolean;
  gender: 'M' | 'W' | 'D';
  birthDate: Date;
  age: number;
  insuranceType?: 'PKV' | 'GKV' | 'Selbstzahler';
  answers: Record<string, Answer>;
  completedSections: string[];
  startedAt: Date;
  lastModified: Date;
  status: 'inProgress' | 'completed' | 'submitted';
}
