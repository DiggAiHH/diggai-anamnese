/**
 * RegulatoryFooter — MDR Anhang I Nr. 23.2 + 23.4 Pflichtangaben
 *
 * Zeigt alle gesetzlich vorgeschriebenen Kennzeichnungselemente für DiggAi Capture
 * als Software-Medizinprodukt (Klasse I Selbstverifizierung) in der laufenden Anwendung an.
 *
 * Implementierungsstand (Stand v0.2 Tech-Doc §11.1):
 *   ◼ Hersteller-Name + Adresse  → /impressum
 *   ◼ Produkt-Name + Version     → VITE_APP_VERSION
 *   ◧ IFU-Link                  → /ifu (Seite noch ausstehend)
 *   ⬛ UDI-DI                    → nach D4 (GS1 Germany) ergänzen
 *   ⬛ CE-Kennzeichnung           → nach Class-I-Selbstverifizierung ergänzen
 *
 * @see docs/TECH_DOC_MDR_ANHANG_II_S1_S3_S5_v0.1.md §11.2
 */

import { useTranslation } from 'react-i18next';

export function RegulatoryFooter() {
  const { t } = useTranslation();
  // VITE_APP_VERSION wird durch Vite aus package.json injiziert (vite.config.ts define).
  // Fallback: '3.x' bis die Variable gesetzt ist.
  const version = (import.meta.env.VITE_APP_VERSION as string | undefined) ?? '3.x';

  return (
    <footer
      role="contentinfo"
      aria-label={t('regulatory.footer_aria', 'Regulatorische Pflichtangaben')}
      className="
        w-full mt-auto py-3 px-4
        border-t border-[var(--border-primary)]
        bg-[var(--bg-secondary)]
        text-[var(--text-tertiary)]
        text-xs
        print:hidden
      "
    >
      <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-x-4 gap-y-1">

        {/* Produktname + Version — MDR Anh. I Nr. 23.2(a) */}
        <span className="font-medium text-[var(--text-secondary)]">
          DiggAi Capture v{version}
        </span>

        <span className="text-[var(--border-primary)] select-none" aria-hidden="true">|</span>

        {/* Hersteller — MDR Anh. I Nr. 23.2(b) */}
        <a
          href="/impressum"
          className="hover:text-[var(--text-primary)] transition-colors"
          aria-label={t('regulatory.manufacturer_link_aria', 'Hersteller-Impressum')}
        >
          {t('regulatory.manufacturer', 'Hersteller: DiggAi GmbH (i.Gr.), Hamburg')}
        </a>

        <span className="text-[var(--border-primary)] select-none" aria-hidden="true">|</span>

        {/* IFU-Link — MDR Anh. I Nr. 23.4 + ISO 15223-1 Symbol 5.4.3 */}
        <a
          href="/ifu"
          className="hover:text-[var(--text-primary)] transition-colors"
          aria-label={t('regulatory.ifu_link_aria', 'Gebrauchsanweisung (IFU) öffnen')}
          // IFU-Seite noch ausstehend — Link bleibt aktiv für künftige Bereitstellung
        >
          {t('regulatory.ifu_link', 'ⓘ Gebrauchsanweisung')}
        </a>

        <span className="text-[var(--border-primary)] select-none" aria-hidden="true">|</span>

        {/* Datenschutz — DSGVO Art. 13/14 */}
        <a
          href="/datenschutz"
          className="hover:text-[var(--text-primary)] transition-colors"
        >
          {t('regulatory.privacy', 'Datenschutz')}
        </a>

        {/*
          CE-Kennzeichnung + UDI-DI — nach D4 (GS1 Germany) + Class-I-Selbstverifizierung ergänzen.
          Platzhalter-Kommentar gemäß TECH_DOC §11.1:
          <span aria-label="CE-Kennzeichen">CE</span>
          <span aria-label={`UDI-DI: ${UDI_DI}`}>REF {UDI_DI}</span>
        */}

      </div>
    </footer>
  );
}
