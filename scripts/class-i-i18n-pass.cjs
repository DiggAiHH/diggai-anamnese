#!/usr/bin/env node
/**
 * @file scripts/class-i-i18n-pass.cjs
 * @description Class-I-Marketing-Pass für alle 10 Sprachen.
 *
 * Ersetzt die in Lauf 22 (DE) identifizierten Klasse-IIa-Trigger-Keys
 * in EN/TR/AR/UK/ES/FA/IT/FR/PL durch Class-I-konforme Übersetzungen.
 *
 * Adressiert Tracker K21. Verbots-Wörter aus CLAUDE.md Regulatory Guard.
 *
 * Nicht angetastet: Notfall-Disclaimer (Notruf 112), DSGVO-Pflichtwording,
 * Question-Optionen (Patient-Auswahl, nicht App-Aussage). Siehe Memory
 * fb-class-i-surgical.md für die Surgical-vs-stumpf-Lehre.
 *
 * Verwendung:
 *   node scripts/class-i-i18n-pass.cjs              (dry-run, zeigt Changes)
 *   node scripts/class-i-i18n-pass.cjs --apply      (schreibt Files)
 */
'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const LOCALES_DIR = path.join(REPO_ROOT, 'public', 'locales');
const TARGET_LANGS = ['en', 'tr', 'ar', 'uk', 'es', 'fa', 'it', 'fr', 'pl'];
const APPLY = process.argv.includes('--apply');

/**
 * Translations pro Schlüssel pro Sprache. EN ist canonical, andere sind
 * Native-Übersetzungen für Class-I-konformes Marketing.
 */
