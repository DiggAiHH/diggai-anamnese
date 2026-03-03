import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const BGs: { value: string; label?: string; labelKey?: string }[] = [
    { value: 'bg_bau', label: 'BG BAU – Berufsgenossenschaft der Bauwirtschaft' },
    { value: 'bg_etem', label: 'BG ETEM – Energie Textil Elektro Medienerzeugnisse' },
    { value: 'bg_holz', label: 'BGHM – Holz und Metall' },
    { value: 'bg_nahrung', label: 'BGN – Nahrungsmittel und Gastgewerbe' },
    { value: 'bg_handel', label: 'BGHW – Handel und Warenlogistik' },
    { value: 'bg_verkehr', label: 'BG Verkehr – Transport und Verkehrswirtschaft' },
    { value: 'bg_gesundheit', label: 'BGW – Gesundheitsdienst und Wohlfahrtspflege' },
    { value: 'vbg', label: 'VBG – Verwaltungs-Berufsgenossenschaft' },
    { value: 'bg_rci', label: 'BG RCI – Rohstoffe und chemische Industrie' },
    { value: 'unbekannt', labelKey: 'bgForm.unknown' }
];

interface BgData {
    bgName: string;
    accidentDate: string;
    accidentLocation: string;
    description: string;
    firstResponder: string;
    reportedToEmployer: boolean;
}

interface Props {
    value?: BgData;
    onChange: (value: BgData) => void;
    className?: string;
}

export function BgAccidentForm({ value, onChange, className }: Props) {
    const { t } = useTranslation();
    const [data, setData] = useState<BgData>(value || {
        bgName: '',
        accidentDate: '',
        accidentLocation: '',
        description: '',
        firstResponder: '',
        reportedToEmployer: false
    });

    const handleChange = (field: keyof BgData, val: string | boolean) => {
        const newData = { ...data, [field]: val };
        setData(newData);
        onChange(newData); // Always bubble up to parent state immediately
    };

    return (
        <div className={`space-y-4 ${className || ''}`}>
            <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">{t('bgForm.bgLabel', 'Zuständige Berufsgenossenschaft')}</label>
                <select
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg p-3 text-[var(--text-primary)] focus:ring-2 focus:ring-blue-500"
                    value={data.bgName}
                    onChange={e => handleChange('bgName', e.target.value)}
                    title={t('bgForm.selectBg', 'Berufsgenossenschaft auswählen')}
                    aria-label={t('bgForm.bgLabel', 'Zuständige Berufsgenossenschaft')}
                >
                    <option value="">{t('select.placeholder', '-- Bitte wählen --')}</option>
                    {BGs.map(bg => (
                        <option key={bg.value} value={bg.value}>{'labelKey' in bg && bg.labelKey ? t(bg.labelKey as string, 'Unbekannt / Andere') : bg.label}</option>
                    ))}
                </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">{t('bgForm.accidentTime', 'Unfallzeitpunkt')}</label>
                    <input
                        type="datetime-local"
                        className="w-full bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg p-3 text-[var(--text-primary)] focus:ring-2 focus:ring-blue-500"
                        value={data.accidentDate}
                        onChange={e => handleChange('accidentDate', e.target.value)}
                        title={t('bgForm.accidentTime', 'Unfallzeitpunkt')}
                        aria-label={t('bgForm.accidentTime', 'Unfallzeitpunkt')}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">{t('bgForm.accidentLocation', 'Unfallort')}</label>
                    <input
                        type="text"
                        placeholder={t('bgForm.locationPlaceholder', 'z.B. Baustelle München')}
                        className="w-full bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg p-3 text-[var(--text-primary)] focus:ring-2 focus:ring-blue-500"
                        value={data.accidentLocation}
                        onChange={e => handleChange('accidentLocation', e.target.value)}
                    />
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">{t('bgForm.description', 'Unfallhergang (Beschreibung)')}</label>
                <textarea
                    rows={4}
                    placeholder={t('bgForm.descriptionPlaceholder', 'Wie ist der Unfall passiert? Welche Körperteile wurden verletzt?')}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg p-3 text-[var(--text-primary)] focus:ring-2 focus:ring-blue-500"
                    value={data.description}
                    onChange={e => handleChange('description', e.target.value)}
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">{t('bgForm.employerInformed', 'Wurde der Arbeitgeber bereits informiert?')}</label>
                <div className="flex items-center space-x-4 mt-2">
                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input type="radio" checked={data.reportedToEmployer} onChange={() => handleChange('reportedToEmployer', true)} className="form-radio text-blue-500 outline-none focus:ring-0" />
                        <span className="text-[var(--text-secondary)]">{t('Ja', 'Ja')}</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input type="radio" checked={!data.reportedToEmployer} onChange={() => handleChange('reportedToEmployer', false)} className="form-radio text-blue-500 outline-none focus:ring-0" />
                        <span className="text-[var(--text-secondary)]">{t('Nein', 'Nein')}</span>
                    </label>
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">{t('bgForm.firstResponder', 'Erste Hilfe durch (Name Ersthelfer/in)')}</label>
                <input
                    type="text"
                    placeholder={t('common.optional', 'Optional')}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg p-3 text-[var(--text-primary)] focus:ring-2 focus:ring-blue-500"
                    value={data.firstResponder}
                    onChange={e => handleChange('firstResponder', e.target.value)}
                />
            </div>
        </div>
    );
}
