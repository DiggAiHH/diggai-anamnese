// ─── Medication Reminder Cron Worker ─────────────────────────
// Runs every minute to check for due medication reminders and
// send push notifications to patient devices.

import * as cron from 'node-cron';
import { processDueReminders } from '../services/pwa/reminder.service';

// ─── Schedule ─────────────────────────────────────────────────

/** Cron expression: every 5 minutes — balances precision with DB load (80% fewer scans) */
const CRON_SCHEDULE = '*/5 * * * *';

let task: cron.ScheduledTask | null = null;

// ─── Public Functions ─────────────────────────────────────────

/**
 * Starts the medication reminder cron job.
 * Safe to call multiple times — subsequent calls are no-ops.
 */
export function startReminderWorker(): void {
  if (task) {
    console.log('[reminderWorker] Already running, skipping start.');
    return;
  }

  console.log('[reminderWorker] Starting medication reminder cron job (every 5 minutes)...');

  task = cron.schedule(CRON_SCHEDULE, async () => {
    try {
      await processDueReminders();
    } catch (err) {
      console.error('[reminderWorker] Error processing due reminders:', err);
    }
  });
}

/**
 * Stops and destroys the medication reminder cron job.
 * Safe to call when the job is not running.
 */
export function stopReminderWorker(): void {
  if (task) {
    task.stop();
    task = null;
    console.log('[reminderWorker] Reminder worker stopped.');
  }
}
