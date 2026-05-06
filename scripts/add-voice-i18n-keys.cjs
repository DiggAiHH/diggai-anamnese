#!/usr/bin/env node
/**
 * add-voice-i18n-keys.cjs — Voice-Anamnese-i18n-Keys für alle 10 Sprachen
 *
 * Anker: docs/CONNECTOR_DEEP_RESEARCH_2026-05-06.md §2.3 (ElevenLabs)
 * Ergänzt die voice.*-Keys in public/locales/{de,en,tr,ar,uk,es,fa,it,fr,pl}/translation.json
 *
 * Verwendung:
 *   node scripts/add-voice-i18n-keys.cjs                # dry-run, zeigt Diff
 *   node scripts/add-voice-i18n-keys.cjs --apply        # tatsächlich anwenden
 *
 * Keys (alle administrativ formuliert, keine klinische Sprache):
 *   voice.startButton        — Button-Label zum Voice-Mode-Start
 *   voice.stopButton         — Button-Label zum Beenden
 *   voice.askingPermission   — State: Mikrofon-Permission anfragen
 *   voice.connecting         — State: WebRTC-Verbindung aufbauen
 *   voice.stopping           — State: Sitzung beenden
 *   voice.activeIndicator    — Live-Indikator-Text während Voice aktiv ist
 *   voice.errorTitle         — Error-Box-Title
 *   voice.fallback           — Hinweis auf Tastatur-Fallback
 *   voice.privacyHint        — DSGVO-Audio-no-store-Hinweis
 *   voice.languageUnsupported — Sprache nicht von Voice unterstützt
 *   voice.notAvailable       — Backend gibt 503 (Voice nicht aktiv)
 *   voice.toggleLabel        — ARIA-Label
 *   voice.retryButton        — Retry-Button-Label nach Error
 */

'use strict';

const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.resolve(__dirname, '..', 'public', 'locales');

