/**
 * fix-i18n-class-i.cjs
 * K21: Class-I-String-Pass für 8 nicht-deutsche, nicht-englische Sprachen
 * Ersetzt Class-IIa-Trigger in docs.*, handbuch.*, arzt.*, mfa.*, pricing.* Keys
 *
 * Ausführung: node scripts/fix-i18n-class-i.cjs
 */

'use strict';
const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '..', 'public', 'locales');

// Sprachen: alle außer DE (bereits erledigt Lauf 22) und EN (bereits erledigt Lauf 27)
const LANGS = ['tr', 'ar', 'uk', 'es', 'fa', 'it', 'fr', 'pl'];

/**
 * Replacement-Map: Key → neue Class-I-konforme Übersetzung pro Sprache.
 * Wo eine Sprache den Key noch gar nicht hat (oder bereits korrekt ist), wird
 * nichts verändert (upsert-Logik).
 *
 * Jede Sprache bekommt nur die kritischen docs.*/handbuch.*/pricing.*-Strings.
 * arzt.triageAlarms / mfa.receptionTriage / permission.* werden NUR gepatcht
 * wenn sie noch die alten Werte enthalten.
 */
const REPLACEMENTS = {
  // ── Kritische docs.feature.triage.*-Keys ──────────────────────────────────
  'docs.feature.triage.title': {
    tr: 'Gerçek Zamanlı Giriş Yönlendirmesi',
    ar: 'توجيه المدخلات في الوقت الفعلي',
    uk: 'Маршрутизація прийому в реальному часі',
    es: 'Enrutamiento de entrada en tiempo real',
    fa: 'مسیریابی پذیرش در زمان واقعی',
    it: 'Instradamento accettazione in tempo reale',
    fr: 'Routage d\'accueil en temps réel',
    pl: 'Kierowanie zgłoszeń w czasie rzeczywistym',
  },
  'docs.feature.triage.desc': {
    tr: '10 şeffaf yönlendirme kuralı, hastalar tarafından girilen semptom anahtar kelimelerini yapılandırır ve öncelikli kayıtları 2 saniye içinde personele işaretler. Tıbbi değerlendirme tamamen personelde kalır.',
    ar: '10 قاعدة توجيه شفافة تهيكل الكلمات المفتاحية للأعراض التي يدخلها المرضى وتحدد التسجيلات ذات الأولوية للموظفين في أقل من ثانيتين. يبقى التقييم السريري حصرياً مع الكادر.',
    uk: '10 прозорих правил маршрутизації структурують ключові слова симптомів, введені пацієнтами, і позначають пріоритетні реєстрації для персоналу за 2 секунди. Клінічна оцінка залишається виключно за персоналом.',
    es: '10 reglas de enrutamiento transparentes estructuran las palabras clave de síntomas introducidas por los pacientes y marcan los registros prioritarios para el personal en menos de 2 segundos. La evaluación clínica permanece exclusivamente en el personal.',
    fa: '۱۰ قانون مسیریابی شفاف، کلیدواژه‌های علائم وارد شده توسط بیماران را سازماندهی می‌کند و ثبت‌نام‌های اولویت‌دار را در کمتر از ۲ ثانیه برای کارکنان علامت‌گذاری می‌کند. ارزیابی بالینی منحصراً با کارکنان باقی می‌ماند.',
    it: '10 regole di instradamento trasparenti strutturano le parole chiave dei sintomi inserite dai pazienti e contrassegnano le registrazioni prioritarie per il personale in meno di 2 secondi. La valutazione clinica rimane esclusivamente al personale.',
    fr: '10 règles de routage transparentes structurent les mots-clés de symptômes saisis par les patients et signalent les inscriptions prioritaires au personnel en moins de 2 secondes. L\'évaluation clinique reste exclusivement au personnel.',
    pl: '10 przejrzystych reguł kierowania strukturyzuje słowa kluczowe objawów wprowadzone przez pacjentów i oznacza priorytetowe rejestracje dla personelu w ciągu 2 sekund. Ocena kliniczna pozostaje wyłącznie przy personelu.',
  },
  'docs.feature.triage.h1': {
    tr: '4 ÖNCELİK bildirimi öncelikli personel incelemesi için',
    ar: '4 إشعارات PRIORITY لمراجعة الكوادر ذات الأولوية',
    uk: '4 PRIORITY-повідомлення для пріоритетного перегляду персоналом',
    es: '4 notificaciones PRIORITY para revisión prioritaria del personal',
    fa: '۴ اطلاع‌رسانی PRIORITY برای بررسی اولویت‌دار کارکنان',
    it: '4 notifiche PRIORITY per revisione prioritaria del personale',
    fr: '4 notifications PRIORITY pour révision prioritaire du personnel',
    pl: '4 powiadomienia PRIORITY dla priorytetowego przeglądu przez personel',
  },
  'docs.feature.triage.h2': {
    tr: '6 BİLGİ bildirimi kabul hazırlığı için',
    ar: '6 إشعارات INFO لتحضير الفحص',
    uk: '6 INFO-повідомлень для підготовки прийому',
    es: '6 notificaciones INFO para preparación de la consulta',
    fa: '۶ اطلاع‌رسانی INFO برای آماده‌سازی پذیرش',
    it: '6 notifiche INFO per preparazione accettazione',
    fr: '6 notifications INFO pour préparation de l\'accueil',
    pl: '6 powiadomień INFO do przygotowania przyjęcia',
  },
  'docs.feature.triage.h3': {
    tr: 'Personel panosunda anında bildirim',
    ar: 'إشعار فوري في لوحة تحكم الكوادر',
    uk: 'Негайне повідомлення на панелі персоналу',
    es: 'Notificación inmediata en el panel del personal',
    fa: 'اطلاع‌رسانی فوری در داشبورد کارکنان',
    it: 'Notifica immediata nel pannello del personale',
    fr: 'Notification immédiate dans le tableau de bord du personnel',
    pl: 'Natychmiastowe powiadomienie w panelu personelu',
  },
  // ── docs.feature.dashboards.h1 ───────────────────────────────────────────
  'docs.feature.dashboards.h1': {
    tr: 'Her kayıt için otomatik sıralanmış giriş özeti',
    ar: 'نظرة عامة على الاستقبال مرتبة تلقائياً لكل تسجيل',
    uk: 'Автоматично відсортований огляд прийому для кожної реєстрації',
    es: 'Vista general de admisión ordenada automáticamente por registro',
    fa: 'مرور پذیرش مرتب‌شده خودکار برای هر ثبت‌نام',
    it: 'Panoramica accettazione ordinata automaticamente per registrazione',
    fr: 'Aperçu d\'accueil trié automatiquement par inscription',
    pl: 'Automatycznie posortowany przegląd zgłoszeń dla każdej rejestracji',
  },
  // ── handbuch.sec.admin.s3 ────────────────────────────────────────────────
  'handbuch.sec.admin.s3.desc': {
    tr: 'Pratik kullanımı, dil dağılımı ve yönlendirme istatistikleri hakkında toplu raporlar dışa aktarın. PDF, CSV veya JSON olarak mevcut.',
    ar: 'تصدير تقارير مجمعة حول استخدام العيادة وتوزيع اللغات وإحصاءات التوجيه. متاح كـ PDF أو CSV أو JSON.',
    uk: 'Експортуйте агреговані звіти про використання практики, розподіл мов та статистику маршрутизації. Доступно у форматі PDF, CSV або JSON.',
    es: 'Exporte informes agregados sobre utilización de la práctica, distribución de idiomas y estadísticas de enrutamiento. Disponible como PDF, CSV o JSON.',
    fa: 'گزارش‌های جمع‌آوری‌شده درباره استفاده از مطب، توزیع زبان و آمار مسیریابی را صادر کنید. به صورت PDF، CSV یا JSON موجود است.',
    it: 'Esporta report aggregati sull\'utilizzo dello studio, la distribuzione delle lingue e le statistiche di instradamento. Disponibile come PDF, CSV o JSON.',
    fr: 'Exportez des rapports agrégés sur l\'utilisation du cabinet, la distribution des langues et les statistiques de routage. Disponible en PDF, CSV ou JSON.',
    pl: 'Eksportuj zagregowane raporty dotyczące wykorzystania gabinetu, rozkładu językowego i statystyk kierowania. Dostępne jako PDF, CSV lub JSON.',
  },
  // ── handbuch.sec.arzt.s2 ─────────────────────────────────────────────────
  'handbuch.sec.arzt.s2.desc': {
    tr: 'Hasta girdilerinin yapılandırılmış özetini açmak için bir oturuma tıklayın. Sıra: Kişisel veriler → Başvuru → Önceki girişler → Ek girişler.',
    ar: 'انقر على جلسة لفتح الملخص المنظم لإدخالات المريض. الترتيب: البيانات الشخصية → الطلب → الإدخالات السابقة → الإدخالات الإضافية.',
    uk: 'Клікніть на сесію, щоб відкрити структурований підсумок введених пацієнтом даних. Порядок: Особисті дані → Звернення → Попередні дані → Додаткові дані.',
    es: 'Haga clic en una sesión para abrir el resumen estructurado de las entradas del paciente. Orden: Datos personales → Consulta → Entradas previas → Entradas adicionales.',
    fa: 'برای باز کردن خلاصه ساختاریافته ورودی‌های بیمار روی یک جلسه کلیک کنید. ترتیب: داده‌های شخصی ← درخواست ← ورودی‌های قبلی ← ورودی‌های اضافی.',
    it: 'Clicca su una sessione per aprire il riepilogo strutturato delle inserzioni del paziente. Ordine: Dati personali → Richiesta → Inserzioni precedenti → Inserzioni aggiuntive.',
    fr: 'Cliquez sur une session pour ouvrir le résumé structuré des saisies du patient. Ordre : Données personnelles → Demande → Saisies précédentes → Saisies supplémentaires.',
    pl: 'Kliknij sesję, aby otworzyć ustrukturyzowane podsumowanie wpisów pacjenta. Kolejność: Dane osobowe → Zapytanie → Poprzednie wpisy → Dodatkowe wpisy.',
  },
  'handbuch.sec.arzt.s2.tip': {
    tr: 'İpucu: Öncelikli olarak işaretlenmiş kayıtlar renk kodlu olarak vurgulanır. Klinik değerlendirme tamamen personelde kalır.',
    ar: 'تلميح: يتم تمييز التسجيلات ذات العلامة الأولوية بالألوان. يبقى التقييم السريري حصرياً مع الكادر.',
    uk: 'Порада: Пріоритетно позначені реєстрації виділяються кольором. Клінічна оцінка залишається виключно за персоналом.',
    es: 'Consejo: Los registros marcados como prioritarios se resaltan en color. La evaluación clínica permanece exclusivamente en el personal.',
    fa: 'نکته: ثبت‌نام‌های علامت‌گذاری شده با اولویت با رنگ برجسته می‌شوند. ارزیابی بالینی منحصراً با کارکنان باقی می‌ماند.',
    it: 'Suggerimento: Le registrazioni contrassegnate come prioritarie vengono evidenziate a colori. La valutazione clinica rimane esclusivamente al personale.',
    fr: 'Conseil : Les inscriptions marquées comme prioritaires sont mises en évidence en couleur. L\'évaluation clinique reste exclusivement au personnel.',
    pl: 'Wskazówka: Rejestracje oznaczone jako priorytetowe są podświetlone kolorem. Ocena kliniczna pozostaje wyłącznie przy personelu.',
  },
  'handbuch.sec.arzt.s2.title': {
    tr: 'Oturum özetini oku',
    ar: 'قراءة ملخص الجلسة',
    uk: 'Читати підсумок сесії',
    es: 'Leer resumen de sesión',
    fa: 'خواندن خلاصه جلسه',
    it: 'Leggi riepilogo sessione',
    fr: 'Lire le résumé de session',
    pl: 'Odczytaj podsumowanie sesji',
  },
  'handbuch.sec.arzt.s3.desc': {
    tr: 'Hastalar belirli anahtar kelimeleri girdiğinde, bir yönlendirme bildirimi gerçek zamanlı olarak görünür. Bildirimi dikkate aldığınızı belgelemek için tek tıkla onaylayın.',
    ar: 'عندما يدخل المرضى كلمات مفتاحية معينة، يظهر إشعار توجيه في الوقت الفعلي. أقر بالإشعار بنقرة واحدة لتوثيق أنك اطلعت عليه.',
    uk: 'Коли пацієнти вводять певні ключові слова, у реальному часі з\'являється повідомлення про маршрутизацію. Підтвердьте його одним кліком, щоб задокументувати, що ви його прочитали.',
    es: 'Cuando los pacientes ingresan ciertas palabras clave, aparece una notificación de enrutamiento en tiempo real. Confirme la notificación con un clic para documentar que la ha tomado en cuenta.',
    fa: 'هنگامی که بیماران کلیدواژه‌های خاصی وارد می‌کنند، یک اطلاع‌رسانی مسیریابی در زمان واقعی ظاهر می‌شود. با یک کلیک آن را تأیید کنید تا مستند شود که آن را مشاهده کرده‌اید.',
    it: 'Quando i pazienti inseriscono determinate parole chiave, appare una notifica di instradamento in tempo reale. Conferma la notifica con un clic per documentare che ne hai preso nota.',
    fr: 'Lorsque les patients saisissent certains mots-clés, une notification de routage apparaît en temps réel. Confirmez la notification d\'un clic pour documenter que vous en avez pris connaissance.',
    pl: 'Gdy pacjenci wprowadzają określone słowa kluczowe, w czasie rzeczywistym pojawia się powiadomienie o kierowaniu. Potwierdź powiadomienie jednym kliknięciem, aby udokumentować, że je przeczytałeś.',
  },
  'handbuch.sec.arzt.s3.title': {
    tr: 'Yönlendirme bildirimlerini onayla',
    ar: 'تأكيد إشعارات التوجيه',
    uk: 'Підтвердити повідомлення про маршрутизацію',
    es: 'Confirmar notificaciones de enrutamiento',
    fa: 'تأیید اطلاع‌رسانی‌های مسیریابی',
    it: 'Confermare notifiche di instradamento',
    fr: 'Confirmer les notifications de routage',
    pl: 'Potwierdź powiadomienia o kierowaniu',
  },
};

