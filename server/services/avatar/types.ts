// ─── Avatar Service Types ──────────────────────────────────
// Modul 8: Staff Avatar + Voice Cloning + TTS

export type AvatarType = '2D' | '3D' | 'REAL_PHOTO';

export interface StaffAvatarData {
  id: string;
  staffId: string;
  voiceCloneId?: string;
  voiceSettings?: VoiceSettings;
  avatarUrl?: string;
  avatarType: AvatarType;
  supportedLanguages: string[];
  accentSettings?: AccentSettings;
  consentSignedAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VoiceSettings {
  pitch: number;       // -1.0 to 1.0
  speed: number;       // 0.5 to 2.0
  volume: number;      // 0.0 to 1.0
  style?: string;      // 'professional' | 'friendly' | 'calm'
  provider: string;    // 'azure' | 'elevenlabs' | 'local'
}

export interface AccentSettings {
  primaryLanguage: string;
  accentStrength: number;  // 0.0 to 1.0
  dialectRegion?: string;
}

export interface SpeakInput {
  staffId: string;
  text: string;
  language?: string;
  ssml?: boolean;
  format?: 'mp3' | 'wav' | 'ogg';
}

export interface SpeakResult {
  audioUrl: string;
  duration: number;
  language: string;
  cached: boolean;
}

export interface CloneVoiceInput {
  staffId: string;
  audioSamples: string[];  // URLs to audio samples
  consentToken: string;
  language: string;
}

export interface CloneVoiceResult {
  voiceCloneId: string;
  status: 'PROCESSING' | 'READY' | 'FAILED';
  estimatedReadyAt?: string;
}

export interface UpdateAvatarInput {
  avatarUrl?: string;
  avatarType?: AvatarType;
  voiceSettings?: VoiceSettings;
  supportedLanguages?: string[];
  accentSettings?: AccentSettings;
  isActive?: boolean;
}

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  pitch: 0,
  speed: 1.0,
  volume: 0.8,
  style: 'professional',
  provider: 'azure',
};

export const SUPPORTED_TTS_LANGUAGES = [
  { code: 'de-DE', label: 'Deutsch', voice: 'de-DE-ConradNeural' },
  { code: 'en-US', label: 'English', voice: 'en-US-JennyNeural' },
  { code: 'tr-TR', label: 'Türkçe', voice: 'tr-TR-AhmetNeural' },
  { code: 'ar-SA', label: 'العربية', voice: 'ar-SA-HamedNeural' },
  { code: 'ru-RU', label: 'Русский', voice: 'ru-RU-DmitryNeural' },
  { code: 'uk-UA', label: 'Українська', voice: 'uk-UA-OstapNeural' },
  { code: 'pl-PL', label: 'Polski', voice: 'pl-PL-MarekNeural' },
] as const;

export const FEATURE_FLAGS = {
  AVATAR_ENABLED: process.env.AVATAR_ENABLED === 'true',
  VOICE_CLONE_ENABLED: process.env.VOICE_CLONE_ENABLED === 'true',
  TTS_PROVIDER: (process.env.TTS_PROVIDER || 'azure') as string,
};