const VOICE_TRANSLATIONS = {
    de: {
        'voice.startButton': 'Anamnese per Sprache starten',
        'voice.stopButton': 'Voice-Modus beenden',
        'voice.askingPermission': 'Mikrofon-Zugriff anfragen…',
        'voice.connecting': 'Verbindung wird hergestellt…',
        'voice.stopping': 'Beende Sitzung…',
        'voice.activeIndicator': 'Voice-Modus aktiv. Bitte sprechen Sie deutlich.',
        'voice.errorTitle': 'Voice-Modus nicht verfügbar',
        'voice.fallback': 'Sie können die Anamnese weiterhin per Tastatur und Touch ausfüllen.',
        'voice.privacyHint': 'Audio wird nicht gespeichert. Voice-Modus ist administrativ — er bestätigt Ihre Eingaben und gibt keine medizinische Beurteilung.',
        'voice.languageUnsupported': 'Voice-Modus für diese Sprache noch nicht verfügbar.',
        'voice.notAvailable': 'Voice-Modus ist derzeit nicht verfügbar. Bitte verwenden Sie die Texteingabe.',
        'voice.toggleLabel': 'Voice-Modus umschalten',
        'voice.retryButton': 'Erneut versuchen',
    },
    en: {
        'voice.startButton': 'Start anamnesis by voice',
        'voice.stopButton': 'End voice mode',
        'voice.askingPermission': 'Requesting microphone access…',
        'voice.connecting': 'Establishing connection…',
        'voice.stopping': 'Ending session…',
        'voice.activeIndicator': 'Voice mode active. Please speak clearly.',
        'voice.errorTitle': 'Voice mode unavailable',
        'voice.fallback': 'You can continue filling out the form using keyboard and touch.',
        'voice.privacyHint': 'Audio is not stored. Voice mode is administrative — it confirms your inputs and provides no medical assessment.',
        'voice.languageUnsupported': 'Voice mode for this language is not yet available.',
        'voice.notAvailable': 'Voice mode is currently unavailable. Please use text input.',
        'voice.toggleLabel': 'Toggle voice mode',
        'voice.retryButton': 'Try again',
    },
    tr: {
        'voice.startButton': 'Sesli anamnezi başlat',
        'voice.stopButton': 'Sesli modu sonlandır',
        'voice.askingPermission': 'Mikrofon erişimi isteniyor…',
        'voice.connecting': 'Bağlantı kuruluyor…',
        'voice.stopping': 'Oturum sonlandırılıyor…',
        'voice.activeIndicator': 'Sesli mod aktif. Lütfen net konuşunuz.',
        'voice.errorTitle': 'Sesli mod kullanılamıyor',
        'voice.fallback': 'Klavye ve dokunma ile formu doldurmaya devam edebilirsiniz.',
        'voice.privacyHint': 'Ses kaydı saklanmaz. Sesli mod yönetimseldir — girdileri onaylar, tıbbi değerlendirme sunmaz.',
        'voice.languageUnsupported': 'Bu dil için sesli mod henüz mevcut değil.',
        'voice.notAvailable': 'Sesli mod şu anda kullanılamıyor. Lütfen metin girişini kullanın.',
        'voice.toggleLabel': 'Sesli modu değiştir',
        'voice.retryButton': 'Tekrar dene',
    },
    ar: {
        'voice.startButton': 'بدء التسجيل الصوتي',
        'voice.stopButton': 'إنهاء الوضع الصوتي',
        'voice.askingPermission': 'طلب الوصول إلى الميكروفون…',
        'voice.connecting': 'جاري إنشاء الاتصال…',
        'voice.stopping': 'إنهاء الجلسة…',
        'voice.activeIndicator': 'الوضع الصوتي نشط. يرجى التحدث بوضوح.',
        'voice.errorTitle': 'الوضع الصوتي غير متوفر',
        'voice.fallback': 'يمكنك متابعة ملء النموذج باستخدام لوحة المفاتيح واللمس.',
        'voice.privacyHint': 'لا يتم تخزين الصوت. الوضع الصوتي إداري — يؤكد إدخالاتك ولا يقدم تقييمًا طبيًا.',
        'voice.languageUnsupported': 'الوضع الصوتي غير متاح بعد لهذه اللغة.',
        'voice.notAvailable': 'الوضع الصوتي غير متاح حاليًا. يرجى استخدام الإدخال النصي.',
        'voice.toggleLabel': 'تبديل الوضع الصوتي',
        'voice.retryButton': 'حاول مجددًا',
    },
    uk: {
        'voice.startButton': 'Розпочати анамнез голосом',
        'voice.stopButton': 'Завершити голосовий режим',
        'voice.askingPermission': 'Запит доступу до мікрофона…',
        'voice.connecting': 'Встановлення з\'єднання…',
        'voice.stopping': 'Завершення сеансу…',
        'voice.activeIndicator': 'Голосовий режим активний. Будь ласка, говоріть чітко.',
        'voice.errorTitle': 'Голосовий режим недоступний',
        'voice.fallback': 'Ви можете продовжити заповнення форми за допомогою клавіатури та сенсора.',
        'voice.privacyHint': 'Аудіо не зберігається. Голосовий режим адміністративний — підтверджує введення без медичної оцінки.',
        'voice.languageUnsupported': 'Голосовий режим для цієї мови ще не доступний.',
        'voice.notAvailable': 'Голосовий режим наразі недоступний. Будь ласка, скористайтесь текстовим введенням.',
        'voice.toggleLabel': 'Перемкнути голосовий режим',
        'voice.retryButton': 'Спробувати знову',
    },
    es: {
        'voice.startButton': 'Iniciar anamnesis por voz',
        'voice.stopButton': 'Finalizar modo de voz',
        'voice.askingPermission': 'Solicitando acceso al micrófono…',
        'voice.connecting': 'Estableciendo conexión…',
        'voice.stopping': 'Finalizando sesión…',
        'voice.activeIndicator': 'Modo de voz activo. Por favor, hable con claridad.',
        'voice.errorTitle': 'Modo de voz no disponible',
        'voice.fallback': 'Puede continuar rellenando el formulario con teclado y pantalla táctil.',
        'voice.privacyHint': 'El audio no se almacena. El modo de voz es administrativo — confirma sus entradas sin valoración médica.',
        'voice.languageUnsupported': 'Modo de voz aún no disponible en este idioma.',
        'voice.notAvailable': 'El modo de voz no está disponible. Por favor, use entrada de texto.',
        'voice.toggleLabel': 'Alternar modo de voz',
        'voice.retryButton': 'Intentar de nuevo',
    },
    fa: {
        'voice.startButton': 'شروع شرح حال با صدا',
        'voice.stopButton': 'پایان حالت صوتی',
        'voice.askingPermission': 'درخواست دسترسی میکروفون…',
        'voice.connecting': 'برقراری اتصال…',
        'voice.stopping': 'پایان دادن جلسه…',
        'voice.activeIndicator': 'حالت صوتی فعال است. لطفاً واضح صحبت کنید.',
        'voice.errorTitle': 'حالت صوتی در دسترس نیست',
        'voice.fallback': 'می‌توانید با صفحه‌کلید و لمس فرم را تکمیل کنید.',
        'voice.privacyHint': 'صوت ذخیره نمی‌شود. حالت صوتی اداری است — ورودی شما را تأیید می‌کند و ارزیابی پزشکی ارائه نمی‌دهد.',
        'voice.languageUnsupported': 'حالت صوتی برای این زبان هنوز در دسترس نیست.',
        'voice.notAvailable': 'حالت صوتی در حال حاضر در دسترس نیست. لطفاً از ورودی متنی استفاده کنید.',
        'voice.toggleLabel': 'تغییر حالت صوتی',
        'voice.retryButton': 'تلاش مجدد',
    },
    it: {
        'voice.startButton': 'Avvia anamnesi vocale',
        'voice.stopButton': 'Termina modalità vocale',
        'voice.askingPermission': 'Richiesta accesso al microfono…',
        'voice.connecting': 'Stabilendo connessione…',
        'voice.stopping': 'Termino sessione…',
        'voice.activeIndicator': 'Modalità vocale attiva. Si prega di parlare chiaramente.',
        'voice.errorTitle': 'Modalità vocale non disponibile',
        'voice.fallback': 'Può continuare a compilare il modulo con tastiera e tocco.',
        'voice.privacyHint': 'L\'audio non viene archiviato. La modalità vocale è amministrativa — conferma i suoi input senza valutazione medica.',
        'voice.languageUnsupported': 'Modalità vocale non ancora disponibile per questa lingua.',
        'voice.notAvailable': 'La modalità vocale non è attualmente disponibile. Utilizzare l\'input testuale.',
        'voice.toggleLabel': 'Attiva/disattiva modalità vocale',
        'voice.retryButton': 'Riprova',
    },
    fr: {
        'voice.startButton': 'Démarrer l\'anamnèse vocale',
        'voice.stopButton': 'Terminer le mode vocal',
        'voice.askingPermission': 'Demande d\'accès au microphone…',
        'voice.connecting': 'Connexion en cours…',
        'voice.stopping': 'Fin de la session…',
        'voice.activeIndicator': 'Mode vocal actif. Veuillez parler clairement.',
        'voice.errorTitle': 'Mode vocal indisponible',
        'voice.fallback': 'Vous pouvez continuer à remplir le formulaire avec le clavier et le tactile.',
        'voice.privacyHint': 'L\'audio n\'est pas stocké. Le mode vocal est administratif — il confirme vos saisies sans évaluation médicale.',
        'voice.languageUnsupported': 'Mode vocal pas encore disponible pour cette langue.',
        'voice.notAvailable': 'Le mode vocal n\'est pas disponible. Veuillez utiliser la saisie textuelle.',
        'voice.toggleLabel': 'Basculer le mode vocal',
        'voice.retryButton': 'Réessayer',
    },
    pl: {
        'voice.startButton': 'Rozpocznij wywiad głosowo',
        'voice.stopButton': 'Zakończ tryb głosowy',
        'voice.askingPermission': 'Prośba o dostęp do mikrofonu…',
        'voice.connecting': 'Nawiązywanie połączenia…',
        'voice.stopping': 'Kończenie sesji…',
        'voice.activeIndicator': 'Tryb głosowy aktywny. Proszę mówić wyraźnie.',
        'voice.errorTitle': 'Tryb głosowy niedostępny',
        'voice.fallback': 'Możesz kontynuować wypełnianie formularza za pomocą klawiatury i dotyku.',
        'voice.privacyHint': 'Dźwięk nie jest zapisywany. Tryb głosowy jest administracyjny — potwierdza wprowadzone dane bez oceny medycznej.',
        'voice.languageUnsupported': 'Tryb głosowy nie jest jeszcze dostępny dla tego języka.',
        'voice.notAvailable': 'Tryb głosowy jest obecnie niedostępny. Proszę użyć wprowadzania tekstu.',
        'voice.toggleLabel': 'Przełącz tryb głosowy',
        'voice.retryButton': 'Spróbuj ponownie',
    },
};

