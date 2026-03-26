// ============================================
// CGM M1 PRO Adapter — GDT-basiert
// ============================================

import { GdtBaseAdapter } from './gdt-base.adapter.js';
import type { PvsType } from '../types.js';

/**
 * Adapter for CGM M1 PRO PVS system.
 * Extends GdtBaseAdapter with CGM M1 specific configuration.
 * 
 * CGM M1 PRO Characteristics:
 * - GDT 3.0 Standard
 * - Supports Satzarten: 6310, 6311, 6302, 6301
 * - Standard-Encoding: ISO-8859-15
 * - File-based communication via import/export directories
 */
export class CgmM1Adapter extends GdtBaseAdapter {
  readonly type: PvsType = 'CGM_M1';

  protected defaultReceiverId = 'CGMM1001';
  protected defaultSenderId = 'DIGGAI01';
  protected defaultEncoding = 'ISO-8859-15';
  protected supportedSatzarten = ['6310', '6311', '6302', '6301'];
}
