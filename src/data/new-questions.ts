import type { Question } from '../types/question';

export const newQuestions: Question[] = [
    // ==================== PART 1: NEUE BESCHWERDEN-FRAGEN (zwischen 1001 und 1002) ====================
    {
        id: '1004',
        type: 'select',
        question: 'Wie häufig treten die Beschwerden auf?',
        section: 'beschwerden',
        order: 19.1,
        options: [
            { value: 'selten', label: 'Selten' },
            { value: 'unregelmaessig', label: 'Unregelmäßig' },
            { value: 'episodisch', label: 'Episodisch' },
            { value: 'periodisch', label: 'Periodisch' },
            { value: 'taeglich', label: 'Täglich' },
            { value: 'staendig', label: 'Ständig' }
        ],
        validation: { required: true },
        logic: { next: ['1005'] }
    },
    {
        id: '1005',
        type: 'multiselect',
        question: 'Gibt es einen Auslöser für die Beschwerden?',
        section: 'beschwerden',
        order: 19.2,
        options: [
            { value: 'belastung', label: 'Belastung/Gehen' },
            { value: 'kaelte', label: 'Kälte' },
            { value: 'stehen_sitzen', label: 'Langes Stehen/Sitzen' },
            { value: 'nahrung', label: 'Nahrungsaufnahme' },
            { value: 'waerme', label: 'Wärme' },
            { value: 'ohne', label: 'Ohne erkennbaren Auslöser' },
            { value: 'freitext', label: 'Sonstige', followUpQuestions: ['1005-FT'] }
        ],
        validation: { required: true },
        logic: { next: ['1006'] }
    },
    {
        id: '1005-FT',
        type: 'text',
        question: 'Welcher andere Auslöser?',
        section: 'beschwerden',
        order: 19.25,
        logic: { next: ['1006'] }
    },
    {
        id: '1006',
        type: 'select',
        question: 'Haben sich die Beschwerden verändert?',
        section: 'beschwerden',
        order: 19.3,
        options: [
            { value: 'abgeklungen', label: 'Abgeklungen' },
            { value: 'gebessert', label: 'Gebessert' },
            { value: 'unveraendert', label: 'Unverändert' },
            { value: 'wechselnd', label: 'Wechselnd' },
            { value: 'zunehmend', label: 'Zunehmend' }
        ],
        validation: { required: true },
        logic: { next: ['1007'] }
    },
    {
        id: '1007',
        type: 'multiselect',
        question: 'Haben Sie folgende Auffälligkeiten bemerkt?',
        section: 'beschwerden',
        order: 19.4,
        options: [
            { value: 'fieber', label: 'Fieber', followUpQuestions: ['FIE-100'] },
            { value: 'kraftlosigkeit', label: 'Kraftlosigkeit/Müdigkeit', followUpQuestions: ['KRA-100'] },
            { value: 'nachtschweiss', label: 'Nachtschweiß' },
            { value: 'sehstoerungen', label: 'Sehstörungen' },
            { value: 'gewichtsverlust', label: 'Ungewollter Gewichtsverlust', followUpQuestions: ['GEW-100'] },
            { value: 'keine', label: 'Keine der genannten' }
        ],
        validation: { required: true },
        logic: { next: ['1002'] }
    },

    // ==================== §6A: FIEBER DETAIL ====================
    {
        id: 'FIE-100',
        type: 'select',
        question: 'Wie hoch war die höchste gemessene Temperatur?',
        section: 'beschwerden-fieber',
        order: 19.41,
        options: [
            { value: 'subfebril', label: '37,5–38,0 °C (subfebril)' },
            { value: 'maessig', label: '38,1–39,0 °C (mäßiges Fieber)' },
            { value: 'hoch', label: '39,1–40,0 °C (hohes Fieber)' },
            { value: 'sehr_hoch', label: '> 40 °C (sehr hohes Fieber)' },
            { value: 'nicht_gemessen', label: 'Nicht gemessen' }
        ],
        validation: { required: true },
        logic: { next: ['FIE-MESS-100'] }
    },

    // ==================== §6AA: FIEBER MESSMETHODE ====================
    {
        id: 'FIE-MESS-100',
        type: 'select',
        question: 'Wie wurde die Temperatur gemessen?',
        section: 'beschwerden-fieber',
        order: 19.415,
        options: [
            { value: 'rektal', label: 'Rektal' },
            { value: 'oral', label: 'Oral (im Mund)' },
            { value: 'gehoergang', label: 'Im Gehörgang (Ohrthermometer)' },
            { value: 'achsel', label: 'Achsel (axillär)' },
            { value: 'stirn', label: 'Stirn (kontaktlos)' },
            { value: 'unbekannt', label: 'Weiß ich nicht' }
        ],
        validation: { required: true },
        logic: { next: ['FIE-101'] }
    },
    {
        id: 'FIE-101',
        type: 'radio',
        question: 'Wie verläuft das Fieber?',
        section: 'beschwerden-fieber',
        order: 19.42,
        options: [
            { value: 'kontinuierlich', label: 'Kontinuierlich (ständig erhöht)' },
            { value: 'remittierend', label: 'Remittierend (schwankt, sinkt nicht ganz ab)' },
            { value: 'intermittierend', label: 'Intermittierend (Fieberspitzen, dazwischen normal)' },
            { value: 'rekurrierend', label: 'Rekurrierend (fieberfreie Tage dazwischen)' },
            { value: 'unbekannt', label: 'Weiß ich nicht' }
        ],
        validation: { required: true },
        logic: { next: ['FIE-102'] }
    },
    {
        id: 'FIE-102',
        type: 'multiselect',
        question: 'Begleitsymptome zum Fieber:',
        section: 'beschwerden-fieber',
        order: 19.43,
        options: [
            { value: 'schuettelfrost', label: 'Schüttelfrost' },
            { value: 'schweiss', label: 'Starkes Schwitzen' },
            { value: 'glieder', label: 'Gliederschmerzen' },
            { value: 'kopfschmerz', label: 'Kopfschmerzen' },
            { value: 'verwirrtheit', label: 'Verwirrtheit' },
            { value: 'exanthem', label: 'Hautausschlag' },
            { value: 'lichtempfindlichkeit', label: 'Lichtempfindlichkeit (Photophobie)' },
            { value: 'nackensteife', label: 'Nackensteifigkeit (Meningismus)' },
            { value: 'keine', label: 'Keine Begleitsymptome' }
        ],
        validation: { required: true },
        logic: {
            next: ['FIE-103'],
            triage: {
                when: ['nackensteife'],
                level: 'critical',
                // Patient-Output durchläuft routingHintFromTriage und wird durch
                // einen zentralen Workflow-Hinweis ersetzt (siehe docs/REGULATORY_POSITION.md §5.2).
                // Dieser Text dient nur noch als interner Marker für die Frage selbst.
                message: 'PRIORITY-Routing: Personal sofort informieren.'
            }
        }
    },
    {
        id: 'FIE-103',
        type: 'multiselect',
        question: 'Mögliche Auslöser für das Fieber:',
        section: 'beschwerden-fieber',
        order: 19.44,
        options: [
            { value: 'reise', label: 'Kürzliche Auslandsreise' },
            { value: 'kontakt', label: 'Kontakt zu erkrankten Personen' },
            { value: 'op', label: 'Kürzliche Operation / Eingriff' },
            { value: 'zecke', label: 'Zeckenstich' },
            { value: 'tier', label: 'Tierkontakt / Tierbiss' },
            { value: 'insekten', label: 'Insektenstiche' },
            { value: 'rohmilch', label: 'Rohmilch / Rohmilchprodukte' },
            { value: 'meeresfruechte', label: 'Meeresfrüchte / roher Fisch' },
            { value: 'sexkontakt', label: 'Sexuelle Kontakte' },
            { value: 'iv_drogen', label: 'Intravenöser Drogenkonsum' },
            { value: 'unbekannt', label: 'Kein Auslöser bekannt' }
        ],
        validation: { required: true },
        logic: { next: ['1002'] }
    },

    // ==================== §6B: GEWICHTSVERLUST DETAIL ====================
    {
        id: 'GEW-100',
        type: 'multiselect',
        question: 'Nähere Angaben zum Gewichtsverlust:',
        section: 'beschwerden-gewicht',
        order: 19.45,
        options: [
            { value: 'appetit_verlust', label: 'Appetitlosigkeit' },
            { value: 'appetit_normal', label: 'Appetit ist normal' },
            { value: 'uebelkeit', label: 'Übelkeit' },
            { value: 'schluckbeschwerden', label: 'Schluckbeschwerden' },
            { value: 'durchfall', label: 'Durchfall' },
            { value: 'bauchschmerz', label: 'Bauchschmerzen' },
            { value: 'nachtschweiss', label: 'Nachtschweiß' },
            { value: 'durst', label: 'Vermehrter Durst' },
            { value: 'fruehe_saettigung', label: 'Frühe Sättigung' },
            { value: 'heiserkeit', label: 'Heiserkeit > 3 Wochen' },
            { value: 'kauprobleme', label: 'Kau-/Schluckprobleme' },
            { value: 'hyperpigmentierung', label: 'Dunkle Hautverfärbung (Hyperpigmentierung)' },
            { value: 'soor', label: 'Pilzbefall im Mund (Soor)' }
        ],
        validation: { required: true },
        logic: { next: ['1002'] }
    },

    // ==================== §6C: KRAFTLOSIGKEIT DETAIL ====================
    {
        id: 'KRA-100',
        type: 'multiselect',
        question: 'Nähere Angaben zur Kraftlosigkeit/Müdigkeit:',
        section: 'beschwerden-kraft',
        order: 19.46,
        options: [
            { value: 'aufstehen', label: 'Schwierigkeiten beim Aufstehen aus dem Sitzen' },
            { value: 'stuerze', label: 'Häufige Stürze' },
            { value: 'treppensteigen', label: 'Schwierigkeiten beim Treppensteigen' },
            { value: 'greifen', label: 'Nachlassende Greifkraft' },
            { value: 'konzentration', label: 'Konzentrationsschwäche' },
            { value: 'leistung', label: 'Allgemeiner Leistungsabfall' },
            { value: 'schwindel', label: 'Schwindel beim Aufstehen' }
        ],
        validation: { required: true },
        logic: {
            next: ['1002'],
            showIf: [{ operator: 'contextGreaterThan', key: 'age', value: '59' }]
        }
    },

    // ==================== 7A: ANGIOLOGISCHE BESCHWERDEN ====================
    {
        id: '1010',
        type: 'multiselect',
        question: 'Welche angiologischen Beschwerden haben Sie?',
        section: 'beschwerden-angiologie',
        order: 20.1,
        options: [
            { value: 'gehstrecke', label: 'Eingeschränkte Gehstrecke', followUpQuestions: ['1110'] },
            { value: 'gefuehlsstoerung', label: 'Gefühlsstörungen', followUpQuestions: ['1184'] },
            { value: 'venen', label: 'Venenbeschwerden', followUpQuestions: ['1111'] },
            { value: 'oedeme', label: 'Ödeme/Schwellungen', followUpQuestions: ['1112'] },
            { value: 'schmerzen', label: 'Schmerzen', followUpQuestions: ['1113'] },
            { value: 'wunden', label: 'Chronische Wunden', followUpQuestions: ['1116'] },
            { value: 'shunt', label: 'Shunt / Dialysezugang', followUpQuestions: ['SHUNT-100'] }
        ],
        validation: { required: true },
        logic: { next: ['1003'] }
    },
    {
        id: '1110',
        type: 'select',
        question: 'Wie weit können Sie ohne Pause gehen?',
        section: 'beschwerden-angiologie',
        order: 20.11,
        options: [
            { value: 'unter_50m', label: 'Unter 50 Meter' },
            { value: '50_200m', label: '50-200 Meter' },
            { value: '200_500m', label: '200-500 Meter' },
            { value: 'ueber_500m', label: 'Über 500 Meter' }
        ],
        validation: { required: true },
        logic: { next: ['1003'] }
    },
    {
        id: '1111',
        type: 'multiselect',
        question: 'Welche Venenbeschwerden haben Sie?',
        section: 'beschwerden-angiologie',
        order: 20.12,
        options: [
            { value: 'krampfadern', label: 'Krampfadern' },
            { value: 'besenreiser', label: 'Besenreiser' },
            { value: 'schwere_beine', label: 'Schwere Beine' },
            { value: 'juckreiz', label: 'Juckreiz' },
            { value: 'verfaerbung', label: 'Hautverfärbung' }
        ],
        validation: { required: true },
        logic: { next: ['1003'] }
    },
    {
        id: '1112',
        type: 'multiselect',
        question: 'Wo befinden sich die Schwellungen?',
        section: 'beschwerden-angiologie',
        order: 20.13,
        options: [
            { value: 'beine', label: 'Beine' },
            { value: 'fuesse', label: 'Füße' },
            { value: 'knoechel', label: 'Knöchel' },
            { value: 'arme', label: 'Arme' },
            { value: 'gesicht', label: 'Gesicht' }
        ],
        validation: { required: true },
        logic: { next: ['1003'] }
    },
    {
        id: '1113',
        type: 'select',
        question: 'Wie würden Sie den Schmerz beschreiben?',
        section: 'beschwerden-angiologie',
        order: 20.14,
        options: [
            { value: 'stechend', label: 'Stechend' },
            { value: 'brennend', label: 'Brennend' },
            { value: 'dumpf', label: 'Dumpf' },
            { value: 'ziehend', label: 'Ziehend' },
            { value: 'krampfartig', label: 'Krampfartig' },
            { value: 'pochend', label: 'Pochend' }
        ],
        validation: { required: true },
        logic: { next: ['1114'] }
    },
    {
        id: '1114',
        type: 'number',
        question: 'Schmerzstärke auf einer Skala von 0-10?',
        section: 'beschwerden-angiologie',
        order: 20.15,
        validation: { required: true, min: 0, max: 10 },
        logic: { next: ['1115'] }
    },
    {
        id: '1115',
        type: 'multiselect',
        question: 'Wo genau sind die Schmerzen?',
        section: 'beschwerden-angiologie',
        order: 20.16,
        options: [
            { value: 'oberschenkel', label: 'Oberschenkel' },
            { value: 'unterschenkel', label: 'Unterschenkel' },
            { value: 'wade', label: 'Wade' },
            { value: 'fuss', label: 'Fuß' },
            { value: 'zehen', label: 'Zehen' }
        ],
        validation: { required: true },
        logic: { next: ['1003'] }
    },
    {
        id: '1116',
        type: 'multiselect',
        question: 'Wo befinden sich die Wunden?',
        section: 'beschwerden-angiologie',
        order: 20.17,
        options: [
            { value: 'unterschenkel', label: 'Unterschenkel' },
            { value: 'fuss', label: 'Fuß' },
            { value: 'zehen', label: 'Zehen' },
            { value: 'knoechel', label: 'Knöchel' }
        ],
        validation: { required: true },
        logic: { next: ['1117'] }
    },
    {
        id: '1117',
        type: 'select',
        question: 'Wie lange bestehen die Wunden bereits?',
        section: 'beschwerden-angiologie',
        order: 20.18,
        options: [
            { value: 'tage', label: 'Wenige Tage' },
            { value: 'wochen', label: 'Wenige Wochen' },
            { value: 'monate', label: 'Einige Monate' },
            { value: 'laenger', label: 'Länger als 6 Monate' }
        ],
        validation: { required: true },
        logic: { next: ['1003'] }
    },

    {
        id: 'SHUNT-100',
        type: 'multiselect',
        question: 'Welche Art von Gefäßzugang / Shunt haben Sie?',
        section: 'beschwerden-angiologie',
        order: 20.19,
        options: [
            { value: 'av_fistel', label: 'AV-Fistel (Cimino-Shunt)' },
            { value: 'av_prothese', label: 'AV-Prothese (Goretex)' },
            { value: 'dialysekatheter', label: 'Dialysekatheter (Vorhofkatheter)' },
            { value: 'port', label: 'Port-System' },
            { value: 'shunt_problem', label: 'Shunt-Probleme (Thrombose/Stenose)' }
        ],
        validation: { required: true },
        logic: { next: ['1003'] }
    },

    // ==================== 7B: ATEMBESCHWERDEN ====================
    {
        id: '1020',
        type: 'multiselect',
        question: 'Welche Atembeschwerden haben Sie?',
        section: 'beschwerden-atemwege',
        order: 20.2,
        options: [
            { value: 'atemnot', label: 'Atemnot', followUpQuestions: ['1121'] },
            { value: 'erkaeltung', label: 'Erkältungssymptome' },
            { value: 'husten', label: 'Husten' },
            { value: 'fieber_infektion', label: 'Infektion mit Fieber' },
            { value: 'atemaussetzer', label: 'Atemaussetzer' },
            { value: 'schnarchen', label: 'Schnarchen' },
            { value: 'asthma_copd', label: 'Bekanntes Asthma / COPD', followUpQuestions: ['ASTHMA-100'] }
        ],
        validation: { required: true },
        logic: { next: ['1003'] }
    },
    {
        id: '1121',
        type: 'select',
        question: 'Atemnot-Schweregrad (mMRC-Skala):',
        section: 'beschwerden-atemwege',
        order: 20.21,
        options: [
            { value: 'mmrc0', label: 'Nur bei starker Anstrengung (z.B. Laufen)' },
            { value: 'mmrc1', label: 'Bei Eile oder leichtem Anstieg' },
            { value: 'mmrc2', label: 'Langsameres Gehen als Gleichaltrige' },
            { value: 'mmrc3', label: 'Pausen nach ~100 m auf ebener Strecke' },
            { value: 'mmrc4', label: 'Atemnot beim An-/Auskleiden oder in Ruhe' }
        ],
        validation: { required: true },
        logic: { next: ['1003'] }
    },

    // ==================== §7BA: ASTHMA / COPD MANAGEMENT ====================
    {
        id: 'ASTHMA-100',
        type: 'multiselect',
        question: 'Angaben zu Ihrem Asthma/COPD:',
        section: 'beschwerden-atemwege',
        order: 20.22,
        options: [
            { value: 'inhalator', label: 'Benutze Inhalator / Spray' },
            { value: 'sauerstoff', label: 'Sauerstoff-Langzeittherapie' },
            { value: 'verschlechterung', label: 'Zunahme der Symptome / Exazerbation' },
            { value: 'nacht', label: 'Nächtliches Erwachen durch Atemnot' },
            { value: 'sport', label: 'Belastungsasthma (Sport)' },
            { value: 'allergie', label: 'Allergisch bedingt' }
        ],
        validation: { required: true },
        logic: { next: ['LUNGE-101'] }
    },

    // ==================== §13CC-CCCCC: LUNGENERKRANKUNG DETAIL ====================
    {
        id: 'LUNGE-101',
        type: 'select',
        question: 'Welche Art von Husten haben Sie?',
        section: 'beschwerden-atemwege',
        order: 20.231,
        options: [
            { value: 'trocken', label: 'Trockener Reizhusten' },
            { value: 'produktiv', label: 'Produktiv (mit Auswurf)' },
            { value: 'wechselnd', label: 'Wechselnd' },
            { value: 'kein_husten', label: 'Kein Husten' }
        ],
        validation: { required: true },
        logic: { next: ['LUNGE-102'] }
    },
    {
        id: 'LUNGE-102',
        type: 'select',
        question: 'Wann treten die Beschwerden auf?',
        section: 'beschwerden-atemwege',
        order: 20.232,
        options: [
            { value: 'ganzjaehrig', label: 'Ganzjährig' },
            { value: 'saisonal', label: 'Saisonal (bestimmte Jahreszeit)' },
            { value: 'situativ', label: 'Situativ (bestimmte Auslöser)' }
        ],
        validation: { required: true },
        logic: { next: ['LUNGE-103'] }
    },
    {
        id: 'LUNGE-103',
        type: 'multiselect',
        question: 'Welche Auslöser verschlechtern die Beschwerden?',
        section: 'beschwerden-atemwege',
        order: 20.233,
        options: [
            { value: 'allergene', label: 'Allergene (Pollen, Tierhaare, Staub)' },
            { value: 'belastung', label: 'Körperliche Belastung' },
            { value: 'kaelte', label: 'Kalte Luft' },
            { value: 'infekte', label: 'Infekte der Atemwege' },
            { value: 'rauch', label: 'Rauch / Staub / Dämpfe' },
            { value: 'stress', label: 'Emotionaler Stress' },
            { value: 'keine', label: 'Keine erkennbaren Auslöser' }
        ],
        validation: { required: true },
        logic: { next: ['LUNGE-104'] }
    },
    {
        id: 'LUNGE-104',
        type: 'select',
        question: 'Wie häufig haben Sie Beschwerden / Anfälle?',
        section: 'beschwerden-atemwege',
        order: 20.234,
        options: [
            { value: 'taeglich', label: 'Täglich' },
            { value: 'mehrmals_woche', label: 'Mehrmals pro Woche' },
            { value: 'einmal_woche', label: 'Etwa einmal pro Woche' },
            { value: 'seltener', label: 'Seltener als einmal pro Woche' },
            { value: 'nur_infekt', label: 'Nur bei Infekten' }
        ],
        validation: { required: true },
        logic: { next: ['LUNGE-105'] }
    },
    {
        id: 'LUNGE-105',
        type: 'select',
        question: 'Wie hat sich der Verlauf in den letzten 12 Monaten entwickelt?',
        section: 'beschwerden-atemwege',
        order: 20.235,
        options: [
            { value: 'besser', label: 'Deutlich besser' },
            { value: 'stabil', label: 'Stabil / gleichbleibend' },
            { value: 'schlechter', label: 'Schlechter geworden' },
            { value: 'stark_schlechter', label: 'Deutlich schlechter' }
        ],
        validation: { required: true },
        logic: { next: ['1003'] }
    },

    // ==================== 7C: AUGENBESCHWERDEN ====================
    {
        id: '1A00',
        type: 'multiselect',
        question: 'Welche Augenbeschwerden haben Sie?',
        section: 'beschwerden-augen',
        order: 20.3,
        options: [
            { value: 'roetung', label: 'Augenrötung' },
            { value: 'blendempfindlichkeit', label: 'Blendempfindlichkeit' },
            { value: 'doppelbilder', label: 'Doppelbilder' },
            { value: 'sehverschlechterung', label: 'Sehverschlechterung' },
            { value: 'traenen', label: 'Tränende Augen' },
            { value: 'schmerzen', label: 'Augenschmerzen' },
            { value: 'fremdkoerper', label: 'Fremdkörpergefühl' },
            { value: 'russregen', label: 'Rußregen / Mouches volantes' },
            { value: 'sehverlust', label: 'Plötzlicher Sehverlust' },
            { value: 'gesichtsfeld', label: 'Gesichtsfeldausfälle' },
            { value: 'schleier', label: 'Schleiersehen' },
            { value: 'freitext', label: 'Andere', followUpQuestions: ['1A00-FT'] }
        ],
        validation: { required: true },
        logic: {
            next: ['1003'],
            triage: {
                when: ['sehverlust'],
                level: 'critical',
                message: 'PRIORITY-Routing: Personal sofort informieren.'
            }
        }
    },
    {
        id: '1A00-FT',
        type: 'text',
        question: 'Welche anderen Augenbeschwerden haben Sie?',
        section: 'beschwerden-augen',
        order: 20.31,
        logic: { next: ['1003'] }
    },

    // ==================== 7D: HAUTBESCHWERDEN ====================
    {
        id: '1040',
        type: 'multiselect',
        question: 'Welche Hautveränderungen haben Sie?',
        section: 'beschwerden-haut',
        order: 20.4,
        options: [
            { value: 'ausschlag', label: 'Ausschlag/Exanthem', followUpQuestions: ['1141'] },
            { value: 'ekzem', label: 'Ekzem', followUpQuestions: ['1141'] },
            { value: 'juckreiz', label: 'Starker Juckreiz' },
            { value: 'wunden', label: 'Schlecht heilende Wunden', followUpQuestions: ['1141'] },
            { value: 'verfaerbung', label: 'Hautverfärbungen' },
            { value: 'schwellung', label: 'Schwellung/Knoten' },
            { value: 'freitext', label: 'Andere', followUpQuestions: ['1040-FT'] }
        ],
        validation: { required: true },
        logic: { next: ['1003'] }
    },
    {
        id: '1040-FT',
        type: 'text',
        question: 'Welche anderen Hautbeschwerden haben Sie?',
        section: 'beschwerden-haut',
        order: 20.41,
        logic: { next: ['1003'] }
    },
    {
        id: '1141',
        type: 'select',
        question: 'Seit wann bestehen diese Hautveränderungen?',
        section: 'beschwerden-haut',
        order: 20.42,
        options: [
            { value: 'tage', label: 'Wenige Tage' },
            { value: 'wochen', label: 'Wenige Wochen' },
            { value: 'monate', label: 'Einige Monate' },
            { value: 'laenger', label: 'Länger als 6 Monate' },
            { value: 'jahre', label: 'Seit Jahren' }
        ],
        validation: { required: true },
        logic: { next: ['1003'] }
    },

    // ==================== 7E: HERZ-KREISLAUF ====================
    {
        id: '1050',
        type: 'multiselect',
        question: 'Welche Herz-Kreislauf-Beschwerden haben Sie?',
        section: 'beschwerden-herz',
        order: 20.5,
        options: [
            { value: 'bluthochdruck', label: 'Bluthochdruck' },
            { value: 'brustschmerz', label: 'Brustschmerz/Angina Pectoris', followUpQuestions: ['BRUST-100'] },
            { value: 'herzstolpern', label: 'Herzstolpern/Rhythmusstörungen' },
            { value: 'hypotonie', label: 'Niedriger Blutdruck' },
            { value: 'schwindel_ohnmacht', label: 'Schwindel/Ohnmacht', followUpQuestions: ['1186'] }
        ],
        validation: { required: true },
        logic: {
            next: ['1003'],
            triage: {
                when: ['brustschmerz'],
                level: 'critical',
                message: 'PRIORITY-Routing: Personal sofort informieren.'
            }
        }
    },

    // ==================== §7EA: BRUSTSCHMERZ DETAIL ====================
    {
        id: 'BRUST-100',
        type: 'multiselect',
        question: 'Nähere Angaben zum Brustschmerz:',
        section: 'beschwerden-herz',
        order: 20.51,
        options: [
            { value: 'druck_20min', label: 'Druckgefühl > 20 Minuten' },
            { value: 'linker_arm', label: 'Ausstrahlung in linken Arm' },
            { value: 'hals_kiefer', label: 'Ausstrahlung in Hals/Kiefer' },
            { value: 'epigastrisch', label: 'Im Oberbauch (epigastrisch)' },
            { value: 'besserung_ruhe', label: 'Besserung in Ruhe' },
            { value: 'besserung_nitro', label: 'Besserung auf Nitro-Spray' },
            { value: 'lageabhaengig', label: 'Lageabhängig (verstärkt durch bestimmte Position)' },
            { value: 'atemabhaengig', label: 'Atemabhängig (verstärkt bei Ein-/Ausatmung)' }
        ],
        validation: { required: true },
        logic: {
            next: ['BRUST-101'],
            triage: {
                when: ['druck_20min'],
                level: 'critical',
                message: 'PRIORITY-Routing: Personal sofort informieren.'
            }
        }
    },
    {
        id: 'BRUST-101',
        type: 'multiselect',
        question: 'Was löst den Brustschmerz aus?',
        section: 'beschwerden-herz',
        order: 20.52,
        options: [
            { value: 'belastung', label: 'Körperliche Belastung' },
            { value: 'stress', label: 'Emotionaler Stress' },
            { value: 'kaelte', label: 'Kälteexposition' },
            { value: 'mahlzeiten', label: 'Nach Mahlzeiten' },
            { value: 'morgens', label: 'Morgens / nachts in Ruhe' },
            { value: 'keine', label: 'Kein erkennbarer Auslöser' }
        ],
        validation: { required: true },
        logic: { next: ['BRUST-102'] }
    },
    {
        id: 'BRUST-102',
        type: 'multiselect',
        question: 'Begleitsymptome beim Brustschmerz:',
        section: 'beschwerden-herz',
        order: 20.53,
        options: [
            { value: 'synkope', label: 'Ohnmacht/Synkope' },
            { value: 'atemnot', label: 'Atemnot' },
            { value: 'uebelkeit', label: 'Übelkeit/Erbrechen' },
            { value: 'sodbrennen', label: 'Sodbrennen' },
            { value: 'schweiss', label: 'Kalter Schweiß' },
            { value: 'angst', label: 'Todesangst/Panik' },
            { value: 'keine', label: 'Keine Begleitsymptome' }
        ],
        validation: { required: true },
        logic: { next: ['1003'] }
    },

    // ==================== 7F: HNO-BESCHWERDEN ====================
    {
        id: '1B00',
        type: 'multiselect',
        question: 'Welche HNO-Beschwerden haben Sie?',
        section: 'beschwerden-hno',
        order: 20.6,
        options: [
            { value: 'hoerstoerung', label: 'Hörstörung', followUpQuestions: ['1B01'] },
            { value: 'nase', label: 'Nasenbeschwerden', followUpQuestions: ['1B02'] },
            { value: 'ohren', label: 'Ohrenschmerzen', followUpQuestions: ['1B03'] },
            { value: 'rachen', label: 'Rachenbeschwerden', followUpQuestions: ['1B04'] },
            { value: 'schlucken', label: 'Schluckbeschwerden', followUpQuestions: ['1B05'] },
            { value: 'schwindel', label: 'Schwindel', followUpQuestions: ['1186'] },
            { value: 'stimme', label: 'Stimmstörung', followUpQuestions: ['1B06'] }
        ],
        validation: { required: true },
        logic: { next: ['1003'] }
    },
    {
        id: '1B01',
        type: 'multiselect',
        question: 'Welche Hörstörung?',
        section: 'beschwerden-hno',
        order: 20.61,
        options: [
            { value: 'schwerhoerigkeit', label: 'Schwerhörigkeit' },
            { value: 'tinnitus', label: 'Tinnitus/Ohrgeräusche' },
            { value: 'hoersturz', label: 'Plötzlicher Hörverlust' },
            { value: 'ueberempfindlichkeit', label: 'Überempfindlichkeit (Hyperakusis)' },
            { value: 'tonhoehenverzerrung', label: 'Tonhöhenverzerrung (Diplakusis)' }
        ],
        validation: { required: true },
        logic: { next: ['1003'] }
    },
    {
        id: '1B02',
        type: 'multiselect',
        question: 'Welche Nasenbeschwerden?',
        section: 'beschwerden-hno',
        order: 20.62,
        options: [
            { value: 'verstopfung', label: 'Verstopfte Nase' },
            { value: 'nasenbluten', label: 'Nasenbluten' },
            { value: 'riechstoerung', label: 'Riechstörung' },
            { value: 'schnupfen', label: 'Chronischer Schnupfen' },
            { value: 'borkenbildung', label: 'Borkenbildung' },
            { value: 'eiterabsonderung', label: 'Eiterabsonderung' },
            { value: 'formveraenderung', label: 'Formveränderung der Nase' }
        ],
        validation: { required: true },
        logic: { next: ['1003'] }
    },
    {
        id: '1B03',
        type: 'multiselect',
        question: 'Welche Ohrenbeschwerden?',
        section: 'beschwerden-hno',
        order: 20.63,
        options: [
            { value: 'schmerzen', label: 'Ohrenschmerzen' },
            { value: 'ausfluss', label: 'Ohrenausfluss' },
            { value: 'druckgefuehl', label: 'Druckgefühl' },
            { value: 'fremdkoerper', label: 'Fremdkörpergefühl' },
            { value: 'ohrenbluten', label: 'Ohrenbluten' },
            { value: 'ohrmuschel', label: 'Ohrmuschelentzündung' }
        ],
        validation: { required: true },
        logic: { next: ['1003'] }
    },
    {
        id: '1B04',
        type: 'multiselect',
        question: 'Welche Rachenbeschwerden?',
        section: 'beschwerden-hno',
        order: 20.64,
        options: [
            { value: 'halsschmerzen', label: 'Halsschmerzen' },
            { value: 'heiserkeit', label: 'Heiserkeit' },
            { value: 'rauspern', label: 'Ständiges Räuspern' },
            { value: 'globusgefuehl', label: 'Kloßgefühl im Hals' },
            { value: 'belaege', label: 'Beläge im Rachenraum' },
            { value: 'blutung', label: 'Blutung aus dem Rachen' },
            { value: 'rachenmandeln', label: 'Geschwollene Rachenmandeln' },
            { value: 'mundgeruch', label: 'Mundgeruch' }
        ],
        validation: { required: true },
        logic: { next: ['1003'] }
    },
    {
        id: '1B05',
        type: 'multiselect',
        question: 'Welche Schluckbeschwerden?',
        section: 'beschwerden-hno',
        order: 20.65,
        options: [
            { value: 'feste_nahrung', label: 'Bei fester Nahrung' },
            { value: 'fluessigkeiten', label: 'Bei Flüssigkeiten' },
            { value: 'schmerzhaft', label: 'Schmerzhaftes Schlucken' },
            { value: 'regurgitation', label: 'Regurgitation (Rückfluss)' },
            { value: 'steckenbleiben', label: 'Steckenbleiben von Speisen' },
            { value: 'verschlucken', label: 'Häufiges Verschlucken' },
            { value: 'wuergreiz', label: 'Würgreiz' }
        ],
        validation: { required: true },
        logic: { next: ['1003'] }
    },
    {
        id: '1B06',
        type: 'multiselect',
        question: 'Welche Stimmstörung?',
        section: 'beschwerden-hno',
        order: 20.66,
        options: [
            { value: 'heiserkeit', label: 'Chronische Heiserkeit' },
            { value: 'stimmbandlaehmung', label: 'V.a. Stimmbandlähmung' },
            { value: 'stimmverlust', label: 'Stimmverlust' },
            { value: 'kraftlose_stimme', label: 'Kraftlose Stimme' },
            { value: 'rauhe_stimme', label: 'Rauhe Stimme' },
            { value: 'abhusten_erschwert', label: 'Abhusten erschwert' }
        ],
        validation: { required: true },
        logic: { next: ['1003'] }
    },

    // ==================== 7G: MAGEN-DARM ====================
    {
        id: '1030',
        type: 'multiselect',
        question: 'Welche Verdauungsbeschwerden haben Sie?',
        section: 'beschwerden-magen',
        order: 20.7,
        options: [
            { value: 'bauchschmerz', label: 'Bauchschmerzen', followUpQuestions: ['1131'] },
            { value: 'blaehungen', label: 'Blähungen' },
            { value: 'durchfall', label: 'Durchfall', followUpQuestions: ['DURCHF-100'] },
            { value: 'koliken', label: 'Koliken', followUpQuestions: ['KOLIK-100'] },
            { value: 'reflux', label: 'Sodbrennen/Reflux' },
            { value: 'verstopfung', label: 'Verstopfung', followUpQuestions: ['VERSTOPF-100'] },
            { value: 'uebelkeit', label: 'Übelkeit/Erbrechen', followUpQuestions: ['ERBRECH-100'] },
            { value: 'freitext', label: 'Andere', followUpQuestions: ['1030-FT'] }
        ],
        validation: { required: true },
        logic: { next: ['1003'] }
    },
    {
        id: '1030-FT',
        type: 'text',
        question: 'Welche anderen Verdauungsbeschwerden?',
        section: 'beschwerden-magen',
        order: 20.71,
        logic: { next: ['1003'] }
    },
    {
        id: '1131',
        type: 'multiselect',
        question: 'Wo sind die Bauchschmerzen lokalisiert?',
        section: 'beschwerden-magen',
        order: 20.72,
        options: [
            { value: 'oberbauch', label: 'Oberbauch' },
            { value: 'unterbauch', label: 'Unterbauch' },
            { value: 'links', label: 'Linksseitig' },
            { value: 'rechts', label: 'Rechtsseitig' },
            { value: 'nabel', label: 'Um den Nabel' },
            { value: 'diffus', label: 'Nicht genau lokalisierbar' }
        ],
        validation: { required: true },
        logic: { next: ['1003'] }
    },

    // ==================== §7GA: ERBRECHEN DETAIL ====================
    {
        id: 'ERBRECH-100',
        type: 'multiselect',
        question: 'Nähere Angaben zum Erbrechen:',
        section: 'beschwerden-magen',
        order: 20.73,
        options: [
            { value: 'postprandial', label: 'Nach dem Essen (postprandial)' },
            { value: 'nuechtern', label: 'Nüchtern-Erbrechen' },
            { value: 'blutig', label: 'Blutbeimengung' },
            { value: 'kaffeesatz', label: 'Kaffeesatzartiges Erbrechen' },
            { value: 'gallig', label: 'Galliges Erbrechen' },
            { value: 'mehrmals', label: 'Mehrmals täglich' },
            { value: 'einmalig', label: 'Einmalig / selten' },
            { value: 'schwanger_ausschl', label: 'Schwangerschaft ausgeschlossen?' }
        ],
        validation: { required: true },
        logic: {
            next: ['1003'],
            showIf: [
                { operator: 'contextEquals', key: 'gender', value: 'W' },
                { operator: 'contextGreaterThan', key: 'age', value: 13 },
                { operator: 'contextLessThan', key: 'age', value: 51 }
            ]
        }
    },

    // ==================== §7GC: DURCHFALL DETAIL ====================
    {
        id: 'DURCHF-100',
        type: 'multiselect',
        question: 'Nähere Angaben zum Durchfall:',
        section: 'beschwerden-magen',
        order: 20.74,
        options: [
            { value: 'waessrig', label: 'Wässrig' },
            { value: 'blutig', label: 'Blutig' },
            { value: 'schleimig', label: 'Schleimig' },
            { value: 'haeufig', label: 'Mehr als 5× täglich' },
            { value: 'reise', label: 'Nach Auslandsreise' },
            { value: 'fieber', label: 'Mit Fieber' },
            { value: 'nachtdurchfall', label: 'Auch nachts' },
            { value: 'breiig', label: 'Breiig' },
            { value: 'foetide', label: 'Übelriechend (fötide)' },
            { value: 'fettig', label: 'Fettig / glänzend (Steatorrhoe)' },
            { value: 'verdorben', label: 'Nach verdorbenen Speisen' },
            { value: 'mitbetroffene', label: 'Andere Personen ebenfalls betroffen' }
        ],
        validation: { required: true },
        logic: { next: ['1003'] }
    },

    // ==================== §7GD: KOLIKEN DETAIL ====================
    {
        id: 'KOLIK-100',
        type: 'multiselect',
        question: 'Nähere Angaben zu den Koliken:',
        section: 'beschwerden-magen',
        order: 20.75,
        options: [
            { value: 'oberbauch_re', label: 'Rechter Oberbauch (Gallenkolik)' },
            { value: 'flanke', label: 'Flanke/Rücken (Nierenkolik)' },
            { value: 'unterbauch', label: 'Unterbauch' },
            { value: 'wellenfoermig', label: 'Wellenförmig an- und abschwellend' },
            { value: 'uebelkeit', label: 'Mit Übelkeit/Erbrechen' },
            { value: 'harnverhalt', label: 'Kann nicht Wasserlassen' },
            { value: 'ikterus', label: 'Gelbe Bindehäute (Ikterus)' },
            { value: 'dunkler_urin', label: 'Dunkler Urin' },
            { value: 'heller_stuhl', label: 'Heller / entfärbter Stuhl' },
            { value: 'jucken', label: 'Hautjucken' },
            { value: 'urin_vermindert', label: 'Verminderte Urinmenge' }
        ],
        validation: { required: true },
        logic: {
            next: ['KOLIK-VE-100'],
            triage: {
                when: ['ikterus'],
                level: 'warning',
                message: 'INFO-Routing: Hinweis ans Praxispersonal markieren.'
            }
        }
    },

    // ==================== §7GDDD: KOLIKEN VORERKRANKUNGEN ====================
    {
        id: 'KOLIK-VE-100',
        type: 'multiselect',
        question: 'Sind folgende Vorerkrankungen bekannt?',
        section: 'beschwerden-magen',
        order: 20.755,
        options: [
            { value: 'gallensteine', label: 'Bekannte Gallensteine' },
            { value: 'nierensteine', label: 'Bekannte Nierensteine' },
            { value: 'endometriose', label: 'Endometriose' },
            { value: 'keine', label: 'Keine der genannten' }
        ],
        validation: { required: true },
        logic: { next: ['1003'] }
    },

    // ==================== §7GE: VERSTOPFUNG DETAIL ====================
    {
        id: 'VERSTOPF-100',
        type: 'multiselect',
        question: 'Nähere Angaben zur Verstopfung:',
        section: 'beschwerden-magen',
        order: 20.76,
        options: [
            { value: 'chronisch', label: 'Chronisch (> 3 Monate)' },
            { value: 'akut', label: 'Akut aufgetreten' },
            { value: 'wechsel', label: 'Wechsel Verstopfung/Durchfall' },
            { value: 'blut', label: 'Blut im Stuhl' },
            { value: 'schmerzhaft', label: 'Schmerzhafter Stuhlgang' },
            { value: 'abfuehr', label: 'Regelmäßige Abführmittel-Einnahme' },
            { value: 'wind', label: 'Kein Windabgang' },
            { value: 'gewicht', label: 'Gewichtsverlust' },
            { value: 'bleistift', label: 'Bleistiftstuhl (sehr dünner Stuhl)' },
            { value: 'blutauflagerung', label: 'Blutauflagerung auf dem Stuhl' },
            { value: 'harnverhalt', label: 'Harnverhalt' }
        ],
        validation: { required: true },
        logic: {
            next: ['1003'],
            triage: {
                when: ['bleistift'],
                level: 'warning',
                message: 'INFO-Routing: Hinweis ans Praxispersonal markieren.'
            }
        }
    },

    // ==================== 7H: HORMONELL/STOFFWECHSEL ====================
    {
        id: '1060',
        type: 'multiselect',
        question: 'Welche hormonellen/Stoffwechselbeschwerden haben Sie?',
        section: 'beschwerden-hormonell',
        order: 20.8,
        options: [
            { value: 'gewicht', label: 'Gewichtsschwankungen' },
            { value: 'appetit', label: 'Appetitstörungen' },
            { value: 'osteoporose', label: 'Osteoporose' },
            { value: 'haarausfall', label: 'Haarausfall' },
            { value: 'schwitzen', label: 'Übermäßiges Schwitzen' },
            { value: 'hitzewallung', label: 'Hitzewallungen' },
            { value: 'freitext', label: 'Andere', followUpQuestions: ['1060-FT'] }
        ],
        validation: { required: true },
        logic: { next: ['1003'] }
    },
    {
        id: '1060-FT',
        type: 'text',
        question: 'Welche anderen Beschwerden?',
        section: 'beschwerden-hormonell',
        order: 20.81,
        logic: { next: ['1003'] }
    },

    // ==================== 7I: BEWEGUNGSAPPARAT ====================
    {
        id: '1070',
        type: 'multiselect',
        question: 'Wo haben Sie Beschwerden am Bewegungsapparat?',
        section: 'beschwerden-bewegung',
        order: 20.9,
        options: [
            { value: 'gelenke', label: 'Gelenke', followUpQuestions: ['1171'] },
            { value: 'muskeln', label: 'Muskeln', followUpQuestions: ['1174'] },
            { value: 'wirbelsaeule', label: 'Wirbelsäule', followUpQuestions: ['1175'] }
        ],
        validation: { required: true },
        logic: { next: ['1003'] }
    },
    {
        id: '1171',
        type: 'multiselect',
        question: 'Welche Gelenkbeschwerden?',
        section: 'beschwerden-bewegung',
        order: 20.91,
        options: [
            { value: 'schulter', label: 'Schulter' },
            { value: 'ellenbogen', label: 'Ellenbogen' },
            { value: 'handgelenk', label: 'Handgelenk' },
            { value: 'finger', label: 'Finger' },
            { value: 'huefte', label: 'Hüfte' },
            { value: 'knie', label: 'Knie' },
            { value: 'sprunggelenk', label: 'Sprunggelenk' },
            { value: 'zehen', label: 'Zehen' },
            { value: 'steifheit', label: 'Morgensteifigkeit' },
            { value: 'schwellung', label: 'Gelenkschwellung' },
            { value: 'schmerz_detail', label: 'Schmerzcharakter beschreiben', followUpQuestions: ['GELENK-SCHMERZ-100'] }
        ],
        validation: { required: true },
        logic: { next: ['1003'] }
    },

    // ==================== §7IAA: SCHMERZCHARAKTER ====================
    {
        id: 'GELENK-SCHMERZ-100',
        type: 'multiselect',
        question: 'Wie würden Sie den Schmerz beschreiben?',
        section: 'beschwerden-bewegung',
        order: 20.911,
        options: [
            { value: 'bohrend', label: 'Bohrend' },
            { value: 'brennend', label: 'Brennend' },
            { value: 'drueckend', label: 'Drückend' },
            { value: 'stechend', label: 'Stechend' },
            { value: 'ziehend', label: 'Ziehend' },
            { value: 'einschiesend', label: 'Einschießend' },
            { value: 'dumpf', label: 'Dumpf' }
        ],
        validation: { required: true },
        logic: { next: ['1003'] }
    },
    {
        id: '1174',
        type: 'multiselect',
        question: 'Welche Muskelbeschwerden?',
        section: 'beschwerden-bewegung',
        order: 20.92,
        options: [
            { value: 'kraempfe', label: 'Muskelkrämpfe' },
            { value: 'verspannung', label: 'Muskelverspannungen' },
            { value: 'schwaeche', label: 'Muskelschwäche' },
            { value: 'muskelschmerz', label: 'Muskelschmerzen' }
        ],
        validation: { required: true },
        logic: { next: ['1003'] }
    },
    {
        id: '1175',
        type: 'multiselect',
        question: 'Welche Wirbelsäulenbeschwerden?',
        section: 'beschwerden-bewegung',
        order: 20.93,
        options: [
            { value: 'hws', label: 'Halswirbelsäule/Nacken' },
            { value: 'bws', label: 'Brustwirbelsäule' },
            { value: 'lws', label: 'Lendenwirbelsäule' },
            { value: 'ischias', label: 'Ischiasschmerzen' },
            { value: 'bandscheibe', label: 'Bandscheibenvorfall' },
            { value: 'skoliose', label: 'Skoliose' },
            { value: 'taubheit_beine', label: '⚠ Taubheit/Kribbeln in beiden Beinen' },
            { value: 'blasenstoerung', label: '⚠ Blasen-/Mastdarm-Störung' },
            { value: 'laehmung', label: '⚠ Zunehmende Lähmung' },
            { value: 'trauma', label: 'Nach Sturz/Unfall' }
        ],
        validation: { required: true },
        logic: { next: ['1003'] }
    },

    // ==================== 7J: NEUROLOGISCH ====================
    {
        id: '1080',
        type: 'multiselect',
        question: 'Welche neurologischen Beschwerden haben Sie?',
        section: 'beschwerden-neurologie',
        order: 21.0,
        options: [
            { value: 'kopfschmerzen', label: 'Kopfschmerzen', followUpQuestions: ['1181'] },
            { value: 'gefuehlsstoerungen', label: 'Gefühlsstörungen', followUpQuestions: ['1184'] },
            { value: 'kontrollverlust', label: 'Kontrollstörungen', followUpQuestions: ['1185'] },
            { value: 'schwindel', label: 'Schwindel', followUpQuestions: ['1186'] },
            { value: 'konzentration', label: 'Konzentrations-/Gedächtnisstörungen', followUpQuestions: ['1190'] }
        ],
        validation: { required: true },
        logic: { next: ['1003'] }
    },
    {
        id: '1181',
        type: 'multiselect',
        question: 'Wie sind die Kopfschmerzen?',
        section: 'beschwerden-neurologie',
        order: 21.01,
        options: [
            { value: 'stirn', label: 'Stirn/Schläfe' },
            { value: 'hinterkopf', label: 'Hinterkopf' },
            { value: 'einseitig', label: 'Einseitig' },
            { value: 'beidseitig', label: 'Beidseitig' },
            { value: 'beim_aufwachen', label: 'Beim Aufwachen' },
            { value: 'bei_belastung', label: 'Bei Belastung' }
        ],
        validation: { required: true },
        logic: {
            next: ['1182'],
            triage: {
                when: ['beim_aufwachen'],
                level: 'warning',
                message: 'INFO-Routing: Hinweis ans Praxispersonal markieren.'
            }
        }
    },
    {
        id: '1182',
        type: 'select',
        question: 'Wie ist der Schmerzcharakter?',
        section: 'beschwerden-neurologie',
        order: 21.02,
        options: [
            { value: 'stechend', label: 'Stechend' },
            { value: 'pochend', label: 'Pochend' },
            { value: 'dumpf', label: 'Dumpf' },
            { value: 'drueckend', label: 'Drückend' },
            { value: 'bohrend', label: 'Bohrend' },
            { value: 'brennend', label: 'Brennend' }
        ],
        validation: { required: true },
        logic: { next: ['1183'] }
    },
    {
        id: '1183',
        type: 'number',
        question: 'Schmerzstärke (0-10)?',
        section: 'beschwerden-neurologie',
        order: 21.03,
        validation: { required: true, min: 0, max: 10 },
        logic: { next: ['KS-SYMPT-100'] }
    },

    // ==================== §7JAA: KOPFSCHMERZ-BEGLEITSYMPTOME (RED FLAGS) ====================
    {
        id: 'KS-SYMPT-100',
        type: 'multiselect',
        question: 'Haben Sie zusätzlich zu den Kopfschmerzen folgende Symptome?',
        section: 'beschwerden-neurologie',
        order: 21.035,
        options: [
            { value: 'donnerschlag', label: 'Donnerschlagkopfschmerz (plötzlich stärkster Schmerz)' },
            { value: 'nackensteife', label: 'Nackensteifigkeit' },
            { value: 'sehstoerung', label: 'Sehstörungen / Aura' },
            { value: 'uebelkeit', label: 'Übelkeit / Erbrechen' },
            { value: 'lichtempfindlich', label: 'Lichtempfindlichkeit' },
            { value: 'krampfanfall', label: 'Krampfanfall' },
            { value: 'bewusstlosigkeit', label: 'Bewusstlosigkeit / Bewusstseinsstörung' },
            { value: 'fieber', label: 'Fieber' },
            { value: 'gewichtsverlust', label: 'Gewichtsverlust' },
            { value: 'nachtschweiss', label: 'Nachtschweiß' },
            { value: 'neu_ueber50', label: 'Erstmalig aufgetreten und über 50 Jahre alt' },
            { value: 'keine', label: 'Keine der genannten' }
        ],
        validation: { required: true },
        logic: {
            next: ['1003'],
            triage: {
                when: ['donnerschlag'],
                level: 'critical',
                message: 'PRIORITY-Routing: Personal sofort informieren.'
            }
        }
    },
    {
        id: '1184',
        type: 'multiselect',
        question: 'Welche Gefühlsstörungen haben Sie?',
        section: 'beschwerden-neurologie',
        order: 21.04,
        options: [
            { value: 'taubheit', label: 'Taubheitsgefühl' },
            { value: 'kribbeln', label: 'Kribbeln/Ameisenlaufen' },
            { value: 'brennen', label: 'Brennendes Gefühl' },
            { value: 'kaelte', label: 'Kältegefühl' }
        ],
        validation: { required: true },
        logic: { next: ['1003'] }
    },
    {
        id: '1185',
        type: 'multiselect',
        question: 'Welche Kontrollstörungen haben Sie?',
        section: 'beschwerden-neurologie',
        order: 21.05,
        options: [
            { value: 'zittern', label: 'Zittern/Tremor' },
            { value: 'gleichgewicht', label: 'Gleichgewichtsstörungen' },
            { value: 'koordination', label: 'Koordinationsstörungen' },
            { value: 'laehmung', label: 'Lähmungserscheinungen' },
            { value: 'sprachstoerung', label: 'Sprachstörungen' }
        ],
        validation: { required: true },
        logic: {
            next: ['1003'],
            triage: {
                when: ['laehmung', 'sprachstoerung'],
                level: 'critical',
                message: 'PRIORITY-Routing: Personal sofort informieren.'
            }
        }
    },
    {
        id: '1186',
        type: 'multiselect',
        question: 'Welche Art von Schwindel?',
        section: 'beschwerden-neurologie',
        order: 21.06,
        options: [
            { value: 'drehschwindel', label: 'Drehschwindel' },
            { value: 'schwankschwindel', label: 'Schwankschwindel' },
            { value: 'liftschwindel', label: 'Liftgefühl' },
            { value: 'benommenheit', label: 'Benommenheit' },
            { value: 'lagerungsschwindel', label: 'Lagerungsschwindel' }
        ],
        validation: { required: true },
        logic: { next: ['1187'] }
    },
    {
        id: '1187',
        type: 'multiselect',
        question: 'Was löst den Schwindel aus?',
        section: 'beschwerden-neurologie',
        order: 21.07,
        options: [
            { value: 'kopfbewegung', label: 'Kopfbewegung' },
            { value: 'aufstehen', label: 'Aufstehen' },
            { value: 'lagewechsel', label: 'Lagewechsel' },
            { value: 'spontan', label: 'Spontan/ohne Auslöser' },
            { value: 'freitext', label: 'Sonstiges', followUpQuestions: ['1187-FT'] }
        ],
        validation: { required: true },
        logic: { next: ['1188'] }
    },
    {
        id: '1187-FT',
        type: 'text',
        question: 'Welcher andere Auslöser?',
        section: 'beschwerden-neurologie',
        order: 21.071,
        logic: { next: ['1188'] }
    },
    {
        id: '1188',
        type: 'multiselect',
        question: 'Wie lange dauert der Schwindel?',
        section: 'beschwerden-neurologie',
        order: 21.08,
        options: [
            { value: 'sekunden', label: 'Sekunden' },
            { value: 'minuten', label: 'Minuten' },
            { value: 'stunden', label: 'Stunden' },
            { value: 'dauerhaft', label: 'Dauerhaft' }
        ],
        validation: { required: true },
        logic: { next: ['1189'] }
    },
    {
        id: '1189',
        type: 'multiselect',
        question: 'Begleitsymptome beim Schwindel?',
        section: 'beschwerden-neurologie',
        order: 21.09,
        options: [
            { value: 'uebelkeit', label: 'Übelkeit' },
            { value: 'erbrechen', label: 'Erbrechen' },
            { value: 'hoerstoerung', label: 'Hörstörung' },
            { value: 'sehstoerung', label: 'Sehstörung' },
            { value: 'kopfschmerz', label: 'Kopfschmerzen' },
            { value: 'ohnmacht', label: 'Ohnmachtsgefühl' }
        ],
        validation: { required: true },
        logic: { next: ['1003'] }
    },
    {
        id: '1190',
        type: 'multiselect',
        question: 'Welche mentalen Beeinträchtigungen?',
        section: 'beschwerden-neurologie',
        order: 21.10,
        options: [
            { value: 'konzentration', label: 'Konzentrationsschwäche' },
            { value: 'vergesslichkeit', label: 'Vergesslichkeit' },
            { value: 'wortfindung', label: 'Wortfindungsstörungen' },
            { value: 'orientierung', label: 'Orientierungsstörungen' },
            { value: 'freitext', label: 'Weitere', followUpQuestions: ['1190-FT'] }
        ],
        validation: { required: true },
        logic: { next: ['1003'] }
    },
    {
        id: '1190-FT',
        type: 'text',
        question: 'Welche weiteren mentalen Beeinträchtigungen?',
        section: 'beschwerden-neurologie',
        order: 21.101,
        logic: { next: ['1003'] }
    },

    // ==================== 7K: UROLOGIE/GYNÄKOLOGIE ====================
    {
        id: '1090',
        type: 'multiselect',
        question: 'Welche urologischen/gynäkologischen Beschwerden haben Sie?',
        section: 'beschwerden-urologie',
        order: 21.2,
        options: [
            { value: 'harnbeschwerden', label: 'Harnbeschwerden/Brennen', followUpQuestions: ['URO-100'] },
            { value: 'harninkontinenz', label: 'Harninkontinenz' },
            { value: 'erektionsstoerung', label: 'Erektionsstörung' },
            { value: 'hodenbeschwerden', label: 'Hodenbeschwerden' },
            { value: 'hodenkrampfader', label: 'Hodenkrampfader (Varikozele)' },
            { value: 'zyklusstorung', label: 'Zyklusstörungen', followUpQuestions: ['GYN-101'] },
            { value: 'schwangerschaft', label: 'Schwangerschaftsprobleme', followUpQuestions: ['GYN-103'] },
            { value: 'ausfluss', label: 'Vaginaler Ausfluss' },
            { value: 'juckreiz_genital', label: 'Juckreiz im Genitalbereich' },
            { value: 'dyspareunie', label: 'Schmerzen beim Geschlechtsverkehr' },
            { value: 'iup', label: 'Intrauterinpessar vorhanden' },
            { value: 'pcos', label: 'Polyzystisches Ovar (PCOS)' },
            { value: 'endometriose', label: 'Endometriose' },
            { value: 'klimakterium', label: 'Klimakterische Beschwerden' },
            { value: 'blutung', label: 'Unregelmäßige Blutungen', followUpQuestions: ['GYN-102'] },
            { value: 'unterbauch', label: 'Unterbauchschmerzen' },
            { value: 'freitext', label: 'Andere', followUpQuestions: ['1090-FT'] }
        ],
        validation: { required: true },
        logic: { next: ['1003'] }
    },
    {
        id: '1090-FT',
        type: 'text',
        question: 'Welche anderen Beschwerden?',
        section: 'beschwerden-urologie',
        order: 21.21,
        logic: { next: ['1003'] }
    },

    // ==================== §7LA: MIKTION DETAIL ====================
    {
        id: 'URO-100',
        type: 'multiselect',
        question: 'Nähere Angaben zu den Miktionsbeschwerden:',
        section: 'beschwerden-urologie',
        order: 21.211,
        options: [
            { value: 'dysurie', label: 'Schmerzen/Brennen beim Wasserlassen' },
            { value: 'pollakisurie', label: 'Häufiges Wasserlassen (Pollakisurie)' },
            { value: 'nykturie', label: 'Nächtliches Wasserlassen (Nykturie)' },
            { value: 'harnverhalt', label: 'Harnverhalt / Startschwierigkeiten' },
            { value: 'schwacher_strahl', label: 'Schwacher Harnstrahl' },
            { value: 'nachtraeufeln', label: 'Nachträufeln' },
            { value: 'drang', label: 'Starker Harndrang' }
        ],
        validation: { required: true },
        logic: { next: ['URO-101'] }
    },
    {
        id: 'URO-101',
        type: 'multiselect',
        question: 'Auffälligkeiten beim Urin:',
        section: 'beschwerden-urologie',
        order: 21.212,
        options: [
            { value: 'haematurie', label: 'Blut im Urin (Hämaturie)' },
            { value: 'trueb', label: 'Trüber Urin' },
            { value: 'geruch', label: 'Auffälliger Geruch' },
            { value: 'schaum', label: 'Schäumender Urin' },
            { value: 'keine', label: 'Keine Auffälligkeiten' }
        ],
        validation: { required: true },
        logic: { next: ['1003'] }
    },

    // ==================== §7M: GYNÄKOLOGIE DETAIL ====================
    {
        id: 'GYN-101',
        type: 'multiselect',
        question: 'Bitte geben Sie Details zu Ihrem Zyklus an:',
        section: 'beschwerden-gynaekologie',
        order: 21.22,
        options: [
            { value: 'amenorrhoe', label: 'Amenorrhö (Ausbleiben der Regel)' },
            { value: 'polymenorrhoe', label: 'Polymenorrhö (zu häufige Blutung)' },
            { value: 'dauer_lang', label: 'Blutungsdauer > 8 Tage' },
            { value: 'schwankung', label: 'Zykluslänge stark schwankend (>7-9 Tage)' },
            { value: 'zwischen_blutung', label: 'Zwischen- oder Kontaktblutungen' },
            { value: 'postkoital', label: 'Postkoitale Blutung' },
            { value: 'postmenopausal', label: 'Postmenopausale Blutung' },
            { value: 'schmerzhaft', label: 'Schmerzhafte Menstruation (Dysmenorrhö)' }
        ],
        validation: { required: true },
        logic: {
            next: ['1003'],
            showIf: [{ operator: 'contextEquals', key: 'gender', value: 'W' }]
        }
    },
    {
        id: 'GYN-102',
        type: 'multiselect',
        question: 'Nähere Angaben zu den Blutungsstörungen:',
        section: 'beschwerden-gynaekologie',
        order: 21.23,
        options: [
            { value: 'zwischenblutungen', label: 'Zwischenblutungen' },
            { value: 'postmenopausal', label: 'Postmenopausale Blutung' },
            { value: 'schmerzhaft', label: 'Schmerzhafte Menstruation' },
            { value: 'stark', label: 'Starke oder verlängerte Regelblutungen' },
            { value: 'naechtlich', label: 'Nächtliches Wechseln erforderlich' },
            { value: 'koagel', label: 'Koagel > 2-3 cm' }
        ],
        validation: { required: true },
        logic: {
            next: ['1003'],
            showIf: [{ operator: 'contextEquals', key: 'gender', value: 'W' }]
        }
    },
    {
        id: 'GYN-103',
        type: 'multiselect',
        question: 'Schwangerschaftsanamnese:',
        section: 'beschwerden-gynaekologie',
        order: 21.24,
        options: [
            { value: 'geburten', label: 'Geburten' },
            { value: 'abort', label: 'Fehlgeburt (Abort)' },
            { value: 'sectio', label: 'Kaiserschnitt (Sectio)' },
            { value: 'praeklampsie', label: 'Präeklampsie' },
            { value: 'gestationsdiabetes', label: 'Gestationsdiabetes' },
            { value: 'aktuell_schwanger', label: 'Aktuell schwanger', followUpQuestions: ['GYN-104'] }
        ],
        validation: { required: true },
        logic: {
            next: ['1003'],
            showIf: [{ operator: 'contextEquals', key: 'gender', value: 'W' }]
        }
    },
    {
        id: 'GYN-104',
        type: 'multiselect',
        question: 'Aktuelle Schwangerschaftsprobleme:',
        section: 'beschwerden-gynaekologie',
        order: 21.25,
        options: [
            { value: 'fluessigkeit', label: 'Flüssigkeitsabgang (Verdacht Blasensprung)' },
            { value: 'wenig_bewegung', label: 'Deutlich weniger/keine Kindsbewegungen (ab SSW 24)' },
            { value: 'oedeme', label: 'Plötzliche Ödeme' },
            { value: 'symphysenschmerz', label: 'Symphysenschmerz' },
            { value: 'sodbrennen', label: 'Sodbrennen' },
            { value: 'haemorrhoiden', label: 'Hämorrhoiden' }
        ],
        validation: { required: true },
        logic: {
            next: ['1003'],
            showIf: [{ operator: 'contextEquals', key: 'gender', value: 'W' }]
        }
    },

    // ==================== 7L: PSYCHISCHE BESCHWERDEN (PHQ-Style) ====================
    {
        id: '1C00',
        type: 'radio',
        question: 'Haben Sie unter anhaltender Traurigkeit oder Niedergeschlagenheit gelitten?',
        section: 'beschwerden-psyche',
        order: 21.3,
        options: [
            { value: 'ja', label: 'Ja' },
            { value: 'nein', label: 'Nein' }
        ],
        validation: { required: true },
        logic: { next: ['1C01'] }
    },
    {
        id: '1C01',
        type: 'radio',
        question: 'Haben Sie wenig Interesse oder Freude an Ihren Aktivitäten?',
        section: 'beschwerden-psyche',
        order: 21.31,
        options: [
            { value: 'ja', label: 'Ja' },
            { value: 'nein', label: 'Nein' }
        ],
        validation: { required: true },
        logic: { next: ['1C02'] }
    },
    {
        id: '1C02',
        type: 'radio',
        question: 'Fühlen Sie sich antriebslos oder ständig müde?',
        section: 'beschwerden-psyche',
        order: 21.32,
        options: [
            { value: 'ja', label: 'Ja' },
            { value: 'nein', label: 'Nein' }
        ],
        validation: { required: true },
        logic: { next: ['1C03'] }
    },
    {
        id: '1C03',
        type: 'radio',
        question: 'Haben Sie vermehrt Angst oder Nervosität?',
        section: 'beschwerden-psyche',
        order: 21.33,
        options: [
            { value: 'ja', label: 'Ja' },
            { value: 'nein', label: 'Nein' }
        ],
        validation: { required: true },
        logic: { next: ['1C04'] }
    },
    {
        id: '1C04',
        type: 'radio',
        question: 'Haben Sie Panikattacken oder Angstanfälle?',
        section: 'beschwerden-psyche',
        order: 21.34,
        options: [
            { value: 'ja', label: 'Ja' },
            { value: 'nein', label: 'Nein' }
        ],
        validation: { required: true },
        logic: { next: ['1C05'] }
    },
    {
        id: '1C05',
        type: 'radio',
        question: 'Vermeiden Sie bestimmte Situationen aus Angst?',
        section: 'beschwerden-psyche',
        order: 21.35,
        options: [
            { value: 'ja', label: 'Ja' },
            { value: 'nein', label: 'Nein' }
        ],
        validation: { required: true },
        logic: { next: ['1C06'] }
    },
    {
        id: '1C06',
        type: 'radio',
        question: 'Haben Sie Schlafstörungen (Ein-/Durchschlafprobleme)?',
        section: 'beschwerden-psyche',
        order: 21.36,
        options: [
            { value: 'ja', label: 'Ja' },
            { value: 'nein', label: 'Nein' }
        ],
        validation: { required: true },
        logic: { next: ['1C07'] }
    },
    {
        id: '1C07',
        type: 'radio',
        question: 'Haben Sie Konzentrationsprobleme?',
        section: 'beschwerden-psyche',
        order: 21.37,
        options: [
            { value: 'ja', label: 'Ja' },
            { value: 'nein', label: 'Nein' }
        ],
        validation: { required: true },
        logic: { next: ['1C08'] }
    },
    {
        id: '1C08',
        type: 'radio',
        question: 'Haben Sie Gedächtnisprobleme?',
        section: 'beschwerden-psyche',
        order: 21.38,
        options: [
            { value: 'ja', label: 'Ja' },
            { value: 'nein', label: 'Nein' }
        ],
        validation: { required: true },
        logic: { next: ['1C09'] }
    },
    {
        id: '1C09',
        type: 'radio',
        question: 'Hören Sie Stimmen oder sehen Sie Dinge, die andere nicht wahrnehmen?',
        section: 'beschwerden-psyche',
        order: 21.39,
        options: [
            { value: 'ja', label: 'Ja' },
            { value: 'nein', label: 'Nein' }
        ],
        validation: { required: true },
        logic: { next: ['1C10'] }
    },
    {
        id: '1C10',
        type: 'radio',
        question: 'Haben Sie ungewöhnliche Überzeugungen, die andere nicht teilen?',
        section: 'beschwerden-psyche',
        order: 21.40,
        options: [
            { value: 'ja', label: 'Ja' },
            { value: 'nein', label: 'Nein' }
        ],
        validation: { required: true },
        logic: { next: ['1C11'] }
    },
    {
        id: '1C11',
        type: 'radio',
        question: 'Konsumieren Sie regelmäßig Alkohol in größeren Mengen?',
        section: 'beschwerden-psyche',
        order: 21.41,
        options: [
            { value: 'ja', label: 'Ja' },
            { value: 'nein', label: 'Nein' }
        ],
        validation: { required: true },
        logic: { next: ['1C12'] }
    },
    {
        id: '1C12',
        type: 'radio',
        question: 'Nehmen Sie Drogen oder nicht verschriebene Medikamente?',
        section: 'beschwerden-psyche',
        order: 21.42,
        options: [
            { value: 'ja', label: 'Ja' },
            { value: 'nein', label: 'Nein' }
        ],
        validation: { required: true },
        logic: { next: ['1C13'] }
    },
    {
        id: '1C13',
        type: 'radio',
        question: 'Hatten Sie in letzter Zeit Gedanken, sich selbst zu verletzen?',
        section: 'beschwerden-psyche',
        order: 21.43,
        options: [
            { value: 'ja', label: 'Ja' },
            { value: 'nein', label: 'Nein' }
        ],
        validation: { required: true },
        logic: {
            next: ['1C14'],
            triage: {
                when: ['ja'],
                level: 'critical',
                message: 'PRIORITY-Routing: Suizid-/Krisen-Support-Pfad — Personal informieren, Patient sieht zentralen Support-Hinweis.'
            }
        }
    },
    {
        id: '1C14',
        type: 'radio',
        question: 'Haben Sie Suizidgedanken oder -pläne?',
        section: 'beschwerden-psyche',
        order: 21.44,
        options: [
            { value: 'ja', label: 'Ja' },
            { value: 'nein', label: 'Nein' }
        ],
        validation: { required: true },
        logic: {
            next: ['1003'],
            triage: {
                when: ['ja'],
                level: 'critical',
                message: 'PRIORITY-Routing: Suizid-/Krisen-Support-Pfad — Personal informieren, Patient sieht zentralen Support-Hinweis.'
            }
        }
    },

    // ==================== PART 3: GESUNDHEITSSTÖRUNGEN DETAIL FOLLOWUPS ====================
    {
        id: '7003',
        type: 'select',
        question: 'Welche Art der Dialyse?',
        section: 'gesundheitsstoerungen',
        order: 54.1,
        options: [
            { value: 'haemodialyse', label: 'Hämodialyse' },
            { value: 'peritonealdialyse', label: 'Peritonealdialyse' },
            { value: 'heimdialyse', label: 'Heimdialyse' },
            { value: 'av_fistel', label: 'Über AV-Fistel' },
            { value: 'dialysekatheter', label: 'Über Dialysekatheter' },
            { value: 'unbekannt', label: 'Unbekannt' }
        ],
        validation: { required: true },
        logic: { next: ['8000'] }
    },
    {
        id: '7004',
        type: 'multiselect',
        question: 'Welche Depressionsbehandlung erhalten Sie?',
        section: 'gesundheitsstoerungen',
        order: 54.2,
        options: [
            { value: 'major_depression', label: 'Major Depression' },
            { value: 'dysthymie', label: 'Dysthymie (chronisch leicht)' },
            { value: 'bipolar', label: 'Bipolare Störung' },
            { value: 'schizoaffektiv', label: 'Schizoaffektive Störung' },
            { value: 'saisonal', label: 'Saisonale Depression' },
            { value: 'medikamente', label: 'Medikamente/Antidepressiva' },
            { value: 'therapie', label: 'Psychotherapie' },
            { value: 'stationaer', label: 'Stationäre Behandlung' },
            { value: 'keine', label: 'Keine Behandlung' }
        ],
        validation: { required: true },
        logic: { next: ['8000'] }
    },
    {
        id: '7005',
        type: 'multiselect',
        question: 'Welche Herzerkrankung?',
        section: 'gesundheitsstoerungen',
        order: 54.3,
        options: [
            { value: 'herzschwaeche', label: 'Herzinsuffizienz/Herzschwäche' },
            { value: 'rhythmus', label: 'Herzrhythmusstörungen' },
            { value: 'vorhofflimmern', label: 'Vorhofflimmern' },
            { value: 'klappe', label: 'Herzklappenfehler' },
            { value: 'khk', label: 'Koronare Herzkrankheit' },
            { value: 'kardiomyopathie', label: 'Kardiomyopathie' },
            { value: 'pfo', label: 'Offenes Foramen ovale (PFO)' }
        ],
        validation: { required: true },
        logic: { next: ['8000'] }
    },
    {
        id: '7006',
        type: 'multiselect',
        question: 'Welche Magen-Darm-Erkrankung?',
        section: 'gesundheitsstoerungen',
        order: 54.4,
        options: [
            { value: 'gastritis', label: 'Chronische Gastritis' },
            { value: 'ulzera', label: 'Magengeschwür/Ulkus' },
            { value: 'morbus_crohn', label: 'Morbus Crohn' },
            { value: 'colitis', label: 'Colitis ulcerosa' },
            { value: 'leber', label: 'Lebererkrankung' },
            { value: 'hepatitis', label: 'Hepatitis' },
            { value: 'bil_zirrhose', label: 'Biliäre Zirrhose' },
            { value: 'divertikel', label: 'Divertikulose/Divertikulitis' },
            { value: 'fettleber', label: 'Fettleber' },
            { value: 'gerd', label: 'GERD / Refluxkrankheit' },
            { value: 'gallensteine', label: 'Gallensteine' },
            { value: 'leberzirrhose', label: 'Leberzirrhose' },
            { value: 'pankreatitis', label: 'Pankreatitis' },
            { value: 'pfortader', label: 'Pfortaderthrombose' },
            { value: 'freitext', label: 'Andere', followUpQuestions: ['7006-FT'] }
        ],
        validation: { required: true },
        logic: { next: ['8000'] }
    },
    {
        id: '7006-FT',
        type: 'text',
        question: 'Welche andere Magen-Darm-Erkrankung?',
        section: 'gesundheitsstoerungen',
        order: 54.41,
        logic: { next: ['8000'] }
    },
    {
        id: '7008',
        type: 'multiselect',
        question: 'Welche Nierenerkrankung?',
        section: 'gesundheitsstoerungen',
        order: 54.6,
        options: [
            { value: 'chronisch', label: 'Chronische Niereninsuffizienz' },
            { value: 'nierensteine', label: 'Nierensteine' },
            { value: 'zysten', label: 'Nierenzysten' },
            { value: 'nierenbecken', label: 'Nierenbeckenentzündung' },
            { value: 'glomerulonephritis', label: 'Glomerulonephritis' },
            { value: 'zystennieren', label: 'Zystennieren (polyzystisch)' },
            { value: 'freitext', label: 'Andere', followUpQuestions: ['7008-FT'] }
        ],
        validation: { required: true },
        logic: { next: ['8000'] }
    },
    {
        id: '7008-FT',
        type: 'text',
        question: 'Welche andere Nierenerkrankung?',
        section: 'gesundheitsstoerungen',
        order: 54.61,
        logic: { next: ['8000'] }
    },
    {
        id: '7009',
        type: 'multiselect',
        question: 'Welche Nervenerkrankung?',
        section: 'gesundheitsstoerungen',
        order: 54.7,
        options: [
            { value: 'epilepsie', label: 'Epilepsie' },
            { value: 'ms', label: 'Multiple Sklerose' },
            { value: 'parkinson', label: 'Morbus Parkinson' },
            { value: 'polyneuropathie', label: 'Polyneuropathie' },
            { value: 'migraene', label: 'Migräne' },
            { value: 'neuropathisch', label: 'Neuropathische Schmerzen' },
            { value: 'freitext', label: 'Andere', followUpQuestions: ['7009-FT'] }
        ],
        validation: { required: true },
        logic: { next: ['8000'] }
    },
    {
        id: '7009-FT',
        type: 'text',
        question: 'Welche andere Nervenerkrankung?',
        section: 'gesundheitsstoerungen',
        order: 54.71,
        logic: { next: ['8000'] }
    },
    {
        id: '7010',
        type: 'multiselect',
        question: 'Welche rheumatische Erkrankung?',
        section: 'gesundheitsstoerungen',
        order: 54.8,
        options: [
            { value: 'rheumatoide_arthritis', label: 'Rheumatoide Arthritis' },
            { value: 'fibromyalgie', label: 'Fibromyalgie' },
            { value: 'gicht', label: 'Gicht' },
            { value: 'lupus', label: 'Lupus' },
            { value: 'spondylitis', label: 'Spondylitis ankylosans/Morbus Bechterew' },
            { value: 'freitext', label: 'Andere', followUpQuestions: ['7010-FT'] }
        ],
        validation: { required: true },
        logic: { next: ['8000'] }
    },
    {
        id: '7010-FT',
        type: 'text',
        question: 'Welche andere rheumatische Erkrankung?',
        section: 'gesundheitsstoerungen',
        order: 54.81,
        logic: { next: ['8000'] }
    },
    {
        id: '7011',
        type: 'multiselect',
        question: 'Welche Schilddrüsenerkrankung?',
        section: 'gesundheitsstoerungen',
        order: 54.9,
        options: [
            { value: 'ueberfunktion', label: 'Schilddrüsenüberfunktion' },
            { value: 'unterfunktion', label: 'Schilddrüsenunterfunktion' },
            { value: 'hashimoto', label: 'Hashimoto-Thyreoiditis' },
            { value: 'knoten', label: 'Schilddrüsenknoten' },
            { value: 'op', label: 'Z.n. Schilddrüsen-OP' },
            { value: 'autonomie', label: 'Autonomie (heißer Knoten)' },
            { value: 'basedow', label: 'Morbus Basedow' },
            { value: 'struma', label: 'Schilddrüsenvergrößerung (Struma)' }
        ],
        validation: { required: true },
        logic: { next: ['8000'] }
    },

    // ==================== PART 4: VORERKRANKUNGEN DETAIL ====================
    {
        id: '8001',
        type: 'multiselect',
        question: 'Art und Therapie des Aneurysmas?',
        section: 'vorerkrankungen',
        order: 55.1,
        options: [
            { value: 'aorta', label: 'Aortenaneurysma' },
            { value: 'hirn', label: 'Hirnaneurysma' },
            { value: 'peripher', label: 'Peripheres Aneurysma' },
            { value: 'op', label: 'Operiert' },
            { value: 'stent', label: 'Stent-Graft / endovaskulär' },
            { value: 'beobachtung', label: 'Unter Beobachtung' }
        ],
        validation: { required: true },
        logic: { next: ['1500'] }
    },
    {
        id: '8003',
        type: 'multiselect',
        question: 'Welche Durchblutungsstörung und Behandlung?',
        section: 'vorerkrankungen',
        order: 55.2,
        options: [
            { value: 'pavk', label: 'pAVK / Schaufensterkrankheit' },
            { value: 'carotis', label: 'Halsschlagader-Stenose' },
            { value: 'niere', label: 'Nierenarterienstenose' },
            { value: 'atherosklerose', label: 'Atherosklerose' },
            { value: 'raynaud', label: 'Raynaud-Syndrom' },
            { value: 'vaskulitis', label: 'Vaskulitis' },
            { value: 'medikamente', label: 'Medikamentöse Behandlung' },
            { value: 'op', label: 'Operiert / Stent' }
        ],
        validation: { required: true },
        logic: { next: ['1500'] }
    },
    {
        id: '8005',
        type: 'multiselect',
        question: 'Wo war die Thrombose und wann?',
        section: 'vorerkrankungen',
        order: 55.3,
        options: [
            { value: 'bein', label: 'Beinvenenthrombose' },
            { value: 'arm', label: 'Armvenenthrombose' },
            { value: 'portal', label: 'Pfortaderthrombose' },
            { value: 'sinus', label: 'Sinusvenenthrombose' },
            { value: 'rezidiv', label: 'Wiederholt aufgetreten' },
            { value: 'blutverd', label: 'Nehme Blutverdrünner deswegen' }
        ],
        validation: { required: true },
        logic: { next: ['1500'] }
    },
    {
        id: '8010',
        type: 'multiselect',
        question: 'Welche Art von Krebs?',
        section: 'vorerkrankungen',
        order: 55.4,
        options: [
            { value: 'darm', label: 'Darmkrebs' },
            { value: 'brust', label: 'Brustkrebs' },
            { value: 'lunge', label: 'Lungenkrebs' },
            { value: 'prostata', label: 'Prostatakrebs' },
            { value: 'haut', label: 'Hautkrebs' },
            { value: 'blut', label: 'Leukämie/Lymphom' },
            { value: 'freitext', label: 'Andere', followUpQuestions: ['8010-FT'] }
        ],
        validation: { required: true },
        logic: { next: ['8011'] }
    },
    {
        id: '8010-FT',
        type: 'text',
        question: 'Welche andere Krebserkrankung?',
        section: 'vorerkrankungen',
        order: 55.41,
        logic: { next: ['8011'] }
    },
    {
        id: '8011',
        type: 'text',
        question: 'Wann wurde der Krebs diagnostiziert?',
        section: 'vorerkrankungen',
        order: 55.5,
        placeholder: 'z.B. 2019',
        logic: { next: ['8012'] }
    },
    {
        id: '8012',
        type: 'select',
        question: 'Aktuelle Behandlungsstatus?',
        section: 'vorerkrankungen',
        order: 55.6,
        options: [
            { value: 'aktiv', label: 'Aktive Behandlung' },
            { value: 'nachsorge', label: 'Nachsorge' },
            { value: 'remission', label: 'In Remission' },
            { value: 'geheilt', label: 'Geheilt' }
        ],
        validation: { required: true },
        logic: { next: ['1500'] }
    },

    // ==================== §14D: HERZ-OP DETAIL ====================
    {
        id: 'HERZOP-100',
        type: 'multiselect',
        question: 'Welche Herz-OP / welcher Eingriff?',
        section: 'vorerkrankungen',
        order: 55.61,
        options: [
            { value: 'stent', label: 'Stent-Implantation' },
            { value: 'bypass', label: 'Bypass-Operation' },
            { value: 'klappen_op', label: 'Herzklappen-OP' },
            { value: 'schrittmacher', label: 'Herzschrittmacher' },
            { value: 'defi', label: 'Defibrillator (ICD)' },
            { value: 'ablation', label: 'Katheterablation' },
            { value: 'freitext', label: 'Andere OP (Freitext)' }
        ],
        validation: { required: true },
        logic: { next: ['1500'] }
    },

    // ==================== §14E: HERZINFARKT WANN ====================
    {
        id: 'HI-WANN-100',
        type: 'text',
        question: 'Wann war der Herzinfarkt?',
        section: 'vorerkrankungen',
        order: 55.62,
        placeholder: 'z.B. 2020 oder vor 5 Jahren',
        logic: { next: ['1500'] }
    },

    // ==================== §14H: LUNGENEMBOLIE WANN ====================
    {
        id: 'LE-WANN-100',
        type: 'text',
        question: 'Wann war die Lungenembolie?',
        section: 'vorerkrankungen',
        order: 55.63,
        placeholder: 'z.B. 2021',
        logic: { next: ['1500'] }
    },

    // ==================== §14J: SCHLAGANFALL DETAIL ====================
    {
        id: 'STROKE-100',
        type: 'multiselect',
        question: 'Angaben zum Schlaganfall:',
        section: 'vorerkrankungen',
        order: 55.64,
        options: [
            { value: 'ischaemisch', label: 'Ischämischer Schlaganfall (Hirninfarkt)' },
            { value: 'haemorrhagisch', label: 'Hämorrhagischer Schlaganfall (Blutung)' },
            { value: 'tia', label: 'TIA (vorübergehend)' },
            { value: 'laehmung', label: 'Folgeschaden: Lähmung' },
            { value: 'sprachstoerung', label: 'Folgeschaden: Sprachstörung' },
            { value: 'schluckstoerung', label: 'Folgeschaden: Schluckstörung' },
            { value: 'sehstoerung', label: 'Folgeschaden: Sehstörung' },
            { value: 'keine_folge', label: 'Keine bleibenden Folgeschäden' }
        ],
        validation: { required: true },
        logic: { next: ['1500'] }
    },

    // ==================== §14F: INFEKTIONSKRANKHEITEN ====================
    {
        id: 'INFEKT-100',
        type: 'multiselect',
        question: 'Welche Infektionskrankheiten hatten Sie?',
        section: 'vorerkrankungen',
        order: 55.65,
        options: [
            { value: 'hepatitis_b', label: 'Hepatitis B' },
            { value: 'hepatitis_c', label: 'Hepatitis C' },
            { value: 'hiv', label: 'HIV' },
            { value: 'tbc', label: 'Tuberkulose' },
            { value: 'borreliose', label: 'Borreliose' },
            { value: 'covid', label: 'COVID-19 (schwerer Verlauf / Long COVID)' },
            { value: 'freitext', label: 'Andere' }
        ],
        validation: { required: true },
        logic: { next: ['1500'] }
    },

    // ==================== §14I: TRANSPLANTATION ====================
    {
        id: 'TRANS-100',
        type: 'multiselect',
        question: 'Welche Transplantation?',
        section: 'vorerkrankungen',
        order: 55.66,
        options: [
            { value: 'niere', label: 'Nierentransplantation' },
            { value: 'leber', label: 'Lebertransplantation' },
            { value: 'herz', label: 'Herztransplantation' },
            { value: 'lunge', label: 'Lungentransplantation' },
            { value: 'knochenmark', label: 'Knochenmark-/Stammzelltransplantation' },
            { value: 'freitext', label: 'Andere' }
        ],
        validation: { required: true },
        logic: { next: ['1500'] }
    },

    // ==================== PART 5: KINDER (showIf age < 6) ====================
    {
        id: '1500',
        type: 'radio',
        question: 'Handelt es sich um ein Frühgeborenes?',
        section: 'kinder',
        order: 70,
        options: [
            { value: 'ja', label: 'Ja' },
            { value: 'nein', label: 'Nein' }
        ],
        validation: { required: true },
        logic: {
            next: ['1501'],
            showIf: [{ operator: 'contextLessThan', key: 'age', value: 6 }]
        }
    },
    {
        id: '1501',
        type: 'number',
        question: 'Geburtsgewicht in Gramm?',
        section: 'kinder',
        order: 71,
        validation: { required: true, min: 200, max: 6000 },
        logic: {
            next: ['1502'],
            showIf: [{ operator: 'contextLessThan', key: 'age', value: 6 }]
        }
    },
    {
        id: '1502',
        type: 'number',
        question: 'Geburtsgröße in cm?',
        section: 'kinder',
        order: 72,
        validation: { required: true, min: 20, max: 65 },
        logic: {
            next: ['KIND-SSW'],
            showIf: [{ operator: 'contextLessThan', key: 'age', value: 6 }]
        }
    },

    // ==================== §15C-15I: KINDER GEBURT DETAIL ====================
    {
        id: 'KIND-SSW',
        type: 'select',
        question: 'In welcher Schwangerschaftswoche wurde das Kind geboren?',
        section: 'kinder',
        order: 72.1,
        options: [
            { value: 'vor_28', label: 'Vor der 28. SSW (extrem früh)' },
            { value: '28_32', label: '28.-32. SSW (sehr früh)' },
            { value: '32_37', label: '32.-37. SSW (früh)' },
            { value: 'ab_37', label: 'Ab 37. SSW (termingerecht)' }
        ],
        validation: { required: true },
        logic: {
            next: ['KIND-MODUS'],
            showIf: [{ operator: 'contextLessThan', key: 'age', value: 6 }]
        }
    },
    {
        id: 'KIND-MODUS',
        type: 'select',
        question: 'Wie wurde das Kind entbunden?',
        section: 'kinder',
        order: 72.2,
        options: [
            { value: 'spontan', label: 'Spontangeburt' },
            { value: 'sectio', label: 'Kaiserschnitt (Sectio)' },
            { value: 'saugglocke', label: 'Saugglocke (Vakuumextraktion)' },
            { value: 'forceps', label: 'Zangengeburt (Forceps)' },
            { value: 'startprobleme', label: 'Startprobleme nach Geburt' }
        ],
        validation: { required: true },
        logic: {
            next: ['APGAR-1'],
            showIf: [{ operator: 'contextLessThan', key: 'age', value: 6 }]
        }
    },

    // ==================== §15F/G/H: APGAR-SCORES ====================
    {
        id: 'APGAR-1',
        type: 'select',
        question: 'APGAR-Score nach 1 Minute (falls bekannt):',
        section: 'kinder',
        order: 72.25,
        options: [
            { value: '0_3', label: '0–3 (schwer deprimiert)' },
            { value: '4_6', label: '4–6 (mäßig deprimiert)' },
            { value: '7_10', label: '7–10 (lebensfrisch)' },
            { value: 'weiss_nicht', label: 'Weiß nicht' }
        ],
        validation: { required: true },
        logic: {
            next: ['APGAR-5'],
            showIf: [{ operator: 'contextLessThan', key: 'age', value: 6 }]
        }
    },
    {
        id: 'APGAR-5',
        type: 'select',
        question: 'APGAR-Score nach 5 Minuten (falls bekannt):',
        section: 'kinder',
        order: 72.26,
        options: [
            { value: '0_3', label: '0–3 (schwer deprimiert)' },
            { value: '4_6', label: '4–6 (mäßig deprimiert)' },
            { value: '7_10', label: '7–10 (lebensfrisch)' },
            { value: 'weiss_nicht', label: 'Weiß nicht' }
        ],
        validation: { required: true },
        logic: {
            next: ['APGAR-10'],
            showIf: [{ operator: 'contextLessThan', key: 'age', value: 6 }]
        }
    },
    {
        id: 'APGAR-10',
        type: 'select',
        question: 'APGAR-Score nach 10 Minuten (falls bekannt):',
        section: 'kinder',
        order: 72.27,
        options: [
            { value: '0_3', label: '0–3 (schwer deprimiert)' },
            { value: '4_6', label: '4–6 (mäßig deprimiert)' },
            { value: '7_10', label: '7–10 (lebensfrisch)' },
            { value: 'weiss_nicht', label: 'Weiß nicht' }
        ],
        validation: { required: true },
        logic: {
            next: ['NIUS-100'],
            showIf: [{ operator: 'contextLessThan', key: 'age', value: 6 }]
        }
    },

    // ==================== §15I: NIUS (Neonatale Intensivstation) ====================
    {
        id: 'NIUS-100',
        type: 'radio',
        question: 'War ein Aufenthalt auf der neonatalen Intensivstation (NIUS) erforderlich?',
        section: 'kinder',
        order: 72.28,
        options: [
            { value: 'ja', label: 'Ja', followUpQuestions: ['NIUS-TAGE'] },
            { value: 'nein', label: 'Nein' },
            { value: 'unbekannt', label: 'Unbekannt' }
        ],
        validation: { required: true },
        logic: {
            next: ['KIND-ERN'],
            showIf: [{ operator: 'contextLessThan', key: 'age', value: 6 }]
        }
    },
    {
        id: 'NIUS-TAGE',
        type: 'number',
        question: 'Wie viele Tage dauerte der NIUS-Aufenthalt?',
        section: 'kinder',
        order: 72.29,
        validation: { required: true, min: 1, max: 365 },
        logic: {
            next: ['KIND-ERN'],
            showIf: [{ operator: 'contextLessThan', key: 'age', value: 6 }]
        }
    },
    {
        id: 'KIND-ERN',
        type: 'select',
        question: 'Wie wurde das Kind im 1. Lebensjahr ernährt?',
        section: 'kinder',
        order: 72.3,
        options: [
            { value: 'stillen', label: 'Voll gestillt' },
            { value: 'misch', label: 'Mischform (Brust + Flasche)' },
            { value: 'flasche', label: 'Flaschennahrung' },
            { value: 'beikost_frueh', label: 'Frühe Beikost (vor 4. Monat)' }
        ],
        validation: { required: true },
        logic: {
            next: ['1600'],
            showIf: [{ operator: 'contextLessThan', key: 'age', value: 6 }]
        }
    },
    {
        id: '1600',
        type: 'radio',
        question: 'Kann das Kind frei laufen?',
        section: 'kinder-entwicklung',
        order: 73,
        options: [
            { value: 'ja', label: 'Ja' },
            { value: 'nein', label: 'Nein' }
        ],
        validation: { required: true },
        logic: {
            next: ['1601'],
            showIf: [{ operator: 'contextLessThan', key: 'age', value: 6 }]
        }
    },
    {
        id: '1601',
        type: 'select',
        question: 'Kann das Kind Wörter/Sätze sprechen?',
        section: 'kinder-entwicklung',
        order: 74,
        options: [
            { value: 'keine_worte', label: 'Noch keine Worte' },
            { value: 'einzelne_worte', label: 'Einzelne Worte' },
            { value: 'einfache_saetze', label: 'Einfache Sätze' },
            { value: 'altersgemaess', label: 'Altersgemäß' }
        ],
        validation: { required: true },
        logic: {
            next: ['1602'],
            showIf: [{ operator: 'contextLessThan', key: 'age', value: 6 }]
        }
    },
    {
        id: '1602',
        type: 'radio',
        question: 'Ist das Kind in einer Kindertagesstätte/Krippe?',
        section: 'kinder-entwicklung',
        order: 75,
        options: [
            { value: 'ja', label: 'Ja' },
            { value: 'nein', label: 'Nein' }
        ],
        validation: { required: true },
        logic: {
            next: ['1603'],
            showIf: [{ operator: 'contextLessThan', key: 'age', value: 6 }]
        }
    },
    {
        id: '1603',
        type: 'radio',
        question: 'Gibt es Auffälligkeiten bei den U-Untersuchungen?',
        section: 'kinder-entwicklung',
        order: 76,
        options: [
            { value: 'ja', label: 'Ja', followUpQuestions: ['1604'] },
            { value: 'nein', label: 'Nein' }
        ],
        validation: { required: true },
        logic: {
            next: ['KIND-WACHS'],
            showIf: [{ operator: 'contextLessThan', key: 'age', value: 6 }]
        }
    },
    {
        id: '1604',
        type: 'textarea',
        question: 'Welche Auffälligkeiten?',
        section: 'kinder-entwicklung',
        order: 77,
        validation: { required: true },
        logic: {
            next: ['KIND-WACHS'],
            showIf: [{ operator: 'contextLessThan', key: 'age', value: 6 }]
        }
    },

    // ==================== §16C-16E: KINDER ERWEITERUNG ====================
    {
        id: 'KIND-WACHS',
        type: 'radio',
        question: 'Wie ist das Wachstum/die körperliche Entwicklung?',
        section: 'kinder-entwicklung',
        order: 77.1,
        options: [
            { value: 'unauffaellig', label: 'Unauffällig / altersgerecht' },
            { value: 'auffaellig', label: 'Auffällig (zu klein/groß/schwer/leicht)' },
            { value: 'unklar', label: 'Unklar / weiß nicht' }
        ],
        validation: { required: true },
        logic: {
            next: ['KIND-ERKR'],
            showIf: [{ operator: 'contextLessThan', key: 'age', value: 6 }]
        }
    },
    {
        id: 'KIND-ERKR',
        type: 'multiselect',
        question: 'Hatte das Kind häufiger folgende Erkrankungen?',
        section: 'kinder-entwicklung',
        order: 77.2,
        options: [
            { value: 'infekte', label: 'Häufige Infekte' },
            { value: 'otitis', label: 'Mittelohrentzündungen' },
            { value: 'bronchitis', label: 'Bronchitiden / obstruktive Atemwege' },
            { value: 'pseudo_krupp', label: 'Pseudo-Krupp' },
            { value: 'fieberkrampf', label: 'Fieberkrämpfe' },
            { value: 'harnwegsinfekt', label: 'Harnwegsinfekte' },
            { value: 'allergie', label: 'Allergien / Neurodermitis' },
            { value: 'asthma', label: 'Asthma' },
            { value: 'keine', label: 'Keine besonderen Erkrankungen' }
        ],
        validation: { required: true },
        logic: {
            next: ['KIND-IMPF'],
            showIf: [{ operator: 'contextLessThan', key: 'age', value: 6 }]
        }
    },
    {
        id: 'KIND-IMPF',
        type: 'multiselect',
        question: 'Impfstatus des Kindes:',
        section: 'kinder-entwicklung',
        order: 77.3,
        options: [
            { value: 'stiko_komplett', label: 'STIKO-Empfehlung komplett' },
            { value: 'teilweise', label: 'Teilweise geimpft' },
            { value: 'masern', label: 'Masern-Impfung vorhanden' },
            { value: 'impfbuch', label: 'Impfbuch vorhanden' },
            { value: 'kein_impfbuch', label: 'Kein Impfbuch vorhanden' },
            { value: 'keine_impfung', label: 'Keine Impfungen' }
        ],
        validation: { required: true },
        logic: {
            next: ['1700'],
            showIf: [{ operator: 'contextLessThan', key: 'age', value: 6 }]
        }
    },

    // ==================== PART 6: VORSORGE ====================
    {
        id: '1700',
        type: 'select',
        question: 'Wann war Ihr letzter Gesundheitscheck (Check-up)?',
        section: 'vorsorge',
        order: 80,
        options: [
            { value: 'letztes_jahr', label: 'Im letzten Jahr' },
            { value: '1_3_jahre', label: 'Vor 1-3 Jahren' },
            { value: 'laenger', label: 'Länger als 3 Jahre her' },
            { value: 'nie', label: 'Noch nie' },
            { value: 'weiss_nicht', label: 'Weiß nicht' }
        ],
        validation: { required: true },
        logic: {
            next: ['HAUT-SCREEN'],
            showIf: [{ operator: 'contextGreaterThan', key: 'age', value: 34 }]
        }
    },
    {
        id: 'HAUT-SCREEN',
        type: 'select',
        question: 'Wann war Ihr letztes Hautkrebs-Screening?',
        section: 'vorsorge',
        order: 80.1,
        options: [
            { value: 'letztes_jahr', label: 'Im letzten Jahr' },
            { value: '1_2_jahre', label: 'Vor 1-2 Jahren' },
            { value: 'laenger', label: 'Länger als 2 Jahre her' },
            { value: 'nie', label: 'Noch nie' },
            { value: 'weiss_nicht', label: 'Weiß nicht' }
        ],
        validation: { required: true },
        logic: {
            next: ['HEP-SCREEN'],
            showIf: [{ operator: 'contextGreaterThan', key: 'age', value: 34 }]
        }
    },
    {
        id: 'HEP-SCREEN',
        type: 'radio',
        question: 'Wurde bei Ihnen jemals ein Hepatitis B/C Screening durchgeführt?',
        section: 'vorsorge',
        order: 80.2,
        options: [
            { value: 'ja', label: 'Ja' },
            { value: 'nein', label: 'Nein' },
            { value: 'weiss_nicht', label: 'Weiß nicht' }
        ],
        validation: { required: true },
        logic: {
            next: ['1800'],
            showIf: [{ operator: 'contextGreaterThan', key: 'age', value: 34 }]
        }
    },
    {
        id: '1800',
        type: 'radio',
        question: 'Nehmen Sie die Antibabypille oder hormonelle Verhütung?',
        section: 'vorsorge-frauen',
        order: 82,
        options: [
            { value: 'ja', label: 'Ja' },
            { value: 'nein', label: 'Nein' }
        ],
        validation: { required: true },
        logic: {
            next: ['1801'],
            showIf: [
                { operator: 'contextEquals', key: 'gender', value: 'W' },
                { operator: 'contextGreaterThan', key: 'age', value: 13 },
                { operator: 'contextLessThan', key: 'age', value: 51 }
            ]
        }
    },
    {
        id: '1801',
        type: 'select',
        question: 'Wann war Ihre letzte Krebsvorsorge (Frauenarzt)?',
        section: 'vorsorge-frauen',
        order: 83,
        options: [
            { value: 'letztes_jahr', label: 'Im letzten Jahr' },
            { value: '1_3_jahre', label: 'Vor 1-3 Jahren' },
            { value: 'laenger', label: 'Länger als 3 Jahre her' },
            { value: 'nie', label: 'Noch nie' }
        ],
        validation: { required: true },
        logic: {
            next: ['MAMMO-100'],
            showIf: [
                { operator: 'contextEquals', key: 'gender', value: 'W' },
                { operator: 'contextGreaterThan', key: 'age', value: 13 },
                { operator: 'contextLessThan', key: 'age', value: 51 }
            ]
        }
    },

    // ==================== §18: MAMMOGRAPHIE (Frauen > 50) ====================
    {
        id: 'MAMMO-100',
        type: 'select',
        question: 'Wann war Ihre letzte Mammographie?',
        section: 'vorsorge-frauen',
        order: 83.5,
        options: [
            { value: 'letztes_jahr', label: 'Im letzten Jahr' },
            { value: '1_3_jahre', label: 'Vor 1-3 Jahren' },
            { value: 'laenger', label: 'Länger als 3 Jahre her' },
            { value: 'nie', label: 'Noch nie' }
        ],
        validation: { required: true },
        logic: {
            next: ['DARM-W-100'],
            showIf: [
                { operator: 'contextEquals', key: 'gender', value: 'W' },
                { operator: 'contextGreaterThan', key: 'age', value: 49 }
            ]
        }
    },

    // ==================== §18: DARMKREBS-VORSORGE (Frauen > 55) ====================
    {
        id: 'DARM-W-100',
        type: 'select',
        question: 'Wann war Ihre letzte Darmkrebs-Vorsorge?',
        section: 'vorsorge-frauen',
        order: 83.6,
        options: [
            { value: 'letztes_jahr', label: 'Im letzten Jahr' },
            { value: '1_3_jahre', label: 'Vor 1-3 Jahren' },
            { value: 'laenger', label: 'Länger als 3 Jahre her' },
            { value: 'nie', label: 'Noch nie' },
            { value: 'nicht_empfohlen', label: 'Nicht empfohlen' }
        ],
        validation: { required: true },
        logic: {
            next: ['1900'],
            showIf: [
                { operator: 'contextEquals', key: 'gender', value: 'W' },
                { operator: 'contextGreaterThan', key: 'age', value: 54 }
            ]
        }
    },
    {
        id: '1900',
        type: 'select',
        question: 'Wann war Ihre letzte Prostata-Vorsorge?',
        section: 'vorsorge-maenner',
        order: 85,
        options: [
            { value: 'letztes_jahr', label: 'Im letzten Jahr' },
            { value: '1_3_jahre', label: 'Vor 1-3 Jahren' },
            { value: 'laenger', label: 'Länger als 3 Jahre her' },
            { value: 'nie', label: 'Noch nie' }
        ],
        validation: { required: true },
        logic: {
            next: ['1901'],
            showIf: [
                { operator: 'contextEquals', key: 'gender', value: 'M' },
                { operator: 'contextGreaterThan', key: 'age', value: 44 }
            ]
        }
    },
    {
        id: '1901',
        type: 'select',
        question: 'Wann war Ihre letzte Darmkrebs-Vorsorge?',
        section: 'vorsorge-maenner',
        order: 86,
        options: [
            { value: 'letztes_jahr', label: 'Im letzten Jahr' },
            { value: '1_3_jahre', label: 'Vor 1-3 Jahren' },
            { value: 'laenger', label: 'Länger als 3 Jahre her' },
            { value: 'nie', label: 'Noch nie' },
            { value: 'nicht_empfohlen', label: 'Nicht empfohlen' }
        ],
        validation: { required: true },
        logic: {
            next: ['AORT-SCREEN'],
            showIf: [
                { operator: 'contextEquals', key: 'gender', value: 'M' },
                { operator: 'contextGreaterThan', key: 'age', value: 54 }
            ]
        }
    },
    {
        id: 'AORT-SCREEN',
        type: 'radio',
        question: 'Wurde bei Ihnen ein Aortenscreening (Bauchaorta-Ultraschall) durchgeführt?',
        section: 'vorsorge-maenner',
        order: 86.1,
        options: [
            { value: 'ja', label: 'Ja' },
            { value: 'nein', label: 'Nein' },
            { value: 'weiss_nicht', label: 'Weiß nicht' }
        ],
        validation: { required: true },
        logic: {
            next: ['8800'],
            showIf: [
                { operator: 'contextEquals', key: 'gender', value: 'M' },
                { operator: 'contextGreaterThan', key: 'age', value: 64 }
            ]
        }
    },

    // ==================== PART 7: BEWERTUNG ====================
    {
        id: '9500',
        type: 'radio',
        question: 'Wie bewerten Sie diesen Fragebogen?',
        section: 'bewertung',
        order: 185,
        options: [
            { value: '5', label: '⭐⭐⭐⭐⭐ Sehr gut' },
            { value: '4', label: '⭐⭐⭐⭐ Gut' },
            { value: '3', label: '⭐⭐⭐ OK' },
            { value: '2', label: '⭐⭐ Nicht so gut' },
            { value: '1', label: '⭐ Schlecht' }
        ],
        validation: { required: false },
        logic: { next: ['9501'] }
    },
    {
        id: '9501',
        type: 'textarea',
        question: 'Möchten Sie uns noch etwas mitteilen?',
        section: 'bewertung',
        order: 186,
        placeholder: 'Anregungen, Verbesserungsvorschläge...',
        logic: { next: ['9000'] }
    },

    // ==================== PHASE 7a: TERMINWUNSCH (§3A/3AA) ====================
    {
        id: 'TERM-100',
        type: 'multiselect',
        question: 'An welchem Tag bevorzugen Sie einen Termin?',
        description: 'Mehrfachauswahl möglich',
        section: 'terminwunsch',
        order: 17.01,
        options: [
            { value: 'montag', label: 'Montag' },
            { value: 'dienstag', label: 'Dienstag' },
            { value: 'mittwoch', label: 'Mittwoch' },
            { value: 'donnerstag', label: 'Donnerstag' },
            { value: 'freitag', label: 'Freitag' },
            { value: 'egal', label: 'Egal / flexibel' }
        ],
        validation: { required: true },
        logic: { next: ['TERM-101'] }
    },
    {
        id: 'TERM-101',
        type: 'multiselect',
        question: 'Zu welcher Tageszeit?',
        description: 'Mehrfachauswahl möglich – oder Freitext eingeben',
        section: 'terminwunsch',
        order: 17.02,
        options: [
            { value: 'vormittags', label: 'Vormittags' },
            { value: 'nachmittags', label: 'Nachmittags' },
            { value: 'egal', label: 'Egal / flexibel' },
            { value: 'freitext', label: 'Andere (Freitext)', followUpQuestions: ['TERM-101-FT'] }
        ],
        validation: { required: true },
        logic: {
            conditional: [
                { context: 'selectedReason', equals: 'Terminabsage', then: '9100' },
                { when: '0000', equals: 'ja', then: 'ALT-100' },
                { when: '0000', equals: 'nein', then: 'VISIT-100' }
            ]
        }
    },
    {
        id: 'TERM-101-FT',
        type: 'text',
        question: 'Welche Uhrzeit bevorzugen Sie?',
        description: 'z.B. "ab 14 Uhr" oder "zwischen 10 und 12 Uhr"',
        section: 'terminwunsch',
        order: 17.03,
        placeholder: 'z.B. ab 14 Uhr',
        validation: { required: false },
        logic: {
            conditional: [
                { context: 'selectedReason', equals: 'Terminabsage', then: '9100' },
                { when: '0000', equals: 'ja', then: 'ALT-100' },
                { when: '0000', equals: 'nein', then: 'VISIT-100' }
            ]
        }
    },

    // ==================== PHASE 7a: TERMINABSAGE ERWEITERUNG (§3E) ====================
    {
        id: 'ABS-102',
        type: 'radio',
        question: 'Möchten Sie einen neuen Termin vereinbaren?',
        section: 'absage',
        order: 142,
        options: [
            { value: 'ja', label: 'Ja, neuen Termin' },
            { value: 'nein', label: 'Nein, danke' }
        ],
        logic: {
            conditional: [
                { equals: 'ja', then: 'TERM-100' },
                { equals: 'nein', then: '9100' }
            ]
        }
    },

    // ==================== PHASE 7a: MEDIKAMENTENÄNDERUNG (§4B) ====================
    {
        id: 'ALT-100',
        type: 'radio',
        question: 'Haben sich Ihre Medikamente seit dem letzten Besuch geändert?',
        section: 'medikamente-check',
        order: 17.05,
        options: [
            { value: 'ja', label: 'Ja' },
            { value: 'nein', label: 'Nein' }
        ],
        validation: { required: true },
        logic: { next: ['VISIT-100'] }
    },

    // ==================== PHASE 7a: BESUCHSGRUND (§5) ====================
    {
        id: 'VISIT-100',
        type: 'select',
        question: 'Aus welchem Grund kommen Sie heute?',
        section: 'besuchsgrund',
        order: 17.1,
        options: [
            { value: 'beschwerdeabklaerung', label: 'Beschwerdeabklärung' },
            { value: 'kontrolle', label: 'Kontrolle (z.B. Blutzucker, Labor)' },
            { value: 'vorsorge', label: 'Vorsorge / Screening' },
            { value: 'therapieanpassung', label: 'Therapieanpassung' },
            { value: 'befunderoerterung', label: 'Befunderörterung' },
            { value: 'tumorverdacht', label: 'Tumorverdacht / Abklärung' },
            { value: 'begutachtung', label: 'Begutachtung / Gutachten' },
            { value: 'unfallfolgen', label: 'Unfallfolgen' },
            { value: 'zweitmeinung', label: 'Zweitmeinung' }
        ],
        validation: { required: true },
        logic: {
            conditional: [
                { equals: 'beschwerdeabklaerung', then: '1000' },
                { equals: 'kontrolle', then: '5B-100' },
                { equals: 'vorsorge', then: '5C-100' },
                { equals: 'therapieanpassung', then: '5D-100' },
                { equals: 'befunderoerterung', then: '5E-100' },
                { equals: 'tumorverdacht', then: '5F-100' },
                { equals: 'begutachtung', then: '5G-100' },
                { equals: 'unfallfolgen', then: '2080' },
                { equals: 'zweitmeinung', then: '5I-100' }
            ]
        }
    },

    // ---- §5B: Kontrolle ----
    {
        id: '5B-100',
        type: 'multiselect',
        question: 'Was möchten Sie kontrollieren lassen?',
        section: 'besuchsgrund',
        order: 17.2,
        options: [
            { value: 'blutzucker', label: 'Blutzucker / Diabeteskontrolle' },
            { value: 'labor', label: 'Laborwerte allgemein' },
            { value: 'freitext', label: 'Andere Kontrolle', followUpQuestions: ['5B-100-FT'] }
        ],
        validation: { required: true },
        logic: { next: ['1007'] }
    },
    {
        id: '5B-100-FT',
        type: 'text',
        question: 'Welche andere Kontrolle?',
        section: 'besuchsgrund',
        order: 17.21,
        logic: { next: ['1007'] }
    },

    // ---- §5C: Vorsorge ----
    {
        id: '5C-100',
        type: 'multiselect',
        question: 'Welche Vorsorgeuntersuchung möchten Sie?',
        section: 'besuchsgrund',
        order: 17.3,
        options: [
            { value: 'aorta', label: 'Aortenaneurysma-Screening (Männer ab 65)' },
            { value: 'lebensstil', label: 'Lebensstil-Check (Bewegung, Ernährung, Gewicht, Stress)' },
            { value: 'impfstatus', label: 'Impfstatus-Kontrolle' },
            { value: 'hautkrebs', label: 'Hautkrebs-Screening' },
            { value: 'prostata', label: 'Prostata-Vorsorge (PSA, Tastuntersuchung)' },
            { value: 'darmkrebs', label: 'Darmkrebs-Screening' },
            { value: 'gyn', label: 'Gynäkologische Vorsorge' },
            { value: 'osteoporose', label: 'Osteoporose- / Knochendichte-Messung' },
            { value: 'freitext', label: 'Andere Vorsorge', followUpQuestions: ['5C-100-FT'] }
        ],
        validation: { required: true },
        logic: { next: ['VISIT-EXIT'] }
    },
    {
        id: '5C-100-FT',
        type: 'text',
        question: 'Welche andere Vorsorgeuntersuchung?',
        section: 'besuchsgrund',
        order: 17.31,
        logic: { next: ['VISIT-EXIT'] }
    },

    // ---- §5D: Therapieanpassung ----
    {
        id: '5D-100',
        type: 'multiselect',
        question: 'Was möchten Sie anpassen lassen?',
        section: 'besuchsgrund',
        order: 17.4,
        options: [
            { value: 'diabetes', label: 'Diabeteseinstellung' },
            { value: 'blutdruck', label: 'Blutdruckeinstellung' },
            { value: 'medikamente', label: 'Medikamentenkontrolle' },
            { value: 'freitext', label: 'Andere Anpassung', followUpQuestions: ['5D-100-FT'] }
        ],
        validation: { required: true },
        logic: { next: ['VISIT-EXIT'] }
    },
    {
        id: '5D-100-FT',
        type: 'text',
        question: 'Was möchten Sie anpassen lassen?',
        section: 'besuchsgrund',
        order: 17.41,
        logic: { next: ['VISIT-EXIT'] }
    },

    // ---- §5E: Befunderörterung ----
    {
        id: '5E-100',
        type: 'multiselect',
        question: 'Welche Befunde möchten Sie besprechen?',
        section: 'besuchsgrund',
        order: 17.5,
        options: [
            { value: 'bildgebung', label: 'Bildgebung (Röntgen, CT, MRT, Ultraschall)' },
            { value: 'labor', label: 'Laborauffälligkeiten' },
            { value: 'freitext', label: 'Andere Befunde', followUpQuestions: ['5E-100-FT'] }
        ],
        validation: { required: true },
        logic: { next: ['VISIT-EXIT'] }
    },
    {
        id: '5E-100-FT',
        type: 'textarea',
        question: 'Welche Befunde möchten Sie besprechen? (Details)',
        section: 'besuchsgrund',
        order: 17.51,
        logic: { next: ['VISIT-EXIT'] }
    },

    // ---- §5F: Tumorverdacht ----
    {
        id: '5F-100',
        type: 'multiselect',
        question: 'Welche Auffälligkeiten haben Sie bemerkt?',
        section: 'besuchsgrund',
        order: 17.6,
        options: [
            { value: 'knoten', label: 'Knoten / Schwellung' },
            { value: 'blut_stuhl', label: 'Blut im Stuhl' },
            { value: 'gewichtsverlust', label: 'Unerklärlicher Gewichtsverlust' },
            { value: 'freitext', label: 'Andere Auffälligkeiten', followUpQuestions: ['5F-100-FT'] }
        ],
        validation: { required: true },
        logic: { next: ['1007'] }
    },
    {
        id: '5F-100-FT',
        type: 'textarea',
        question: 'Beschreiben Sie die Auffälligkeiten',
        section: 'besuchsgrund',
        order: 17.61,
        logic: { next: ['1007'] }
    },

    // ---- §5G: Begutachtung ----
    {
        id: '5G-100',
        type: 'select',
        question: 'Welche Art von Gutachten benötigen Sie?',
        section: 'besuchsgrund',
        order: 17.7,
        options: [
            { value: 'versicherung', label: 'Freies Gutachten / Versicherungsgutachten' },
            { value: 'gdb', label: 'GdB-Gutachten (Grad der Behinderung)' },
            { value: 'reha', label: 'Reha-Antrag' },
            { value: 'freitext', label: 'Anderes Gutachten', followUpQuestions: ['5G-100-FT'] }
        ],
        validation: { required: true },
        logic: { next: ['VISIT-EXIT'] }
    },
    {
        id: '5G-100-FT',
        type: 'text',
        question: 'Welches andere Gutachten?',
        section: 'besuchsgrund',
        order: 17.71,
        logic: { next: ['VISIT-EXIT'] }
    },

    // ---- §5I: Zweitmeinung ----
    {
        id: '5I-100',
        type: 'textarea',
        question: 'Zu welchem Thema möchten Sie eine Zweitmeinung einholen?',
        description: 'Bitte beschreiben Sie den medizinischen Sachverhalt, die bisherige Diagnose oder Behandlungsempfehlung.',
        section: 'besuchsgrund',
        order: 17.8,
        validation: { required: true },
        logic: { next: ['VISIT-EXIT'] }
    },

    // ---- VISIT-EXIT: Routing-Hub nach Besuchsgrund ----
    {
        id: 'VISIT-EXIT',
        type: 'radio',
        question: 'Ihre Angaben zum Besuchsgrund wurden erfasst.',
        section: 'besuchsgrund',
        order: 17.99,
        options: [{ value: 'weiter', label: 'Weiter' }],
        logic: {
            conditional: [
                { when: '0000', equals: 'ja', then: [
                    { when: 'ALT-100', equals: 'ja', then: 'MED-100' },
                    { when: 'ALT-100', equals: 'nein', then: '9500' }
                ]},
                { when: '0000', equals: 'nein', then: '4000' }
            ]
        }
    },

    // ==================== PHASE 7a: STRUKTURIERTE MEDIKAMENTE (§12) ====================
    {
        id: 'MED-100',
        type: 'multiselect',
        question: 'Welche Medikamente nehmen Sie aktuell ein?',
        description: 'Wählen Sie alle zutreffenden Kategorien aus.',
        section: 'medikamente-strukturiert',
        order: 60,
        options: [
            { value: 'antikoagulanzien', label: 'Antikoagulanzien / Blutverdünner', followUpQuestions: ['MED-100A'] },
            { value: 'antipsychotika', label: 'Antipsychotika' },
            { value: 'blutdrucksenker', label: 'Blutdrucksenker' },
            { value: 'lipidsenker', label: 'Lipidsenker (Statine, Ezetimib)' },
            { value: 'schilddruese', label: 'Schilddrüsenpräparate' },
            { value: 'kortikosteroide', label: 'Kortikosteroide (systemisch / inhalativ)' },
            { value: 'osteoporose', label: 'Osteoporosemittel' },
            { value: 'ppi', label: 'Protonenpumpenhemmer (Pantoprazol, Omeprazol)' },
            { value: 'sedativa', label: 'Sedativa / Hypnotika' },
            { value: 'schmerzmittel', label: 'Schmerzmittel (NSAR, Paracetamol, Metamizol) / Opiate' },
            { value: 'antiepileptika', label: 'Antiepileptika / Prostatamedikamente' },
            { value: 'hormone', label: 'Hormonpräparate (Östrogene, Gestagene, Testosteron)' },
            { value: 'immunsuppressiva', label: 'Immunsuppressiva (Methotrexat, Biologika)' },
            { value: 'parkinson', label: 'Parkinsonmedikamente' },
            { value: 'antidepressiva', label: 'Antidepressiva (SSRI, SNRI, trizyklisch)' },
            { value: 'keine', label: 'Keine Medikamente' },
            { value: 'freitext', label: 'Andere Medikamente', followUpQuestions: ['MED-100-FT'] }
        ],
        validation: { required: true },
        logic: { next: ['9500'] }
    },
    {
        id: 'MED-100A',
        type: 'multiselect',
        question: 'Welchen Blutverdünner nehmen Sie?',
        section: 'medikamente-strukturiert',
        order: 60.1,
        options: [
            { value: 'marcumar', label: 'Marcumar' },
            { value: 'eliquis', label: 'Eliquis' },
            { value: 'lixiana', label: 'Lixiana' },
            { value: 'pradaxa', label: 'Pradaxa' },
            { value: 'xarelto', label: 'Xarelto' },
            { value: 'ass', label: 'ASS' },
            { value: 'brilique', label: 'Brilique' },
            { value: 'clopidogrel', label: 'Clopidogrel' },
            { value: 'efient', label: 'Efient' }
        ],
        validation: { required: true },
        logic: { next: ['9500'] }
    },
    {
        id: 'MED-100-FT',
        type: 'textarea',
        question: 'Welche anderen Medikamente nehmen Sie ein?',
        section: 'medikamente-strukturiert',
        order: 60.2,
        logic: { next: ['9500'] }
    },

    // ==================== §10FA: MOBILITÄT DETAIL ====================
    {
        id: 'MOB-100',
        type: 'select',
        question: 'Wie ist Ihre Mobilität im Alltag?',
        section: 'beeintraechtigung',
        order: 45.1,
        options: [
            { value: 'uneingeschraenkt', label: 'Uneingeschränkt' },
            { value: 'gehstock', label: 'Gehstock nötig' },
            { value: 'rollator', label: 'Rollator nötig' },
            { value: 'rollstuhl', label: 'Rollstuhl nötig' },
            { value: 'bettlaegerig', label: 'Bettlägerig' },
            { value: 'stuerze', label: 'Häufige Stürze' }
        ],
        validation: { required: true },
        logic: { next: ['6002'] }
    },

    // ==================== §10FB: KOGNITION DETAIL ====================
    {
        id: 'KOG-100',
        type: 'multiselect',
        question: 'Haben Sie Schwierigkeiten in folgenden Bereichen?',
        section: 'beeintraechtigung',
        order: 45.2,
        options: [
            { value: 'gedaechtnis', label: 'Gedächtnis' },
            { value: 'orientierung', label: 'Orientierung (Ort, Zeit, Person)' },
            { value: 'konzentration', label: 'Konzentration' },
            { value: 'demenz', label: 'Demenz-Diagnose bekannt' },
            { value: 'keine', label: 'Keine Einschränkungen' }
        ],
        validation: { required: true },
        logic: { next: ['6002'] }
    },

    // ==================== §10G: GdB / MERKZEICHEN ====================
    {
        id: 'GDB-100',
        type: 'multiselect',
        question: 'Haben Sie einen Grad der Behinderung (GdB)?',
        section: 'beeintraechtigung',
        order: 45.3,
        options: [
            { value: 'nein', label: 'Kein GdB' },
            { value: 'gdb_20_40', label: 'GdB 20-40' },
            { value: 'gdb_50_plus', label: 'GdB ≥ 50 (Schwerbehindert)' },
            { value: 'mz_g', label: 'Merkzeichen G (gehbehindert)' },
            { value: 'mz_ag', label: 'Merkzeichen aG (außergewöhnlich gehbehindert)' },
            { value: 'mz_b', label: 'Merkzeichen B (Begleitung)' },
            { value: 'mz_h', label: 'Merkzeichen H (hilflos)' },
            { value: 'mz_bl', label: 'Merkzeichen Bl (blind)' },
            { value: 'mz_gl', label: 'Merkzeichen Gl (gehörlos)' },
            { value: 'mz_rf', label: 'Merkzeichen RF (Rundfunkbefreiung)' },
            { value: 'mz_tbl', label: 'Merkzeichen TBl (taubblind)' }
        ],
        validation: { required: true },
        logic: { next: ['PFLEGE-100'] }
    },

    // ==================== §10H: PFLEGEGRAD ====================
    {
        id: 'PFLEGE-100',
        type: 'select',
        question: 'Haben Sie einen Pflegegrad?',
        section: 'beeintraechtigung',
        order: 45.4,
        options: [
            { value: 'nein', label: 'Kein Pflegegrad' },
            { value: 'beantragt', label: 'Beantragt' },
            { value: 'pg1', label: 'Pflegegrad 1' },
            { value: 'pg2', label: 'Pflegegrad 2' },
            { value: 'pg3', label: 'Pflegegrad 3' },
            { value: 'pg4', label: 'Pflegegrad 4' },
            { value: 'pg5', label: 'Pflegegrad 5' }
        ],
        validation: { required: true },
        logic: { next: ['6002'] }
    },

    // ==================== §11B: BEWEGUNG ====================
    {
        id: 'BEWEG-100',
        type: 'select',
        question: 'Wie viel bewegen Sie sich pro Woche (z.B. Spazieren, Sport)?',
        section: 'gewohnheiten',
        order: 35.5,
        options: [
            { value: 'keine', label: 'Kaum / keine Bewegung' },
            { value: 'wenig', label: '< 150 Minuten pro Woche' },
            { value: 'moderat', label: '150-300 Minuten pro Woche' },
            { value: 'viel', label: '> 300 Minuten pro Woche' }
        ],
        validation: { required: true },
        logic: { next: ['4120'] }
    }
];
