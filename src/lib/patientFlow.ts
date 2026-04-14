import type { i18n as I18n } from 'i18next';
import { questions } from '../data/questions';
import type { AnswerValue, Option, Question } from '../types/question';
import { normalizeAppLanguageCode, type AppLanguageCode } from './i18n/languages';

export type Translator = (key: string, options?: Record<string, unknown>) => string;

export type PatientServiceId =
  | 'anamnese'
  | 'prescription'
  | 'au'
  | 'unfall'
  | 'referral'
  | 'appointment-cancel'
  | 'docs-upload'
  | 'callback'
  | 'docs-request'
  | 'message';

export interface PatientServiceDefinition {
  id: PatientServiceId;
  flowValue: string;
  routeSegment?: string;
  titleKey: string;
  descriptionKey: string;
}

export const PATIENT_SERVICES: readonly PatientServiceDefinition[] = [
  {
    id: 'anamnese',
    flowValue: 'Termin / Anamnese',
    routeSegment: 'anamnese',
    titleKey: 'ui.services.anamnese.title',
    descriptionKey: 'ui.services.anamnese.description',
  },
  {
    id: 'prescription',
    flowValue: 'Medikamente / Rezepte',
    routeSegment: 'rezepte',
    titleKey: 'ui.services.prescription.title',
    descriptionKey: 'ui.services.prescription.description',
  },
  {
    id: 'au',
    flowValue: 'AU (Krankschreibung)',
    routeSegment: 'krankschreibung',
    titleKey: 'ui.services.au.title',
    descriptionKey: 'ui.services.au.description',
  },
  {
    id: 'unfall',
    flowValue: 'Unfallmeldung (BG)',
    routeSegment: 'unfallmeldung',
    titleKey: 'ui.services.unfall.title',
    descriptionKey: 'ui.services.unfall.description',
  },
  {
    id: 'referral',
    flowValue: 'Überweisung',
    titleKey: 'ui.services.referral.title',
    descriptionKey: 'ui.services.referral.description',
  },
  {
    id: 'appointment-cancel',
    flowValue: 'Terminabsage',
    titleKey: 'ui.services.appointmentCancel.title',
    descriptionKey: 'ui.services.appointmentCancel.description',
  },
  {
    id: 'docs-upload',
    flowValue: 'Dateien / Befunde',
    titleKey: 'ui.services.docsUpload.title',
    descriptionKey: 'ui.services.docsUpload.description',
  },
  {
    id: 'callback',
    flowValue: 'Telefonanfrage',
    titleKey: 'ui.services.callback.title',
    descriptionKey: 'ui.services.callback.description',
  },
  {
    id: 'docs-request',
    flowValue: 'Dokumente anfordern',
    titleKey: 'ui.services.docsRequest.title',
    descriptionKey: 'ui.services.docsRequest.description',
  },
  {
    id: 'message',
    flowValue: 'Nachricht schreiben',
    titleKey: 'ui.services.message.title',
    descriptionKey: 'ui.services.message.description',
  },
] as const;

const patientServiceById = new Map(PATIENT_SERVICES.map((service) => [service.id, service]));
const patientServiceByFlowValue = new Map(PATIENT_SERVICES.map((service) => [service.flowValue, service]));

export function getPatientServiceById(id?: string | null): PatientServiceDefinition | null {
  if (!id) return null;
  return patientServiceById.get(id as PatientServiceId) ?? null;
}

export function getPatientServiceByFlowValue(flowValue?: string | null): PatientServiceDefinition | null {
  if (!flowValue) return null;
  return patientServiceByFlowValue.get(flowValue) ?? null;
}

export function getPatientAppBasePath(bsnr?: string | null): string {
  return bsnr ? `/${bsnr}/patient` : '/patient';
}

export function getPatientServiceEntryPath(serviceId: PatientServiceId, bsnr?: string | null): string {
  const service = getPatientServiceById(serviceId);
  if (!service?.routeSegment) {
    return `${getPatientAppBasePath(bsnr)}?service=${encodeURIComponent(serviceId)}`;
  }

  const prefix = bsnr ? `/${bsnr}` : '';
  return `${prefix}/${service.routeSegment}`;
}

export function getPatientQuestionnairePath(serviceId: PatientServiceId, bsnr?: string | null): string {
  return `${getPatientAppBasePath(bsnr)}?service=${encodeURIComponent(serviceId)}`;
}

export function translateStableText(
  translator: Translator,
  stableKey: string,
  legacyFallback: string,
  options?: Record<string, unknown>,
): string {
  const fallbackValue = translator(legacyFallback, {
    ...(options ?? {}),
    defaultValue: legacyFallback,
  });

  return translator(stableKey, {
    ...(options ?? {}),
    defaultValue: fallbackValue,
  });
}

function sanitizeKeyFragment(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'value';
}

export function getQuestionLabelKey(questionId: string): string {
  return `questionnaire.questions.${questionId}.label`;
}

export function getQuestionDescriptionKey(questionId: string): string {
  return `questionnaire.questions.${questionId}.description`;
}

export function getQuestionPlaceholderKey(questionId: string): string {
  return `questionnaire.questions.${questionId}.placeholder`;
}

