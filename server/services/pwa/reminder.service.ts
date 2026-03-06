// ─── Medication Reminder Service ─────────────────────────────
// Manages MedicationReminder records and processes due reminders.
// Called by the reminderWorker cron job every minute.

import { prisma } from '../../db';
import { sendNotification } from './push.service';

// ─── Types ───────────────────────────────────────────────────

export interface CreateReminderData {
  medicationId: string;
  scheduleCron: string;
  scheduleLabel?: string;
  pushTitle?: string;
  pushBody?: string;
  isActive?: boolean;
}

export interface UpdateReminderData {
  scheduleCron?: string;
  scheduleLabel?: string;
  pushTitle?: string;
  pushBody?: string;
  isActive?: boolean;
}

export interface AdherenceStat {
  reminderId: string;
  medicationName: string;
  scheduleCron: string;
  scheduleLabel: string | null;
  total: number;
  confirmed: number;
  skipped: number;
  missed: number;
  adherencePercent: number;
}

// ─── CRUD Functions ───────────────────────────────────────────

/**
 * Returns all MedicationReminders for a given account, including
 * the related medication record.
 */
export async function getReminders(accountId: string): Promise<any[]> {
  return (prisma as any).medicationReminder.findMany({
    where: { accountId },
    include: { medication: true },
    orderBy: { createdAt: 'asc' },
  });
}

/**
 * Creates a new MedicationReminder after verifying that the referenced
 * medication belongs to the account's patient (ownership check).
 */
export async function createReminder(
  accountId: string,
  data: CreateReminderData
): Promise<any> {
  // Ownership check: medication must belong to this account's patient
  const medication = await (prisma as any).medication.findFirst({
    where: {
      id: data.medicationId,
      patientAccount: { id: accountId },
    },
  });

  if (!medication) {
    throw new Error('Medication not found or does not belong to this account');
  }

  return (prisma as any).medicationReminder.create({
    data: {
      accountId,
      medicationId: data.medicationId,
      scheduleCron: data.scheduleCron,
      scheduleLabel: data.scheduleLabel ?? null,
      pushTitle: data.pushTitle ?? null,
      pushBody: data.pushBody ?? null,
      isActive: data.isActive !== undefined ? data.isActive : true,
    },
    include: { medication: true },
  });
}

/**
 * Updates an existing MedicationReminder after verifying ownership.
 */
export async function updateReminder(
  reminderId: string,
  accountId: string,
  data: UpdateReminderData
): Promise<any> {
  // Ownership check
  const existing = await (prisma as any).medicationReminder.findFirst({
    where: { id: reminderId, accountId },
  });

  if (!existing) {
    throw new Error('Reminder not found or does not belong to this account');
  }

  return (prisma as any).medicationReminder.update({
    where: { id: reminderId },
    data: {
      ...(data.scheduleCron !== undefined && { scheduleCron: data.scheduleCron }),
      ...(data.scheduleLabel !== undefined && { scheduleLabel: data.scheduleLabel }),
      ...(data.pushTitle !== undefined && { pushTitle: data.pushTitle }),
      ...(data.pushBody !== undefined && { pushBody: data.pushBody }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
    include: { medication: true },
  });
}

/**
 * Deletes a MedicationReminder after verifying ownership.
 */
export async function deleteReminder(
  reminderId: string,
  accountId: string
): Promise<void> {
  // Ownership check
  const existing = await (prisma as any).medicationReminder.findFirst({
    where: { id: reminderId, accountId },
  });

  if (!existing) {
    throw new Error('Reminder not found or does not belong to this account');
  }

  await (prisma as any).medicationReminder.delete({
    where: { id: reminderId },
  });
}

// ─── Adherence Statistics ─────────────────────────────────────

/**
 * Calculates adherence statistics for all reminders of an account
 * based on ReminderLog entries from the last 30 days.
 */
export async function getAdherenceStats(accountId: string): Promise<AdherenceStat[]> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Fetch all reminders for the account (including medication name)
  const reminders = await (prisma as any).medicationReminder.findMany({
    where: { accountId },
    include: { medication: true },
  });

  if (reminders.length === 0) {
    return [];
  }

  const reminderIds: string[] = reminders.map((r: any) => r.id);

  // Fetch all logs within the last 30 days for these reminders
  const logs = await (prisma as any).reminderLog.findMany({
    where: {
      reminderId: { in: reminderIds },
      scheduledAt: { gte: thirtyDaysAgo },
    },
  });

  // Group logs by reminderId
  const logsByReminder: Record<string, any[]> = {};
  for (const log of logs) {
    if (!logsByReminder[log.reminderId]) {
      logsByReminder[log.reminderId] = [];
    }
    logsByReminder[log.reminderId].push(log);
  }

  // Build AdherenceStat for each reminder
  const stats: AdherenceStat[] = reminders.map((reminder: any) => {
    const reminderLogs = logsByReminder[reminder.id] ?? [];
    const total = reminderLogs.length;
    const confirmed = reminderLogs.filter((l: any) => l.status === 'confirmed').length;
    const skipped = reminderLogs.filter((l: any) => l.status === 'skipped').length;
    const missed = reminderLogs.filter((l: any) => l.status === 'missed').length;
    const adherencePercent = total > 0 ? Math.round((confirmed / total) * 100) : 0;

    return {
      reminderId: reminder.id,
      medicationName: reminder.medication?.name ?? 'Unknown',
      scheduleCron: reminder.scheduleCron,
      scheduleLabel: reminder.scheduleLabel ?? null,
      total,
      confirmed,
      skipped,
      missed,
      adherencePercent,
    };
  });

  return stats;
}

// ─── Cron Parser ─────────────────────────────────────────────

/**
 * Parses a simple daily cron expression of the form "M H * * *"
 * (e.g. "0 8 * * *") and returns { hour, minute }.
 * Returns null if the expression is not a simple daily cron or is invalid.
 */
export function parseCronMinute(cron: string): { hour: number; minute: number } | null {
  if (!cron || typeof cron !== 'string') {
    return null;
  }

  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) {
    return null;
  }

  const [minutePart, hourPart, dayOfMonth, month, dayOfWeek] = parts;

  // Only handle simple "every day" crons: dom=*, month=*, dow=*
  if (dayOfMonth !== '*' || month !== '*' || dayOfWeek !== '*') {
    return null;
  }

  const minute = parseInt(minutePart, 10);
  const hour = parseInt(hourPart, 10);

  if (
    isNaN(minute) || isNaN(hour) ||
    minute < 0 || minute > 59 ||
    hour < 0 || hour > 23
  ) {
    return null;
  }

  return { hour, minute };
}

