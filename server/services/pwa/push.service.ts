// ─── VAPID-based Web Push Notification Service ───────────────
// Uses web-push npm package with VAPID keys from environment variables.
// Manages device subscriptions and sends notifications to all active
// devices associated with a patient account.

import * as webpush from 'web-push';
import { prisma } from '../../db';

// ─── Types ───────────────────────────────────────────────────

export interface PushPayload {
  type: string;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: object;
}

export interface SubscribeDeviceParams {
  endpoint: string;
  p256dh: string;
  auth: string;
  deviceLabel?: string;
  userAgent?: string;
}

export interface SendResult {
  sent: number;
  failed: number;
}

// ─── VAPID Configuration ─────────────────────────────────────

function configureVapid(): void {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const email = process.env.VAPID_EMAIL;

  if (!publicKey || !privateKey || !email) {
    console.warn(
      '[push.service] VAPID keys not fully configured. ' +
      'Set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_EMAIL env vars.'
    );
    return;
  }

  webpush.setVapidDetails(`mailto:${email}`, publicKey, privateKey);
}

// Initialize VAPID on module load
configureVapid();

// ─── Public Functions ─────────────────────────────────────────

/**
 * Returns the VAPID public key for the client to use when subscribing.
 */
export function getVapidPublicKey(): string {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) {
    throw new Error('VAPID_PUBLIC_KEY is not configured');
  }
  return key;
}

/**
 * Registers or updates a Web Push subscription for a patient device.
 * If a device with the same endpoint already exists it is updated;
 * otherwise a new PatientDevice record is created.
 */
export async function subscribeDevice(
  accountId: string,
  subscription: SubscribeDeviceParams
): Promise<any> {
  const { endpoint, p256dh, auth, deviceLabel, userAgent } = subscription;

  // Upsert by endpoint (unique field on PatientDevice)
  const device = await (prisma as any).patientDevice.upsert({
    where: { pushEndpoint: endpoint },
    update: {
      p256dh,
      auth,
      userAgent: userAgent ?? undefined,
      deviceName: deviceLabel ?? undefined,
      isActive: true,
      lastSeenAt: new Date(),
    },
    create: {
      accountId,
      deviceName: deviceLabel ?? 'Web Browser',
      deviceType: 'web',
      pushEndpoint: endpoint,
      p256dh,
      auth,
      userAgent: userAgent ?? null,
      isActive: true,
      lastSeenAt: new Date(),
    },
  });

  return device;
}

/**
 * Marks a device as inactive by its push endpoint.
 * Does NOT delete the record so history is preserved.
 */
export async function unsubscribeDevice(endpoint: string): Promise<void> {
  try {
    await (prisma as any).patientDevice.updateMany({
      where: { pushEndpoint: endpoint },
      data: { isActive: false },
    });
  } catch (err) {
    console.error('[push.service] unsubscribeDevice error:', err);
    throw err;
  }
}

/**
 * Sends a push notification to ALL active Web Push devices of an account.
 * Devices that return HTTP 410 Gone are automatically marked as inactive.
 */
export async function sendNotification(
  accountId: string,
  payload: PushPayload
): Promise<SendResult> {
  const devices = await (prisma as any).patientDevice.findMany({
    where: {
      accountId,
      isActive: true,
      pushEndpoint: { not: null },
      p256dh: { not: null },
      auth: { not: null },
    },
  });

  let sent = 0;
  let failed = 0;

  await Promise.all(
    devices.map(async (device: any) => {
      try {
        await sendToEndpoint(device.pushEndpoint, device.p256dh, device.auth, payload);
        sent++;
      } catch (err: any) {
        // HTTP 410 Gone → subscription is no longer valid
        if (err?.statusCode === 410) {
          console.info(`[push.service] Device ${device.id} returned 410 Gone — marking inactive`);
          await (prisma as any).patientDevice.update({
            where: { id: device.id },
            data: { isActive: false },
          });
        } else {
          console.error(`[push.service] Failed to send to device ${device.id}:`, err?.message ?? err);
        }
        failed++;
      }
    })
  );

  return { sent, failed };
}

/**
 * Low-level function: sends a push notification to a single endpoint.
 * Throws on failure so callers can handle 410 Gone responses.
 */
export async function sendToEndpoint(
  endpoint: string,
  p256dh: string,
  auth: string,
  payload: PushPayload
): Promise<void> {
  const pushSubscription = {
    endpoint,
    keys: { p256dh, auth },
  };

  const payloadString = JSON.stringify({
    type: payload.type,
    title: payload.title,
    body: payload.body,
    icon: payload.icon ?? '/icons/icon-192.svg',
    badge: payload.badge ?? '/icons/icon-192.svg',
    tag: payload.tag ?? 'diggai-notification',
    data: payload.data ?? {},
  });

  await webpush.sendNotification(pushSubscription, payloadString);
}
