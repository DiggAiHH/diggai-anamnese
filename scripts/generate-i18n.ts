import * as fs from 'fs';
import * as path from 'path';
import { questions } from '../src/data/questions/index.ts';

// Diese statischen UI-Texte fügen wir hinzu
const uiKeys = [
    "Startseite",
    "Anliegen wählen",
    "Termin / Anamnese",
    "Medikamente / Rezepte",
    "AU (Krankschreibung)",
    "Unfallmeldung (BG)",
    "Überweisung",
    "Terminabsage",
    "Dateien / Befunde",
    "Telefonanfrage",
    "Dokumente anfordern",
    "Nachricht schreiben",
    "Weiter",
    "Zurück",
    "Absenden",
    "Medikamente",
    "Kamera",
    "Kamera scannen",
    "Geschlecht",
    "Geburtsdatum",
    "Geben Sie hier Ihr Geburtsdatum ein",
    "Patienten-Service Hub",
    "Initialisiere sichere Verbindung...",
    "Jetzt starten",
    "System Online",
    "DSGVO Konform",
    "Ihre Daten sind geschützt",
    "AES-256 verschlüsselt",
    "DSGVO-konform",
    "Ausschließlich medizinische Nutzung",
    "Keine",
    "Tage",
    "Wochen",
    "Monate",
    "Jahre"
];

// Automatische Extrahierung aller Fragen/Optionen/Beschreibungen
const extractKeys = () => {
    const keys = new Set<string>(uiKeys);

    questions.forEach(q => {
        if (q.question) keys.add(q.question);
        if (q.description) keys.add(q.description);
        if (q.placeholder) keys.add(q.placeholder);

        if (q.options) {
            q.options.forEach(opt => {
                if (opt.label) keys.add(opt.label);
            });
        }
    });

    return Array.from(keys);
};

const keys = extractKeys();

// Generator für ein Locale (hier wird simpel simuliert: prefix, oder wenn es AR/TR ist, ein Mock)
// In einer echten Umgebung würde dies durch Deepl/OpenAI übersetzt
const generateLocale = (lng: string) => {
    const dict: Record<string, string> = {};
    keys.forEach(k => {
        if (lng === 'de') {
            dict[k] = k;
        } else if (lng === 'en') {
            const manualEn: any = {
                "Termin / Anamnese": "Appointment / Anamnesis",
                "Startseite": "Home",
                "Weiter": "Continue",
                "Zurück": "Back",
                "Absenden": "Submit",
                "Ja": "Yes",
                "Nein": "No"
            };
            dict[k] = manualEn[k] || `[EN] ${k}`;
        } else if (lng === 'ar') {
            const manualAr: any = {
                "Termin / Anamnese": "موعد / سوابق المريض",
                "Weiter": "متابعة",
                "Zurück": "رجوع",
                "Ja": "نعم",
                "Nein": "لا"
            };
            dict[k] = manualAr[k] || `[AR] ${k}`;
        } else if (lng === 'tr') {
            const manualTr: any = {
                "Termin / Anamnese": "Randevu / Anamnez",
                "Weiter": "Devam Et",
                "Zurück": "Geri",
                "Absenden": "Gönder",
                "Ja": "Evet",
                "Nein": "Hayır"
            };
            dict[k] = manualTr[k] || `[TR] ${k}`;
        }
    });
    return dict;
};

const languages = ['de', 'en', 'ar', 'tr'];

languages.forEach(lng => {
    const dir = path.join(process.cwd(), 'public', 'locales', lng);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const file = path.join(dir, 'translation.json');
    const existing = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};

    const newDict = generateLocale(lng);
    // Merge: beibehalten der existierenden (bereits übersetzten) Werte
    const finalDict = { ...newDict, ...existing };

    fs.writeFileSync(file, JSON.stringify(finalDict, null, 2), 'utf8');
    console.log(`Generated ${file} with ${Object.keys(finalDict).length} keys.`);
});
