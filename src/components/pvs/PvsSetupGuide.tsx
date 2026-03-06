import { Monitor, FolderOpen, Shield, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const PVS_SETUP_GUIDES: Record<string, { steps: string[]; tips: string[] }> = {
    CGM_M1: {
        steps: [
            'GDT-Schnittstelle in CGM M1 aktivieren (Einstellungen → Schnittstellen → GDT)',
            'Import-/Export-Verzeichnisse konfigurieren',
            'DiggAI als GDT-Empfänger anlegen (ID: DIGGAI01)',
            'In DiggAI die Verzeichnisse identisch eintragen',
            'Testdatei senden und Import prüfen',
        ],
        tips: [
            'Standard-Encoding: ISO 8859-1 (Latin-1)',
            'GDT-Version 3.0 wird empfohlen',
            'Firewall-Freigabe für geteilte Netzlaufwerke prüfen',
        ],
    },
    MEDATIXX: {
        steps: [
            'In medatixx: Administration → Schnittstellen → GDT öffnen',
            'Neuen GDT-Partner "DiggAI" anlegen',
            'Verzeichnisse für Import/Export festlegen',
            'In DiggAI-Admin die gleichen Pfade konfigurieren',
            'Verbindung testen',
        ],
        tips: [
            'medatixx verwendet standardmäßig GDT 2.1 — auf 3.0 umstellen',
            'Zeichensatz auf ISO 8859-1 prüfen',
        ],
    },
    FHIR_GENERIC: {
        steps: [
            'FHIR R4 Basis-URL des PVS ermitteln',
            'API-Zugangsdaten erstellen (Basic Auth oder OAuth2)',
            'In DiggAI: Neue FHIR-Verbindung anlegen',
            'Basis-URL und Credentials eintragen',
            'Verbindung testen (Patient-Suche)',
        ],
        tips: [
            'KBV DE-Basisprofile werden automatisch verwendet',
            'OAuth2 wird empfohlen für Produktionsumgebungen',
        ],
    },
};

const DEFAULT_GUIDE = {
    steps: [
        'PVS-Typ in der Verbindungskonfiguration auswählen',
        'Verbindungsparameter konfigurieren',
        'Testverbindung herstellen',
        'Feld-Mapping prüfen und anpassen',
        'Ersten Export/Import durchführen',
    ],
    tips: [
        'Kontaktieren Sie Ihren PVS-Administrator für Schnittstellendetails',
        'Testen Sie immer zuerst mit einer Testumgebung',
    ],
};

export function PvsSetupGuide({ pvsType }: { pvsType?: string }) {
    const { t } = useTranslation();
    const guide = (pvsType && PVS_SETUP_GUIDES[pvsType]) || DEFAULT_GUIDE;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <Monitor className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                    <h3 className="font-bold text-gray-800 dark:text-gray-200">
                        {t('pvs.setupGuide', 'Einrichtungsanleitung')}
                    </h3>
                    <p className="text-sm text-gray-500">{pvsType || t('pvs.generic', 'Allgemein')}</p>
                </div>
            </div>

            <div className="space-y-3">
                <h4 className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <FolderOpen className="w-4 h-4" />
                    {t('pvs.steps', 'Schritte')}
                </h4>
                <ol className="space-y-2">
                    {guide.steps.map((step, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm">
                            <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                {i + 1}
                            </span>
                            <span className="text-gray-700 dark:text-gray-300 pt-0.5">{step}</span>
                        </li>
                    ))}
                </ol>
            </div>

            <div className="space-y-3">
                <h4 className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    {t('pvs.tips', 'Hinweise')}
                </h4>
                <ul className="space-y-1.5">
                    {guide.tips.map((tip, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <ChevronRight className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                            {tip}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
