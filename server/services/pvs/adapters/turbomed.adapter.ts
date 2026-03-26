// ============================================
// TurboMed Adapter — GDT 3.0 basiert
// ============================================
// TurboMed ist ein CGM-Produkt mit ~5-6% Marktanteil in Deutschland
// Kommuniziert über GDT 3.0 Datei-Austausch

import { GdtBaseAdapter } from './gdt-base.adapter.js';
import type { PvsType } from '../types.js';

/**
 * Adapter for TurboMed PVS systems.
 * Extends GdtBaseAdapter with TurboMed specific configuration.
 * 
 * TurboMed-spezifische Eigenschaften:
 * - GDT 3.0 Standard
 * - Unterstützt Satzarten: 6310, 6311, 6302, 6301
 * - Standard-Encoding: ISO-8859-15
 * - File-basierte Kommunikation über Import/Export-Verzeichnisse
 */
export class TurbomedAdapter extends GdtBaseAdapter {
  readonly type: PvsType = 'TURBOMED';

  protected defaultReceiverId = 'TURBOMED1';
  protected defaultSenderId = 'DIGGAI01';
  protected defaultEncoding = 'ISO-8859-15';
  protected supportedSatzarten = ['6310', '6311', '6302', '6301'];
}