const apply = process.argv.includes('--apply');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  DiggAi Voice-i18n-Key-Patcher');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`  Modus:   ${apply ? 'APPLY (schreibt Files)' : 'DRY-RUN (nur Vorschau)'}`);
console.log(`  Sprachen: ${Object.keys(VOICE_TRANSLATIONS).length}`);
console.log(`  Keys/Sprache: ${Object.keys(VOICE_TRANSLATIONS.de).length}`);
console.log('');

let totalChanges = 0;
for (const [locale, voiceKeys] of Object.entries(VOICE_TRANSLATIONS)) {
    const file = path.join(LOCALES_DIR, locale, 'translation.json');
    if (!fs.existsSync(file)) {
        console.warn(`  [SKIP] ${file} nicht gefunden`);
        continue;
    }
    const current = JSON.parse(fs.readFileSync(file, 'utf8'));
    let added = 0;
    let updated = 0;
    for (const [key, value] of Object.entries(voiceKeys)) {
        if (!(key in current)) added++;
        else if (current[key] !== value) updated++;
        current[key] = value;
    }
    console.log(`  ${locale}/translation.json:  +${added} neu, ${updated} aktualisiert`);
    totalChanges += added + updated;

    if (apply) {
        fs.writeFileSync(file, JSON.stringify(current, null, 2) + '\n', 'utf8');
    }
}

console.log('');
console.log(`  Total ${totalChanges} Änderungen ${apply ? 'angewendet' : 'erkannt (dry-run)'}.`);
if (!apply) {
    console.log('  Erneut starten mit --apply für tatsächliche Schreibung.');
}
