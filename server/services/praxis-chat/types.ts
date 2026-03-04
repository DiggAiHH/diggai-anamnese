// ─── Praxis Chat Service Types ─────────────────────────────
// Modul 7/8: MFA/Arzt ↔ Patient real-time chat

export type SenderType = 'PATIENT' | 'MFA' | 'ARZT' | 'SYSTEM';
export type ContentType = 'TEXT' | 'VOICE' | 'VIDEO' | 'SYSTEM_NOTIFICATION' | 'IMAGE';

export interface SendMessageInput {
  sessionId: string;
  senderType: SenderType;
  senderId?: string;
  contentType?: ContentType;
  content: string;
  isTemplate?: boolean;
  templateId?: string;
}

export interface BroadcastInput {
  praxisId: string;
  senderId: string;
  senderType: SenderType;
  content: string;
  target: 'waiting' | 'all' | 'room';
  roomFilter?: string;
}

export interface ChatTemplate {
  id: string;
  name: string;
  content: string;
  category: string;
  language: string;
  variables: string[];
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  senderType: SenderType;
  senderId?: string;
  contentType: ContentType;
  content: string;
  isTemplate: boolean;
  templateId?: string;
  readAt?: string;
  createdAt: string;
}

export interface ChatStats {
  totalMessages: number;
  unreadCount: number;
  avgResponseTime: number;
  messagesByType: { type: string; count: number }[];
}

// Built-in templates for common MFA messages
export const DEFAULT_TEMPLATES: ChatTemplate[] = [
  {
    id: 'tpl-wait-info',
    name: 'Wartezeit-Info',
    content: 'Geschätzte Wartezeit: {{minutes}} Minuten. Wir bitten um Ihre Geduld.',
    category: 'info',
    language: 'de',
    variables: ['minutes'],
  },
  {
    id: 'tpl-room-call',
    name: 'Aufruf ins Zimmer',
    content: 'Bitte begeben Sie sich zu {{room}}. {{staff}} erwartet Sie.',
    category: 'call',
    language: 'de',
    variables: ['room', 'staff'],
  },
  {
    id: 'tpl-doc-request',
    name: 'Dokument-Anforderung',
    content: 'Bitte halten Sie folgendes Dokument bereit: {{document}}',
    category: 'request',
    language: 'de',
    variables: ['document'],
  },
  {
    id: 'tpl-delay-notice',
    name: 'Verzögerungshinweis',
    content: 'Aufgrund {{reason}} verzögert sich Ihr Termin um ca. {{minutes}} Minuten. Vielen Dank für Ihr Verständnis.',
    category: 'delay',
    language: 'de',
    variables: ['reason', 'minutes'],
  },
  {
    id: 'tpl-checkout-ready',
    name: 'Checkout bereit',
    content: 'Ihre Behandlung ist abgeschlossen. Bitte gehen Sie zum Empfang für den Checkout.',
    category: 'checkout',
    language: 'de',
    variables: [],
  },
  {
    id: 'tpl-prep-instructions',
    name: 'Vorbereitungshinweis',
    content: 'Für {{procedure}} bitten wir Sie: {{instructions}}',
    category: 'preparation',
    language: 'de',
    variables: ['procedure', 'instructions'],
  },
];