// Sprach-spezifische Werte für pricing-Keys (nicht mehr "KI-Auswertungen")
const PRICING_FIXES = {
  tr: {
    'pricing.professional.feature4': '500 yapılandırılmış kabul değerlendirmesi dahil',
    'pricing.enterprise.feature3': 'Sınırsız yapılandırılmış kabul değerlendirmesi',
  },
  ar: {
    'pricing.professional.feature4': '500 تقييم استقبال منظم مضمن',
    'pricing.enterprise.feature3': 'تقييمات استقبال منظمة غير محدودة',
  },
  uk: {
    'pricing.professional.feature4': '500 структурованих оцінок прийому включено',
    'pricing.enterprise.feature3': 'Необмежені структуровані оцінки прийому',
  },
  es: {
    'pricing.professional.feature4': '500 evaluaciones de admisión estructuradas incluidas',
    'pricing.enterprise.feature3': 'Evaluaciones de admisión estructuradas ilimitadas',
  },
  fa: {
    'pricing.professional.feature4': '۵۰۰ ارزیابی ساختاریافته پذیرش شامل',
    'pricing.enterprise.feature3': 'ارزیابی‌های ساختاریافته پذیرش نامحدود',
  },
  it: {
    'pricing.professional.feature4': '500 valutazioni accettazione strutturate incluse',
    'pricing.enterprise.feature3': 'Valutazioni accettazione strutturate illimitate',
  },
  fr: {
    'pricing.professional.feature4': '500 évaluations d\'accueil structurées incluses',
    'pricing.enterprise.feature3': 'Évaluations d\'accueil structurées illimitées',
  },
  pl: {
    'pricing.professional.feature4': '500 ustrukturyzowanych ocen przyjęcia w cenie',
    'pricing.enterprise.feature3': 'Nieograniczone ustrukturyzowane oceny przyjęcia',
  },
};

