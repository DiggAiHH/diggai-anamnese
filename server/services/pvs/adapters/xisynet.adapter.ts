// ============================================
// x.isynet Adapter — GDT 3.0 basiert
// ============================================
// medatixx x.isynet - ~4-5% Marktanteil in Deutschland
// Kommuniziert über GDT 3.0 Datei-Austausch

import { GdtBaseAdapter } from './gdt-base.adapter.js';
import type { PvsType } from '../types.js';

/**
 * Adapter for medatixx x.isynet PVS systems.
 * Extends GdtBaseAdapter with x.isynet specific configuration.
 * 
 * x.isynet-spezifische Eigenschaften:
 * - medatixx Produkt (~4-5% Marktanteil)
 * - GDT 3.0 Standard
 * - Unterstützt Satzarten: 6310, 6311, 6301
 * - Standard-Encoding: ISO-8859-15
 * - File-basierte Kommunikation über Import/Export-Verzeichnisse
 * - Teil der medatixx-Familie (HealthHub ab Q1 2026)
 */
export class xIsynetAdapter extends GdtBaseAdapter {
  readonly type: PvsType = 'X_ISYNET';

  protected defaultReceiverId = 'ISYNET001';
  protected defaultSenderId = 'DIGGAI01';
  protected defaultEncoding = 'ISO-8859-15';
  protected supportedSatzarten = ['6310', '6311', '6301'];
}
