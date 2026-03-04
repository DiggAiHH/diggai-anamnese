// ─── Praxis Chat Service ───────────────────────────────────
// Modul 7/8: Real-time chat between MFA/Arzt and Patient

import type { SendMessageInput, BroadcastInput, ChatMessage, ChatStats, ChatTemplate } from './types';
import { DEFAULT_TEMPLATES } from './types';

function getPrisma() {
  return (globalThis as any).__prisma;
}

// ─── Send Message ──────────────────────────────────────────

export async function sendMessage(input: SendMessageInput): Promise<ChatMessage> {
  const prisma = getPrisma();

  let content = input.content;

  // If template, resolve variables
  if (input.isTemplate && input.templateId) {
    const template = DEFAULT_TEMPLATES.find(t => t.id === input.templateId);
    if (template) {
      content = resolveTemplate(template.content, JSON.parse(content));
    }
  }

  const message = await prisma.praxisChatMessage.create({
    data: {
      sessionId: input.sessionId,
      senderType: input.senderType,
      senderId: input.senderId,
      contentType: input.contentType || 'TEXT',
      content,
      isTemplate: input.isTemplate || false,
      templateId: input.templateId,
    },
  });

  return formatMessage(message);
}

// ─── Get Session Messages ──────────────────────────────────

export async function getSessionMessages(sessionId: string, limit = 50, before?: string): Promise<ChatMessage[]> {
  const prisma = getPrisma();

  const where: any = { sessionId };
  if (before) {
    where.createdAt = { lt: new Date(before) };
  }

  const messages = await prisma.praxisChatMessage.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return messages.reverse().map(formatMessage);
}

// ─── Mark as Read ──────────────────────────────────────────

export async function markAsRead(sessionId: string, readerId: string, readerType: string): Promise<number> {
  const prisma = getPrisma();

  // Mark all messages from others as read
  const result = await prisma.praxisChatMessage.updateMany({
    where: {
      sessionId,
      senderType: { not: readerType },
      readAt: null,
    },
    data: { readAt: new Date() },
  });

  return result.count;
}

// ─── Broadcast ─────────────────────────────────────────────

export async function broadcastMessage(input: BroadcastInput): Promise<{ sentTo: number; messageIds: string[] }> {
  const prisma = getPrisma();

  // Find active sessions to broadcast to
  let sessions: any[];
  if (input.target === 'waiting') {
    // All patients currently in waiting queue
    sessions = await prisma.patientSession.findMany({
      where: {
        status: { in: ['active', 'waiting'] },
      },
      select: { id: true },
    });
  } else if (input.target === 'room' && input.roomFilter) {
    // All patients in a specific room
    sessions = await prisma.patientSession.findMany({
      where: {
        status: 'active',
        currentRoom: input.roomFilter,
      },
      select: { id: true },
    });
  } else {
    // All active sessions
    sessions = await prisma.patientSession.findMany({
      where: { status: { in: ['active', 'waiting', 'in_progress'] } },
      select: { id: true },
    });
  }

  const messageIds: string[] = [];
  for (const session of sessions) {
    const msg = await prisma.praxisChatMessage.create({
      data: {
        sessionId: session.id,
        senderType: input.senderType,
        senderId: input.senderId,
        contentType: 'SYSTEM_NOTIFICATION',
        content: input.content,
        isTemplate: false,
      },
    });
    messageIds.push(msg.id);
  }

  return { sentTo: sessions.length, messageIds };
}

// ─── Unread Count ──────────────────────────────────────────

export async function getUnreadCount(sessionId: string, viewerType: string): Promise<number> {
  const prisma = getPrisma();

  return prisma.praxisChatMessage.count({
    where: {
      sessionId,
      senderType: { not: viewerType },
      readAt: null,
    },
  });
}

// ─── Chat Stats ────────────────────────────────────────────

export async function getChatStats(praxisId?: string): Promise<ChatStats> {
  const prisma = getPrisma();

  const where = praxisId ? { session: { praxisId } } : {};

  const totalMessages = await prisma.praxisChatMessage.count({ where });
  const unreadCount = await prisma.praxisChatMessage.count({
    where: { ...where, readAt: null },
  });

  const messages = await prisma.praxisChatMessage.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 500,
    select: { senderType: true, contentType: true, createdAt: true, readAt: true },
  });

  const messagesByType = Object.entries(
    messages.reduce((acc: Record<string, number>, m: any) => {
      acc[m.contentType] = (acc[m.contentType] || 0) + 1;
      return acc;
    }, {})
  ).map(([type, count]) => ({ type, count: count as number }));

  // Calculate avg response time from read messages
  const readMessages = messages.filter((m: any) => m.readAt);
  const avgResponseTime = readMessages.length > 0
    ? readMessages.reduce((sum: number, m: any) => {
        return sum + (new Date(m.readAt).getTime() - new Date(m.createdAt).getTime());
      }, 0) / readMessages.length / 1000 // in seconds
    : 0;

  return { totalMessages, unreadCount, avgResponseTime, messagesByType };
}

// ─── Templates ─────────────────────────────────────────────

export function getTemplates(): ChatTemplate[] {
  return DEFAULT_TEMPLATES;
}

export function resolveTemplate(template: string, variables: Record<string, string>): string {
  let resolved = template;
  for (const [key, value] of Object.entries(variables)) {
    resolved = resolved.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }
  return resolved;
}

// ─── Delete Session Chat ───────────────────────────────────

export async function deleteSessionChat(sessionId: string): Promise<number> {
  const prisma = getPrisma();
  const result = await prisma.praxisChatMessage.deleteMany({
    where: { sessionId },
  });
  return result.count;
}

// ─── Helpers ───────────────────────────────────────────────

function formatMessage(msg: any): ChatMessage {
  return {
    id: msg.id,
    sessionId: msg.sessionId,
    senderType: msg.senderType,
    senderId: msg.senderId,
    contentType: msg.contentType,
    content: msg.content,
    isTemplate: msg.isTemplate,
    templateId: msg.templateId,
    readAt: msg.readAt?.toISOString(),
    createdAt: msg.createdAt.toISOString(),
  };
}