let totalFixed = 0;

for (const lang of LANGS) {
  const filePath = path.join(LOCALES_DIR, lang, 'translation.json');
  if (!fs.existsSync(filePath)) {
    console.log(`[SKIP] ${lang}: file not found`);
    continue;
  }

  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    console.log(`[ERROR] ${lang}: cannot read — ${e.message}`);
    continue;
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.log(`[ERROR] ${lang}: invalid JSON — ${e.message}`);
    continue;
  }

  let changed = 0;

  // Apply REPLACEMENTS
  for (const [key, langMap] of Object.entries(REPLACEMENTS)) {
    const newVal = langMap[lang];
    if (!newVal) continue;
    if (data[key] !== undefined && data[key] !== newVal) {
      console.log(`  [${lang}] ${key}: "${data[key].substring(0, 60)}..." → fixed`);
      data[key] = newVal;
      changed++;
    } else if (data[key] === undefined) {
      // Key missing — add it
      data[key] = newVal;
      changed++;
    }
  }

  // Apply PRICING_FIXES
  const pFix = PRICING_FIXES[lang];
  if (pFix) {
    for (const [key, newVal] of Object.entries(pFix)) {
      if (data[key] !== undefined && data[key] !== newVal) {
        console.log(`  [${lang}] ${key}: "${data[key]}" → "${newVal}"`);
        data[key] = newVal;
        changed++;
      }
    }
  }

  if (changed > 0) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`[OK] ${lang}: ${changed} keys patched`);
    totalFixed += changed;
  } else {
    console.log(`[OK] ${lang}: already clean`);
  }
}

console.log(`\nDone. Total keys patched: ${totalFixed}`);