const TRANSLATIONS = {
    'docs.faq.emergency.a': {
        en: 'DiggAI is a pure registration platform and does not detect emergencies. In case of acute symptoms please call emergency services (112) immediately or address staff directly. When patients enter certain keywords, the platform may visually highlight the registration in the staff dashboard — clinical assessment remains exclusively with the practice team.',
        tr: 'DiggAI yalnızca bir kayıt platformudur ve acil durumları tespit etmez. Akut şikayetlerde lütfen acil yardım hattını (112) derhal arayın veya personele doğrudan başvurun. Hastalar belirli anahtar kelimeler girdiğinde, platform kaydı personel panosunda görsel olarak vurgulayabilir — klinik değerlendirme yalnızca uygulama ekibinde kalır.',
        ar: 'DiggAI هي منصة تسجيل بحتة ولا تكتشف حالات الطوارئ. في حالة الأعراض الحادة، يرجى الاتصال بخدمات الطوارئ (112) على الفور أو التوجه إلى الموظفين مباشرةً. عندما يدخل المرضى كلمات معينة، قد تبرز المنصة التسجيل في لوحة الموظفين بصرياً — يبقى التقييم السريري حصرياً لدى فريق العيادة.',
        uk: 'DiggAI — це виключно реєстраційна платформа і не виявляє надзвичайних ситуацій. У разі гострих симптомів негайно зателефонуйте в служби екстреної допомоги (112) або зверніться безпосередньо до персоналу. Коли пацієнти вводять певні ключові слова, платформа може візуально виділити реєстрацію на панелі персоналу — клінічна оцінка залишається виключно за командою клініки.',
        es: 'DiggAI es una plataforma puramente de registro y no detecta emergencias. En caso de síntomas agudos, llame inmediatamente a los servicios de emergencia (112) o diríjase directamente al personal. Cuando los pacientes ingresan ciertas palabras clave, la plataforma puede resaltar visualmente el registro en el panel del personal — la evaluación clínica permanece exclusivamente en el equipo de la clínica.',
        fa: 'DiggAI صرفاً یک پلتفرم ثبت‌نام است و موارد اضطراری را تشخیص نمی‌دهد. در صورت بروز علائم حاد لطفاً فوراً با خدمات اورژانس (112) تماس بگیرید یا مستقیماً به کارکنان مراجعه کنید. هنگامی که بیماران کلمات کلیدی خاصی را وارد می‌کنند، پلتفرم ممکن است ثبت‌نام را در داشبورد کارکنان به صورت بصری برجسته کند — ارزیابی بالینی صرفاً نزد تیم درمانگاه باقی می‌ماند.',
        it: 'DiggAI è una piattaforma puramente di registrazione e non rileva emergenze. In caso di sintomi acuti, chiamare immediatamente i servizi di emergenza (112) o rivolgersi direttamente al personale. Quando i pazienti inseriscono determinate parole chiave, la piattaforma può evidenziare visivamente la registrazione nella dashboard del personale — la valutazione clinica rimane esclusivamente al team della clinica.',
        fr: "DiggAI est une plateforme purement d'enregistrement et ne détecte pas les urgences. En cas de symptômes aigus, veuillez appeler immédiatement les services d'urgence (112) ou vous adresser directement au personnel. Lorsque les patients saisissent certains mots-clés, la plateforme peut mettre en évidence visuellement l'enregistrement dans le tableau de bord du personnel — l'évaluation clinique reste exclusivement à l'équipe de la clinique.",
        pl: 'DiggAI jest wyłącznie platformą rejestracji i nie wykrywa nagłych przypadków. W przypadku ostrych objawów prosimy natychmiast zadzwonić pod numer alarmowy (112) lub zwrócić się bezpośrednio do personelu. Gdy pacjenci wprowadzą określone słowa kluczowe, platforma może wizualnie wyróżnić rejestrację w panelu personelu — ocena kliniczna pozostaje wyłącznie w zespole praktyki.',
    },
    'docs.faq.emergency.q': {
        en: 'How does DiggAI handle urgent concerns?',
        tr: 'DiggAI acil durumlarla nasıl başa çıkar?',
        ar: 'كيف تتعامل DiggAI مع المخاوف العاجلة؟',
        uk: 'Як DiggAI обробляє термінові звернення?',
        es: '¿Cómo maneja DiggAI las inquietudes urgentes?',
        fa: 'DiggAI چگونه با مسائل فوری برخورد می‌کند؟',
        it: 'Come gestisce DiggAI le segnalazioni urgenti?',
        fr: 'Comment DiggAI gère-t-il les demandes urgentes ?',
        pl: 'Jak DiggAI obsługuje pilne sprawy?',
    },
    'docs.feature.anamnese.desc': {
        en: 'Over 270 administrative intake questions in 10 structured service flows. Patients see only questions relevant to their concern, saving up to 40% of completion time. No diagnosis, no medical assessment.',
        tr: '10 yapılandırılmış servis akışında 270+ idari kayıt sorusu. Hastalar yalnızca konularıyla ilgili soruları görür ve doldurma süresinin %40\'ına kadar tasarruf eder. Tanı yok, tıbbi değerlendirme yok.',
        ar: 'أكثر من 270 سؤال إداري للاستقبال في 10 تدفقات خدمة منظمة. يرى المرضى فقط الأسئلة ذات الصلة بمخاوفهم، مما يوفر ما يصل إلى 40% من وقت الإكمال. لا يوجد تشخيص، ولا تقييم طبي.',
        uk: 'Понад 270 адміністративних запитань у 10 структурованих сервісних потоках. Пацієнти бачать лише запитання, що стосуються їхнього звернення, заощаджуючи до 40% часу на заповнення. Без діагностики, без медичної оцінки.',
        es: 'Más de 270 preguntas administrativas de admisión en 10 flujos de servicio estructurados. Los pacientes ven solo las preguntas relevantes para su consulta, ahorrando hasta el 40% del tiempo de cumplimentación. Sin diagnóstico, sin evaluación médica.',
        fa: 'بیش از ۲۷۰ سؤال اداری پذیرش در ۱۰ جریان خدمات ساختاریافته. بیماران فقط سؤالات مرتبط با موضوع خود را می‌بینند و تا ۴۰٪ از زمان تکمیل را صرفه‌جویی می‌کنند. بدون تشخیص، بدون ارزیابی پزشکی.',
        it: 'Oltre 270 domande amministrative di accettazione in 10 flussi di servizio strutturati. I pazienti vedono solo le domande pertinenti alla loro richiesta, risparmiando fino al 40% del tempo di compilazione. Nessuna diagnosi, nessuna valutazione medica.',
        fr: 'Plus de 270 questions administratives d\'admission dans 10 flux de service structurés. Les patients ne voient que les questions pertinentes à leur préoccupation, économisant jusqu\'à 40% du temps de saisie. Aucun diagnostic, aucune évaluation médicale.',
        pl: 'Ponad 270 administracyjnych pytań rejestracyjnych w 10 ustrukturyzowanych przepływach usług. Pacjenci widzą tylko pytania istotne dla ich sprawy, oszczędzając do 40% czasu wypełniania. Bez diagnozy, bez oceny medycznej.',
    },
    'docs.feature.anamnese.title': {
        en: 'Structured intake collection',
        tr: 'Yapılandırılmış kayıt toplama',
        ar: 'جمع منظم للبيانات',
        uk: 'Структурований збір даних',
        es: 'Recopilación estructurada de admisión',
        fa: 'جمع‌آوری ساختاریافته پذیرش',
        it: 'Raccolta strutturata di accettazione',
        fr: 'Collecte d\'admission structurée',
        pl: 'Strukturalne zbieranie danych rejestracyjnych',
    },
    'docs.feature.dashboards.desc': {
        en: 'Role-based dashboards with live statistics, automatic keyword sorting, PDF/CSV export and real-time waiting room overview.',
        tr: 'Canlı istatistikler, otomatik anahtar kelime sıralaması, PDF/CSV dışa aktarma ve gerçek zamanlı bekleme odası genel bakışı içeren rol tabanlı kontrol panelleri.',
        ar: 'لوحات تحكم قائمة على الأدوار مع إحصائيات مباشرة، فرز تلقائي للكلمات الرئيسية، تصدير PDF/CSV ونظرة عامة على غرفة الانتظار في الوقت الفعلي.',
        uk: 'Панелі керування на основі ролей з живою статистикою, автоматичним сортуванням за ключовими словами, експортом PDF/CSV та оглядом залу очікування в реальному часі.',
        es: 'Paneles basados en roles con estadísticas en vivo, clasificación automática por palabras clave, exportación a PDF/CSV y vista general de la sala de espera en tiempo real.',
        fa: 'داشبوردهای مبتنی بر نقش با آمار زنده، مرتب‌سازی خودکار کلمات کلیدی، صادرات PDF/CSV و نمای کلی اتاق انتظار در زمان واقعی.',
        it: 'Dashboard basate sui ruoli con statistiche live, ordinamento automatico per parole chiave, esportazione PDF/CSV e panoramica della sala d\'attesa in tempo reale.',
        fr: 'Tableaux de bord basés sur les rôles avec statistiques en direct, tri automatique par mots-clés, exportation PDF/CSV et vue d\'ensemble de la salle d\'attente en temps réel.',
        pl: 'Pulpity oparte na rolach z aktywnymi statystykami, automatycznym sortowaniem słów kluczowych, eksportem PDF/CSV i podglądem poczekalni w czasie rzeczywistym.',
    },
    'docs.subtitle': {
        en: 'Administrative practice registration and intake platform — multilingual, GDPR-compliant, not a medical device.',
        tr: 'İdari muayenehane kayıt ve giriş platformu — çok dilli, GDPR uyumlu, tıbbi cihaz değildir.',
        ar: 'منصة إدارية لتسجيل ودخول العيادات — متعددة اللغات، متوافقة مع GDPR، ليست جهازاً طبياً.',
        uk: 'Адміністративна платформа реєстрації та прийому в практиці — багатомовна, відповідає GDPR, не є медичним пристроєм.',
        es: 'Plataforma administrativa de registro y admisión en consultas — multilingüe, conforme con RGPD, no es un dispositivo médico.',
        fa: 'پلتفرم اداری ثبت‌نام و پذیرش مطب — چندزبانه، سازگار با GDPR، یک دستگاه پزشکی نیست.',
        it: 'Piattaforma amministrativa di registrazione e accettazione in studio — multilingue, conforme al GDPR, non è un dispositivo medico.',
        fr: 'Plateforme administrative d\'enregistrement et d\'admission en cabinet — multilingue, conforme au RGPD, n\'est pas un dispositif médical.',
        pl: 'Administracyjna platforma rejestracji i przyjęć w gabinecie — wielojęzyczna, zgodna z RODO, nie jest wyrobem medycznym.',
    },
    'docs.title': {
        en: 'DiggAI Capture — Practice Registration',
        tr: 'DiggAI Capture — Muayenehane Kaydı',
        ar: 'DiggAI Capture — تسجيل العيادة',
        uk: 'DiggAI Capture — Реєстрація в практиці',
        es: 'DiggAI Capture — Registro de Consulta',
        fa: 'DiggAI Capture — ثبت‌نام مطب',
        it: 'DiggAI Capture — Registrazione Studio',
        fr: 'DiggAI Capture — Enregistrement Cabinet',
        pl: 'DiggAI Capture — Rejestracja Gabinetu',
    },
    'docs.footer': {
        en: 'Practice registration platform. Made in Germany.',
        tr: 'Muayenehane kayıt platformu. Almanya\'da yapıldı.',
        ar: 'منصة تسجيل العيادة. صُنع في ألمانيا.',
        uk: 'Платформа реєстрації в практиці. Зроблено в Німеччині.',
        es: 'Plataforma de registro de consultas. Hecho en Alemania.',
        fa: 'پلتفرم ثبت‌نام مطب. ساخت آلمان.',
        it: 'Piattaforma di registrazione studio. Made in Germany.',
        fr: 'Plateforme d\'enregistrement de cabinet. Made in Germany.',
        pl: 'Platforma rejestracji gabinetu. Made in Germany.',
    },
    'docs.stat.questions': {
        en: 'Intake Questions',
        tr: 'Kayıt Soruları',
        ar: 'أسئلة التسجيل',
        uk: 'Реєстраційні запитання',
        es: 'Preguntas de Admisión',
        fa: 'سؤالات پذیرش',
        it: 'Domande di Accettazione',
        fr: 'Questions d\'Admission',
        pl: 'Pytania Rejestracyjne',
    },
    'docs.stat.services': {
        en: 'Service Flows',
        tr: 'Servis Akışları',
        ar: 'تدفقات الخدمة',
        uk: 'Сервісні потоки',
        es: 'Flujos de Servicio',
        fa: 'جریان‌های خدمات',
        it: 'Flussi di Servizio',
        fr: 'Flux de Service',
        pl: 'Przepływy Usług',
    },
    'docs.stat.triage': {
        en: 'Routing Time',
        tr: 'Yönlendirme Süresi',
        ar: 'وقت التوجيه',
        uk: 'Час маршрутизації',
        es: 'Tiempo de Enrutamiento',
        fa: 'زمان مسیریابی',
        it: 'Tempo di Instradamento',
        fr: 'Temps de Routage',
        pl: 'Czas Routingu',
    },
    'arzt.triageAlarms': {
        en: 'Routing Notifications',
        tr: 'Yönlendirme Bildirimleri',
        ar: 'إشعارات التوجيه',
        uk: 'Сповіщення про маршрутизацію',
        es: 'Notificaciones de Enrutamiento',
        fa: 'اعلان‌های مسیریابی',
        it: 'Notifiche di Instradamento',
        fr: 'Notifications de Routage',
        pl: 'Powiadomienia Routingu',
    },
    'mfa.receptionTriage': {
        en: 'Routing Notifications',
        tr: 'Yönlendirme Bildirimleri',
        ar: 'إشعارات التوجيه',
        uk: 'Сповіщення про маршрутизацію',
        es: 'Notificaciones de Enrutamiento',
        fa: 'اعلان‌های مسیریابی',
        it: 'Notifiche di Instradamento',
        fr: 'Notifications de Routage',
        pl: 'Powiadomienia Routingu',
    },
    'permission.triage_view': {
        en: 'View Routing Notifications',
        tr: 'Yönlendirme Bildirimlerini Görüntüle',
        ar: 'عرض إشعارات التوجيه',
        uk: 'Переглядати сповіщення про маршрутизацію',
        es: 'Ver Notificaciones de Enrutamiento',
        fa: 'مشاهده اعلان‌های مسیریابی',
        it: 'Visualizza Notifiche di Instradamento',
        fr: 'Voir les Notifications de Routage',
        pl: 'Zobacz Powiadomienia Routingu',
    },
};