export function getQuestionOptionKey(questionId: string, optionValue: string): string {
  return `questionnaire.questions.${questionId}.options.${sanitizeKeyFragment(optionValue)}`;
}

export function getQuestionValidationKey(
  questionId: string,
  field: 'customMessage' | 'crossFieldRequired',
): string {
  return `questionnaire.questions.${questionId}.validation.${field}`;
}

export function getQuestionTriageMessageKey(questionId: string): string {
  return `questionnaire.questions.${questionId}.triage.message`;
}

export function translateQuestionLabel(
  translator: Translator,
  question: Pick<Question, 'id' | 'question'>,
): string {
  return translateStableText(translator, getQuestionLabelKey(question.id), question.question);
}

export function translateQuestionDescription(
  translator: Translator,
  question: Pick<Question, 'id' | 'description'>,
): string | undefined {
  if (!question.description) return undefined;
  return translateStableText(translator, getQuestionDescriptionKey(question.id), question.description);
}

export function translateQuestionPlaceholder(
  translator: Translator,
  question: Pick<Question, 'id' | 'placeholder'>,
): string | undefined {
  if (!question.placeholder) return undefined;
  return translateStableText(translator, getQuestionPlaceholderKey(question.id), question.placeholder);
}

export function translateQuestionOption(
  translator: Translator,
  questionId: string,
  option: Pick<Option, 'value' | 'label'>,
): string {
  return translateStableText(translator, getQuestionOptionKey(questionId, option.value), option.label);
}

export function formatQuestionValue(
  question: Pick<Question, 'id' | 'options'>,
  value: AnswerValue | unknown,
  translator: Translator,
  locale = 'de-DE',
): string {
  if (value === undefined || value === null || value === '') {
    return '-';
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        const option = question.options?.find((candidate) => candidate.value === entry);
        return option ? translateQuestionOption(translator, question.id, option) : String(entry);
      })
      .join(', ');
  }

  if (question.options) {
    const option = question.options.find((candidate) => candidate.value === value);
    if (option) {
      return translateQuestionOption(translator, question.id, option);
    }
  }

  if (value instanceof Date) {
    return value.toLocaleDateString(locale);
  }

  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsedDate = new Date(value);
    if (!Number.isNaN(parsedDate.getTime())) {
      return parsedDate.toLocaleDateString(locale);
    }
  }

  return String(value);
}

const PATIENT_FLOW_RESOURCE_BUNDLES: Partial<Record<AppLanguageCode, Record<string, string>>> = {
  de: {
    'ui.questionnaire.answerRequired': 'Bitte beantworten Sie die Frage',
    'ui.upload.translationPending': 'Dokument wird für das Praxispersonal auf Deutsch vorbereitet.',
    'ui.upload.translationCompleted': 'Deutsche Lesefassung für das Praxispersonal vorbereitet.',
    'ui.upload.translationQueued': 'Dokument zur Übersetzung markiert. Das Backend übernimmt die Nachbearbeitung.',
    'questionnaire.questions.0001.validation.customMessage': 'Der Name darf nur Buchstaben, Leerzeichen und Bindestriche enthalten.',
    'questionnaire.questions.0011.validation.customMessage': 'Der Name darf nur Buchstaben, Leerzeichen und Bindestriche enthalten.',
    'questionnaire.questions.0003.validation.customMessage': 'Das Alter muss mehr als 3 Jahre betragen.',
    'questionnaire.questions.3004b.validation.crossFieldRequired': 'Bitte mindestens eine Telefonnummer (Mobil/Festnetz) oder eine E-Mail-Adresse angeben.',
  },
  en: {
    'ui.questionnaire.answerRequired': 'Please answer the question',
    'ui.upload.translationPending': 'Preparing a German version for the practice team.',
    'ui.upload.translationCompleted': 'German reading version prepared for the practice team.',
    'ui.upload.translationQueued': 'Document marked for translation. The backend will complete the follow-up processing.',
    'questionnaire.questions.0001.validation.customMessage': 'The name may contain only letters, spaces, and hyphens.',
    'questionnaire.questions.0011.validation.customMessage': 'The name may contain only letters, spaces, and hyphens.',
    'questionnaire.questions.0003.validation.customMessage': 'Age must be greater than 3 years.',
    'questionnaire.questions.3004b.validation.crossFieldRequired': 'Please provide at least one phone number (mobile/landline) or an email address.',
  },
  tr: {
    'ui.questionnaire.answerRequired': 'Lütfen soruyu cevaplayın',
    'ui.upload.translationPending': 'Muayenehane ekibi için Almanca sürüm hazırlanıyor.',
    'ui.upload.translationCompleted': 'Muayenehane ekibi için Almanca okuma sürümü hazırlandı.',
    'ui.upload.translationQueued': 'Belge çeviri için işaretlendi. Artık işlemleri backend tamamlayacak.',
    'questionnaire.questions.0001.validation.customMessage': 'İsim yalnızca harf, boşluk ve kısa çizgi içerebilir.',
    'questionnaire.questions.0011.validation.customMessage': 'İsim yalnızca harf, boşluk ve kısa çizgi içerebilir.',
    'questionnaire.questions.0003.validation.customMessage': 'Yaş 3 yıldan büyük olmalıdır.',
    'questionnaire.questions.3004b.validation.crossFieldRequired': 'Lütfen en az bir telefon numarası (cep/sabit hat) veya bir e-posta adresi girin.',
  },
  ru: {
    'ui.questionnaire.answerRequired': 'Пожалуйста, ответьте на вопрос',
    'ui.upload.translationPending': 'Подготавливается немецкая версия для сотрудников практики.',
    'ui.upload.translationCompleted': 'Немецкая версия для чтения сотрудниками практики готова.',
    'ui.upload.translationQueued': 'Документ помечен для перевода. Дальнейшую обработку выполнит backend.',
    'questionnaire.questions.0001.validation.customMessage': 'Имя может содержать только буквы, пробелы и дефисы.',
    'questionnaire.questions.0011.validation.customMessage': 'Имя может содержать только буквы, пробелы и дефисы.',
    'questionnaire.questions.0003.validation.customMessage': 'Возраст должен быть больше 3 лет.',
    'questionnaire.questions.3004b.validation.crossFieldRequired': 'Укажите хотя бы один номер телефона (мобильный/стационарный) или адрес электронной почты.',
  },
  ar: {
    'ui.questionnaire.answerRequired': 'يرجى الإجابة عن السؤال',
    'ui.upload.translationPending': 'يتم إعداد نسخة ألمانية لفريق العيادة.',
    'ui.upload.translationCompleted': 'تم تجهيز نسخة ألمانية قابلة للقراءة لفريق العيادة.',
    'ui.upload.translationQueued': 'تم وضع المستند في قائمة الترجمة. سيكمل الخلفية المعالجة اللاحقة.',
    'questionnaire.questions.0001.validation.customMessage': 'يجب أن يحتوي الاسم على أحرف ومسافات وشرطات فقط.',
    'questionnaire.questions.0011.validation.customMessage': 'يجب أن يحتوي الاسم على أحرف ومسافات وشرطات فقط.',
    'questionnaire.questions.0003.validation.customMessage': 'يجب أن يكون العمر أكبر من 3 سنوات.',
    'questionnaire.questions.3004b.validation.crossFieldRequired': 'يرجى إدخال رقم هاتف واحد على الأقل (جوال/أرضي) أو عنوان بريد إلكتروني.',
  },
};