// ─── Due Reminder Processing ──────────────────────────────────

/**
 * Processes all active reminders and sends push notifications for those
 * that are due at the current time (Europe/Berlin timezone).
 * Called by the cron worker every minute.
 */
export async function processDueReminders(): Promise<void> {
  // Determine current time in Europe/Berlin (UTC+1 / UTC+2 in summer)
  // We approximate the Berlin offset: CET = UTC+1, CEST = UTC+2
  const nowUtc = new Date();
  const berlinOffsetMs = getBerlinOffsetMs(nowUtc);
  const nowBerlin = new Date(nowUtc.getTime() + berlinOffsetMs);

  const currentHour = nowBerlin.getUTCHours();
  const currentMinute = nowBerlin.getUTCMinutes();

  // Fetch all active reminders
  const reminders = await (prisma as any).medicationReminder.findMany({
    where: { isActive: true },
    include: {
      medication: true,
      account: true,
    },
  });

  if (reminders.length === 0) {
    return;
  }

  for (const reminder of reminders) {
    const parsed = parseCronMinute(reminder.scheduleCron);
    if (!parsed) {
      // Not a simple daily cron — skip
      continue;
    }

    const isDue =
      parsed.hour === currentHour && parsed.minute === currentMinute;

    if (!isDue) {
      continue;
    }

    try {
      // a. Create a ReminderLog with status 'sent'
      await (prisma as any).reminderLog.create({
        data: {
          reminderId: reminder.id,
          scheduledAt: nowUtc,
          status: 'sent',
        },
      });

      // b. Send push notification to all active devices of the account
      const medication = reminder.medication;
      const title =
        reminder.pushTitle ??
        `${medication?.name ?? 'Medikament'} nehmen`;
      const body =
        reminder.pushBody ??
        `Zeit für: ${medication?.dosage ?? 'Ihre Dosis'}`;

      await sendNotification(reminder.accountId, {
        type: 'medication_reminder',
        title,
        body,
        tag: `reminder-${reminder.id}`,
      });

      console.log(
        `[reminder.service] Sent reminder ${reminder.id} for account ${reminder.accountId} at ${currentHour}:${String(currentMinute).padStart(2, '0')} Berlin`
      );
    } catch (err) {
      console.error(
        `[reminder.service] Failed to process reminder ${reminder.id}:`,
        err
      );
    }
  }
}

// ─── Timezone Helper ──────────────────────────────────────────

/**
 * Returns the Europe/Berlin UTC offset in milliseconds for a given UTC date.
 * CET  = UTC+1 (standard time: last Sunday October  → last Sunday March)
 * CEST = UTC+2 (summer time:   last Sunday March    → last Sunday October)
 *
 * This is a simple approximation using the Intl API when available,
 * falling back to a fixed +1h offset.
 */
function getBerlinOffsetMs(utcDate: Date): number {
  try {
    // Use Intl to get the Berlin local time string and back-calculate the offset
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Berlin',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    });

    const parts = formatter.formatToParts(utcDate);
    const hourPart = parts.find((p) => p.type === 'hour');
    const minutePart = parts.find((p) => p.type === 'minute');

    if (!hourPart || !minutePart) {
      return 60 * 60 * 1000; // fallback: UTC+1
    }

    const localHour = parseInt(hourPart.value, 10);
    const localMinute = parseInt(minutePart.value, 10);

    const utcHour = utcDate.getUTCHours();
    const utcMinute = utcDate.getUTCMinutes();

    // Calculate offset in minutes (handle day boundary)
    let offsetMinutes = (localHour * 60 + localMinute) - (utcHour * 60 + utcMinute);
    // Normalize to [-12h, +12h]
    if (offsetMinutes > 12 * 60) offsetMinutes -= 24 * 60;
    if (offsetMinutes < -12 * 60) offsetMinutes += 24 * 60;

    return offsetMinutes * 60 * 1000;
  } catch {
    // Fallback: CET = UTC+1
    return 60 * 60 * 1000;
  }
}