let totalChanges = 0;
const summary = [];

for (const lang of TARGET_LANGS) {
    const filePath = path.join(LOCALES_DIR, lang, 'translation.json');
    if (!fs.existsSync(filePath)) {
        console.warn(`[WARN] ${lang}: file not found at ${filePath}, skipping`);
        continue;
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    let json;
    try {
        json = JSON.parse(raw);
    } catch (err) {
        console.error(`[ERROR] ${lang}: invalid JSON — ${err.message}`);
        continue;
    }

    let langChanges = 0;
    const changedKeys = [];

    for (const [key, perLang] of Object.entries(TRANSLATIONS)) {
        const newVal = perLang[lang];
        if (newVal === undefined) continue;
        if (json[key] !== undefined && json[key] !== newVal) {
            const oldVal = json[key];
            json[key] = newVal;
            langChanges++;
            changedKeys.push(`  ${key}\n    OLD: ${oldVal.substring(0, 80)}${oldVal.length > 80 ? '…' : ''}\n    NEW: ${newVal.substring(0, 80)}${newVal.length > 80 ? '…' : ''}`);
        } else if (json[key] === undefined) {
            // Add missing key
            json[key] = newVal;
            langChanges++;
            changedKeys.push(`  ${key} (NEW)\n    SET: ${newVal.substring(0, 80)}${newVal.length > 80 ? '…' : ''}`);
        }
    }

    if (langChanges > 0) {
        if (APPLY) {
            fs.writeFileSync(filePath, JSON.stringify(json, null, 2) + '\n', 'utf8');
            console.log(`✓ ${lang}: ${langChanges} key(s) updated`);
        } else {
            console.log(`[DRY-RUN] ${lang}: ${langChanges} key(s) would be updated`);
        }
        if (process.env.VERBOSE) {
            console.log(changedKeys.join('\n'));
        }
        totalChanges += langChanges;
        summary.push({ lang, changes: langChanges });
    } else {
        console.log(`✓ ${lang}: no changes needed`);
    }
}

console.log('────────────────────────────────────────────────────────');
console.log(`Total: ${totalChanges} key(s) across ${summary.length} language(s)`);
console.log(APPLY ? '✅ Applied — review with `git diff public/locales/`' : '🔍 Dry-run — re-run with --apply to write files');
