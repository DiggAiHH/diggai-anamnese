// ============================================
// MEDISTAR Adapter — GDT 3.0 basiert
// ============================================
// CGM MEDISTAR ist Marktführer mit ~9-10% Marktanteil in Deutschland
// Kommuniziert über GDT 3.0 Datei-Austausch

import { GdtBaseAdapter } from './gdt-base.adapter.js';
import type { PvsType } from '../types.js';

/**
 * Adapter for CGM MEDISTAR PVS systems.
 * Extends GdtBaseAdapter with MEDISTAR specific configuration.
 * 
 * MEDISTAR-spezifische Eigenschaften:
 * - Marktführer unter den CGM-Produkten (~9-10% Marktanteil)
 * - GDT 3.0 Standard
 * - Unterstützt Satzarten: 6310, 6311, 6301
 * - Standard-Encoding: ISO-8859-15
 * - File-basierte Kommunikation über Import/Export-Verzeichnisse
 * - Spezielle 6200-Satzarten für erweiterte Befunde (optional)
 */
export class MedistarAdapter extends GdtBaseAdapter {
  readonly type: PvsType = 'MEDISTAR';

  protected defaultReceiverId = 'MEDISTAR01';
  protected defaultSenderId = 'DIGGAI01';
  protected defaultEncoding = 'ISO-8859-15';
  protected supportedSatzarten = ['6310', '6311', '6301'];
}