let patientFlowResourcesRegistered = false;

function buildQuestionResourceBundle(i18n: I18n, language: string): Record<string, string> {
  const bundle: Record<string, string> = {};

  for (const question of questions) {
    bundle[getQuestionLabelKey(question.id)] = i18n.t(question.question, { lng: language, defaultValue: question.question });

    if (question.description) {
      bundle[getQuestionDescriptionKey(question.id)] = i18n.t(question.description, {
        lng: language,
        defaultValue: question.description,
      });
    }

    if (question.placeholder) {
      bundle[getQuestionPlaceholderKey(question.id)] = i18n.t(question.placeholder, {
        lng: language,
        defaultValue: question.placeholder,
      });
    }

    if (question.validation?.customMessage) {
      bundle[getQuestionValidationKey(question.id, 'customMessage')] = i18n.t(question.validation.customMessage, {
        lng: language,
        defaultValue: question.validation.customMessage,
      });
    }

    if (question.validation?.crossFieldRequired?.message) {
      bundle[getQuestionValidationKey(question.id, 'crossFieldRequired')] = i18n.t(
        question.validation.crossFieldRequired.message,
        { lng: language, defaultValue: question.validation.crossFieldRequired.message },
      );
    }

    if (question.logic?.triage?.message) {
      bundle[getQuestionTriageMessageKey(question.id)] = i18n.t(question.logic.triage.message, {
        lng: language,
        defaultValue: question.logic.triage.message,
      });
    }

    for (const option of question.options ?? []) {
      bundle[getQuestionOptionKey(question.id, option.value)] = i18n.t(option.label, {
        lng: language,
        defaultValue: option.label,
      });
    }
  }

  return bundle;
}

function syncQuestionResourceBundle(i18n: I18n, language?: string): void {
  const normalizedLanguage = normalizeAppLanguageCode(language);
  i18n.addResourceBundle(
    normalizedLanguage,
    'translation',
    buildQuestionResourceBundle(i18n, normalizedLanguage),
    true,
    true,
  );
}

export function registerPatientFlowResources(i18n: I18n): void {
  if (patientFlowResourcesRegistered) return;

  for (const [language, bundle] of Object.entries(PATIENT_FLOW_RESOURCE_BUNDLES)) {
    i18n.addResourceBundle(language, 'translation', bundle, true, true);
  }

  syncQuestionResourceBundle(i18n, i18n.resolvedLanguage || i18n.language || 'de');
  i18n.on('languageChanged', (language) => syncQuestionResourceBundle(i18n, language));
  i18n.on('loaded', (loaded) => {
    for (const language of Object.keys(loaded ?? {})) {
      syncQuestionResourceBundle(i18n, language);
    }
  });

  patientFlowResourcesRegistered = true;
}