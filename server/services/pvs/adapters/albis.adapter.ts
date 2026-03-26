// ============================================
// CGM ALBIS Adapter — GDT-basiert
// ============================================

import { GdtBaseAdapter } from './gdt-base.adapter.js';
import type { PvsType, GdtPatientData } from '../types.js';

/**
 * Adapter for CGM ALBIS PVS system.
 * Extends GdtBaseAdapter with ALBIS specific configuration.
 * 
 * ALBIS-specific characteristics:
 * - Older CGM system, still in widespread use
 * - Standard GDT 3.0 implementation
 * - Fixed ReceiverId: ALBIS0001
 * - Timestamped file archiving
 * - ISO-8859-15 encoding
 */
export class AlbisAdapter extends GdtBaseAdapter {
  readonly type: PvsType = 'ALBIS';

  protected defaultReceiverId = 'ALBIS0001';
  protected defaultSenderId = 'DIGGAI01';
  protected defaultEncoding = 'ISO-8859-15';
  protected supportedSatzarten = ['6310', '6311', '6301'];

  // ALBIS uses timestamped archiving
  protected useTimestampedArchive = true;
}
