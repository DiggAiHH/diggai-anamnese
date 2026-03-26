// ─── Secure Messaging Service ────────────────────────────────
// Patient ↔ Provider encrypted messaging with push notifications.
// Uses ProviderMessage model with AES-256-GCM body encryption.

import { encrypt, decrypt } from '../encryption';
import { sendNotification } from './push.service';
import type { MessageCreate, MessageData, MessageDirection } from './types';

// ─── Types ───────────────────────────────────────────────────

export interface SendMessageParams {
  accountId: string;
  patientId: string;
  direction: MessageDirection;
  subject?: string;
  body: string;
  senderName?: string;
  senderRole?: string;
  category?: string;
  priority?: string;
  parentId?: string;
}

export interface ListMessagesParams {
  accountId: string;
  page: number;
  limit: number;
  category?: string;
  unreadOnly?: boolean;
}

export interface ListMessagesResult {
  messages: MessageData[];
  total: number;
  page: number;
  limit: number;
}

// ─── Service Functions ───────────────────────────────────────

/**
 * Send a message (patient→provider or provider→patient).
 * Body is encrypted at rest. Push notification is sent to the recipient.
 */
export async function sendMessage(
  prisma: any,
  params: SendMessageParams
): Promise<MessageData> {
  const {
    accountId,
    patientId,
    direction,
    subject,
    body,
    senderName,
    senderRole,
    category = 'general',
    priority = 'normal',
    parentId,
  } = params;

  // Encrypt message body for at-rest storage
  const encryptedBody = encrypt(body);
  const encryptedSubject = subject ? encrypt(subject) : null;

  const message = await prisma.providerMessage.create({
    data: {
      accountId,
      patientId,
      direction,
      subject: encryptedSubject,
      body: encryptedBody,
      senderName: senderName ?? null,
      senderRole: senderRole ?? null,
      category,
      priority,
      parentId: parentId ?? null,
      isRead: false,
    },
  });

  // Send push notification to the recipient
  try {
    if (direction === 'PATIENT_TO_PROVIDER') {
      // Patient sent a message → notify is handled by practice staff system (no push to patient)
    } else if (direction === 'PROVIDER_TO_PATIENT' || direction === 'SYSTEM') {
      // Provider/system sent a message → push to patient
      await sendNotification(accountId, {
        type: 'new_message',
        title: subject ?? 'Neue Nachricht',
        body: body.length > 100 ? body.slice(0, 97) + '...' : body,
        tag: `msg-${message.id}`,
        data: { messageId: message.id, category },
      });
    }
  } catch (err) {
    // Push failure should not block message creation
    console.error('[messaging.service] Push notification failed:', (err as Error).message);
  }

  return decryptMessage(message);
}

/**
 * List messages for a patient account (paginated, filtered).
 */
export async function listMessages(
  prisma: any,
  params: ListMessagesParams
): Promise<ListMessagesResult> {
  const { accountId, page, limit, category, unreadOnly } = params;
  const skip = (page - 1) * limit;

  const where: any = { accountId };
  if (category) where.category = category;
  if (unreadOnly) where.isRead = false;

  const [messages, total] = await Promise.all([
    prisma.providerMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.providerMessage.count({ where }),
  ]);

  return {
    messages: messages.map(decryptMessage),
    total,
    page,
    limit,
  };
}

/**
 * Get a single message by ID (scoped to account). Marks as read if unread.
 */
export async function getMessage(
  prisma: any,
  messageId: string,
  accountId: string
): Promise<MessageData | null> {
  const message = await prisma.providerMessage.findFirst({
    where: { id: messageId, accountId },
    include: {
      replies: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!message) return null;

  // Auto-mark as read
  if (!message.isRead) {
    await prisma.providerMessage.update({
      where: { id: message.id },
      data: { isRead: true, readAt: new Date() },
    });
    message.isRead = true;
    message.readAt = new Date();
  }

  const decrypted = decryptMessage(message);
  if (message.replies?.length) {
    (decrypted as any).replies = message.replies.map(decryptMessage);
  }

  return decrypted;
}

/**
 * Get unread message count for a patient account.
 */
export async function getUnreadCount(
  prisma: any,
  accountId: string
): Promise<number> {
  return prisma.providerMessage.count({
    where: { accountId, isRead: false },
  });
}

/**
 * Mark a specific message as read.
 */
export async function markAsRead(
  prisma: any,
  messageId: string,
  accountId: string
): Promise<MessageData | null> {
  const existing = await prisma.providerMessage.findFirst({
    where: { id: messageId, accountId },
  });
  if (!existing) return null;

  const updated = await prisma.providerMessage.update({
    where: { id: messageId },
    data: { isRead: true, readAt: new Date() },
  });

  return decryptMessage(updated);
}

/**
 * Archive a message (soft-hide from inbox).
 */
export async function archiveMessage(
  prisma: any,
  messageId: string,
  accountId: string
): Promise<MessageData | null> {
  const existing = await prisma.providerMessage.findFirst({
    where: { id: messageId, accountId },
  });
  if (!existing) return null;

  const updated = await prisma.providerMessage.update({
    where: { id: messageId },
    data: { archivedAt: new Date() },
  });

  return decryptMessage(updated);
}

/**
 * Delete a message (hard delete — only if owned by the sender).
 */
export async function deleteMessage(
  prisma: any,
  messageId: string,
  accountId: string
): Promise<boolean> {
  const existing = await prisma.providerMessage.findFirst({
    where: { id: messageId, accountId },
  });
  if (!existing) return false;

  await prisma.providerMessage.delete({ where: { id: messageId } });
  return true;
}

/**
 * Send a message from provider (doctor/MFA) to patient.
 * Called from arzt/mfa routes, not from PWA routes.
 */
export async function sendProviderMessage(
  prisma: any,
  params: {
    patientId: string;
    subject?: string;
    body: string;
    senderName: string;
    senderRole: string;
    category?: string;
    priority?: string;
  }
): Promise<MessageData> {
  // Find the patient's account
  const account = await prisma.patientAccount.findFirst({
    where: { patientId: params.patientId, deletedAt: null },
  });

  if (!account) {
    throw new Error('Patient has no active portal account');
  }

  return sendMessage(prisma, {
    accountId: account.id,
    patientId: params.patientId,
    direction: 'PROVIDER_TO_PATIENT',
    subject: params.subject,
    body: params.body,
    senderName: params.senderName,
    senderRole: params.senderRole,
    category: params.category,
    priority: params.priority,
  });
}

// ─── Helpers ─────────────────────────────────────────────────

/**
 * Decrypt encrypted fields on a ProviderMessage record.
 * Fails gracefully: returns '[encrypted]' on decryption failure.
 */
function decryptMessage(record: any): MessageData {
  let body = record.body;
  let subject = record.subject;

  try {
    // Only decrypt if the body looks like our encrypted format (iv:tag:ciphertext)
    if (body && body.includes(':') && body.split(':').length === 3) {
      body = decrypt(body);
    }
  } catch {
    body = '[encrypted]';
  }

  try {
    if (subject && subject.includes(':') && subject.split(':').length === 3) {
      subject = decrypt(subject);
    }
  } catch {
    subject = '[encrypted]';
  }

  return {
    id: record.id,
    accountId: record.accountId,
    patientId: record.patientId,
    direction: record.direction,
    subject,
    body,
    senderName: record.senderName,
    senderRole: record.senderRole,
    isRead: record.isRead,
    readAt: record.readAt,
    createdAt: record.createdAt,
  };
}
