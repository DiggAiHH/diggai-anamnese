// ─── Avatar Service ────────────────────────────────────────
// Modul 8: Staff Avatar management + TTS + Voice Clone

import type {
  StaffAvatarData,
  UpdateAvatarInput,
  SpeakInput,
  SpeakResult,
  CloneVoiceInput,
  CloneVoiceResult,
} from './types';
import { DEFAULT_VOICE_SETTINGS, SUPPORTED_TTS_LANGUAGES, FEATURE_FLAGS } from './types';
import crypto from 'crypto';

function getPrisma() {
  return (globalThis as any).__prisma;
}

// ─── Get Avatar ────────────────────────────────────────────

export async function getAvatar(staffId: string): Promise<StaffAvatarData | null> {
  const prisma = getPrisma();

  const avatar = await prisma.staffAvatar.findUnique({
    where: { staffId },
  });

  if (!avatar) return null;

  return formatAvatar(avatar);
}

// ─── Create or Update Avatar ───────────────────────────────

export async function upsertAvatar(staffId: string, input: UpdateAvatarInput): Promise<StaffAvatarData> {
  const prisma = getPrisma();

  const avatar = await prisma.staffAvatar.upsert({
    where: { staffId },
    create: {
      staffId,
      avatarUrl: input.avatarUrl,
      avatarType: input.avatarType || '2D',
      voiceSettings: input.voiceSettings || DEFAULT_VOICE_SETTINGS,
      supportedLanguages: input.supportedLanguages || ['de-DE'],
      accentSettings: input.accentSettings,
      isActive: input.isActive ?? true,
    },
    update: {
      ...(input.avatarUrl !== undefined && { avatarUrl: input.avatarUrl }),
      ...(input.avatarType !== undefined && { avatarType: input.avatarType }),
      ...(input.voiceSettings !== undefined && { voiceSettings: input.voiceSettings }),
      ...(input.supportedLanguages !== undefined && { supportedLanguages: input.supportedLanguages }),
      ...(input.accentSettings !== undefined && { accentSettings: input.accentSettings }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    },
  });

  return formatAvatar(avatar);
}

// ─── Sign Consent ──────────────────────────────────────────

export async function signConsent(staffId: string): Promise<{ consentSignedAt: string }> {
  const prisma = getPrisma();

  const avatar = await prisma.staffAvatar.upsert({
    where: { staffId },
    create: {
      staffId,
      avatarType: '2D',
      voiceSettings: DEFAULT_VOICE_SETTINGS,
      supportedLanguages: ['de-DE'],
      consentSignedAt: new Date(),
      isActive: false,
    },
    update: {
      consentSignedAt: new Date(),
    },
  });

  return { consentSignedAt: avatar.consentSignedAt!.toISOString() };
}

// ─── Revoke Consent (DSGVO) ────────────────────────────────

export async function revokeConsent(staffId: string): Promise<{ revoked: boolean }> {
  const prisma = getPrisma();

  await prisma.staffAvatar.update({
    where: { staffId },
    data: {
      consentSignedAt: null,
      voiceCloneId: null,
      isActive: false,
    },
  });

  return { revoked: true };
}

// ─── Text-to-Speech ────────────────────────────────────────

export async function speak(input: SpeakInput): Promise<SpeakResult> {
  const language = input.language || 'de-DE';
  const langConfig = SUPPORTED_TTS_LANGUAGES.find(l => l.code === language);

  if (!langConfig) {
    throw new Error(`Sprache nicht unterstützt: ${language}`);
  }

  // Check if staff has custom voice clone
  const prisma = getPrisma();
  const avatar = await prisma.staffAvatar.findUnique({
    where: { staffId: input.staffId },
  });

  const voiceSettings = (avatar?.voiceSettings as any) || DEFAULT_VOICE_SETTINGS;

  // Generate cache key for deduplication
  const cacheKey = crypto
    .createHash('sha256')
    .update(`${input.staffId}:${language}:${input.text}:${JSON.stringify(voiceSettings)}`)
    .digest('hex')
    .slice(0, 16);

  // In production: call Azure Cognitive Services / ElevenLabs API
  // For now: return simulated response
  const audioUrl = `/api/avatar/audio/${cacheKey}.${input.format || 'mp3'}`;
  const estimatedDuration = Math.ceil(input.text.length / 15); // ~15 chars/sec

  return {
    audioUrl,
    duration: estimatedDuration,
    language,
    cached: false,
  };
}

// ─── Voice Clone (Feature-Flagged) ─────────────────────────

export async function startVoiceClone(input: CloneVoiceInput): Promise<CloneVoiceResult> {
  if (!FEATURE_FLAGS.VOICE_CLONE_ENABLED) {
    throw new Error('Voice Cloning ist deaktiviert. Feature-Flag VOICE_CLONE_ENABLED=true erforderlich.');
  }

  const prisma = getPrisma();

  // Verify consent
  const avatar = await prisma.staffAvatar.findUnique({
    where: { staffId: input.staffId },
  });

  if (!avatar?.consentSignedAt) {
    throw new Error('Einwilligung zum Voice Cloning erforderlich (DSGVO Art. 6+7)');
  }

  // Verify consent token
  if (!input.consentToken || input.consentToken.length < 10) {
    throw new Error('Gültiger Consent-Token erforderlich');
  }

  // In production: call ElevenLabs/Azure Custom Voice API
  const voiceCloneId = `vc_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;

  await prisma.staffAvatar.update({
    where: { staffId: input.staffId },
    data: { voiceCloneId },
  });

  return {
    voiceCloneId,
    status: 'PROCESSING',
    estimatedReadyAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // ~30min
  };
}

// ─── Get Clone Status ──────────────────────────────────────

export async function getCloneStatus(staffId: string): Promise<{ voiceCloneId: string | null; status: string }> {
  const prisma = getPrisma();

  const avatar = await prisma.staffAvatar.findUnique({
    where: { staffId },
    select: { voiceCloneId: true },
  });

  if (!avatar?.voiceCloneId) {
    return { voiceCloneId: null, status: 'NONE' };
  }

  // In production: check actual clone status with provider
  return { voiceCloneId: avatar.voiceCloneId, status: 'READY' };
}

// ─── List All Avatars ──────────────────────────────────────

export async function listAvatars(activeOnly = true): Promise<StaffAvatarData[]> {
  const prisma = getPrisma();

  const where = activeOnly ? { isActive: true } : {};
  const avatars = await prisma.staffAvatar.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  return avatars.map(formatAvatar);
}

// ─── Delete Avatar ─────────────────────────────────────────

export async function deleteAvatar(staffId: string): Promise<{ deleted: boolean }> {
  const prisma = getPrisma();

  await prisma.staffAvatar.delete({
    where: { staffId },
  });

  return { deleted: true };
}

// ─── Supported Languages ───────────────────────────────────

export function getSupportedLanguages() {
  return SUPPORTED_TTS_LANGUAGES.map(l => ({
    code: l.code,
    label: l.label,
  }));
}

// ─── Helpers ───────────────────────────────────────────────

function formatAvatar(avatar: any): StaffAvatarData {
  return {
    id: avatar.id,
    staffId: avatar.staffId,
    voiceCloneId: avatar.voiceCloneId,
    voiceSettings: avatar.voiceSettings,
    avatarUrl: avatar.avatarUrl,
    avatarType: avatar.avatarType,
    supportedLanguages: avatar.supportedLanguages,
    accentSettings: avatar.accentSettings,
    consentSignedAt: avatar.consentSignedAt?.toISOString(),
    isActive: avatar.isActive,
    createdAt: avatar.createdAt.toISOString(),
    updatedAt: avatar.updatedAt.toISOString(),
  };
}
