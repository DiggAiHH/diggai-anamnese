#!/usr/bin/env node
/**
 * Translation Fix Script for DiggAI Anamnese App
 * Adds missing keys and fixes untranslated entries across all languages.
 */

const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '..', 'public', 'locales');

function loadJson(lang) {
  const fp = path.join(LOCALES_DIR, lang, 'translation.json');
  return JSON.parse(fs.readFileSync(fp, 'utf-8'));
}

function saveJson(lang, data) {
  const fp = path.join(LOCALES_DIR, lang, 'translation.json');
  // Sort keys alphabetically (matching original file convention)
  const sorted = {};
  for (const key of Object.keys(data).sort()) {
    sorted[key] = data[key];
  }
  fs.writeFileSync(fp, JSON.stringify(sorted, null, 2) + '\n', 'utf-8');
  console.log(`  ✓ Saved ${lang}/translation.json (${Object.keys(sorted).length} keys)`);
}

// ───────────────────────────────────────────────────────────────
// MISSING KEYS: 4 keys missing from AR, TR, ES, UK
// ───────────────────────────────────────────────────────────────
const MISSING_COMMON = {
  en: {
    "Falls Sie auch über Festnetz erreichbar sind.": "If you are also reachable by landline.",
    "Für dringende Rückfragen der Praxis.": "For urgent inquiries from the practice.",
    "Mehrfachauswahl möglich – oder Freitext eingeben": "Multiple selection possible – or enter free text",
    "z.B. \"ab 14 Uhr\" oder \"zwischen 10 und 12 Uhr\"": "e.g. \"from 2 PM\" or \"between 10 AM and 12 PM\""
  },
  ar: {
    "Falls Sie auch über Festnetz erreichbar sind.": "إذا كنت متاحًا أيضًا عبر الهاتف الأرضي.",
    "Für dringende Rückfragen der Praxis.": "للاستفسارات العاجلة من العيادة.",
    "Mehrfachauswahl möglich – oder Freitext eingeben": "الاختيار المتعدد ممكن – أو أدخل نصًا حرًا",
    "z.B. \"ab 14 Uhr\" oder \"zwischen 10 und 12 Uhr\"": "مثال: \"من الساعة 14\" أو \"بين الساعة 10 و12\""
  },
  tr: {
    "Falls Sie auch über Festnetz erreichbar sind.": "Sabit hat üzerinden de ulaşılabilirseniz.",
    "Für dringende Rückfragen der Praxis.": "Muayenehaneden acil geri aramalar için.",
    "Mehrfachauswahl möglich – oder Freitext eingeben": "Çoklu seçim mümkün – veya serbest metin girin",
    "z.B. \"ab 14 Uhr\" oder \"zwischen 10 und 12 Uhr\"": "örn. \"14:00'dan itibaren\" veya \"10:00–12:00 arası\""
  },
  es: {
    "Falls Sie auch über Festnetz erreichbar sind.": "Si también está disponible por teléfono fijo.",
    "Für dringende Rückfragen der Praxis.": "Para consultas urgentes de la consulta.",
    "Mehrfachauswahl möglich – oder Freitext eingeben": "Selección múltiple posible – o introduzca texto libre",
    "z.B. \"ab 14 Uhr\" oder \"zwischen 10 und 12 Uhr\"": "p. ej. \"a partir de las 14 h\" o \"entre las 10 y las 12 h\""
  },
  uk: {
    "Falls Sie auch über Festnetz erreichbar sind.": "Якщо ви також доступні за стаціонарним телефоном.",
    "Für dringende Rückfragen der Praxis.": "Для термінових зворотних запитань від клініки.",
    "Mehrfachauswahl möglich – oder Freitext eingeben": "Можливий множинний вибір – або введіть вільний текст",
    "z.B. \"ab 14 Uhr\" oder \"zwischen 10 und 12 Uhr\"": "напр. \"з 14:00\" або \"між 10:00 та 12:00\""
  },
  fa: {
    "Falls Sie auch über Festnetz erreichbar sind.": "اگر از طریق تلفن ثابت هم در دسترس هستید.",
    "Für dringende Rückfragen der Praxis.": "برای سوالات فوری از مطب.",
    "Mehrfachauswahl möglich – oder Freitext eingeben": "انتخاب چندگانه ممکن است – یا متن آزاد وارد کنید",
    "z.B. \"ab 14 Uhr\" oder \"zwischen 10 und 12 Uhr\"": "مثلاً \"از ساعت ۱۴\" یا \"بین ساعت ۱۰ تا ۱۲\""
  },
  fr: {
    "Falls Sie auch über Festnetz erreichbar sind.": "Si vous êtes également joignable par téléphone fixe.",
    "Für dringende Rückfragen der Praxis.": "Pour les demandes urgentes du cabinet.",
    "Mehrfachauswahl möglich – oder Freitext eingeben": "Sélection multiple possible – ou saisissez du texte libre",
    "z.B. \"ab 14 Uhr\" oder \"zwischen 10 und 12 Uhr\"": "p. ex. \"à partir de 14 h\" ou \"entre 10 h et 12 h\""
  },
  it: {
    "Falls Sie auch über Festnetz erreichbar sind.": "Se è raggiungibile anche tramite telefono fisso.",
    "Für dringende Rückfragen der Praxis.": "Per richieste urgenti dallo studio medico.",
    "Mehrfachauswahl möglich – oder Freitext eingeben": "Selezione multipla possibile – oppure inserisci testo libero",
    "z.B. \"ab 14 Uhr\" oder \"zwischen 10 und 12 Uhr\"": "es. \"dalle 14\" oppure \"tra le 10 e le 12\""
  },
  pl: {
    "Falls Sie auch über Festnetz erreichbar sind.": "Jeśli jest Pan(i) dostępny(a) również pod telefonem stacjonarnym.",
    "Für dringende Rückfragen der Praxis.": "Dla pilnych pytań zwrotnych z gabinetu.",
    "Mehrfachauswahl möglich – oder Freitext eingeben": "Możliwy wielokrotny wybór – lub wpisz tekst",
    "z.B. \"ab 14 Uhr\" oder \"zwischen 10 und 12 Uhr\"": "np. \"od godz. 14\" lub \"między 10 a 12\""
  }
};

// ───────────────────────────────────────────────────────────────
// UK-specific: 65 additional missing keys (arzt.*, camera.*, mfa.*)
// ───────────────────────────────────────────────────────────────
const UK_EXTRA_MISSING = {
  "arzt.aiAnalysis": "ШІ Медичний аналіз",
  "arzt.analyzing": "Аналіз даних пацієнта...",
  "arzt.answers": "Відповіді",
  "arzt.answersBySection": "Відповіді пацієнта за розділами",
  "arzt.backToOverview": "Назад до огляду",
  "arzt.completeCase": "Завершити випадок та повідомити пацієнта",
  "arzt.completed": "Завершено",
  "arzt.confirmComplete": "Дійсно завершити цей випадок? Пацієнт буде повідомлений. Цю дію не можна скасувати.",
  "arzt.createdAt": "Створено",
  "arzt.csvExport": "Експорт CSV",
  "arzt.dashboard": "Панель лікаря",
  "arzt.editedBy": "Редагується",
  "arzt.emergencyAlert": "ЕКСТРЕНИЙ СИГНАЛ",
  "arzt.icdCodes": "Запропоновані коди МКХ-10",
  "arzt.incoming": "Вхідні",
  "arzt.liveChat": "Живе спілкування",
  "arzt.loading": "Завантаження сесій...",
  "arzt.loadingDetail": "Завантаження деталей...",
  "arzt.login.error": "Помилка входу",
  "arzt.login.password": "Пароль",
  "arzt.login.submit": "Увійти",
  "arzt.login.subtitle": "Панель анамнезу",
  "arzt.login.title": "Доступ лікаря",
  "arzt.login.username": "Ім'я користувача",
  "arzt.logout": "Вийти",
  "arzt.messagePlaceholder": "Повідомлення пацієнту...",
  "arzt.newMessage": "Нове повідомлення",
  "arzt.noMessages": "Повідомлень ще немає",
  "arzt.overview": "Огляд анамнезу",
  "arzt.patient": "Пацієнт",
  "arzt.patientConnected": "Пацієнт підключений",
  "arzt.patientData": "Базові дані пацієнта",
  "arzt.pdfReport": "PDF-звіт",
  "arzt.pushInfo": "Пацієнт отримає це повідомлення як push-сповіщення та в чаті",
  "arzt.question": "Питання",
  "arzt.selectedService": "Обрана послуга",
  "arzt.sendHint": "Надішліть повідомлення, щоб зв'язатися з пацієнтом безпосередньо.",
  "arzt.sendMessage": "Надіслати повідомлення",
  "arzt.sent": "Надіслано",
  "arzt.sessionCompleteMsg": "Анамнез повністю заповнений та подано.",
  "arzt.sessionId": "ID сесії",
  "arzt.stats.active": "Активні сесії",
  "arzt.stats.completed": "Завершено",
  "arzt.stats.redflags": "Відкриті Red Flags",
  "arzt.status": "Статус",
  "arzt.triageAlarms": "Тріаж-сигнали",
  "arzt.viewDocument": "Переглянути документ",
  "camera.error": "Не вдалося запустити камеру",
  "camera.positionCard": "Будь ласка, розмістіть картку точно в рамці",
  "camera.scanTitle": "Сканування картки eGK",
  "camera.starting": "Запуск камери...",
  "mfa.criticalSymptoms": "Виявлено критичні симптоми",
  "mfa.currentRequests": "Поточні запити пацієнтів",
  "mfa.enterPortal": "Увійти в портал",
  "mfa.generateQr": "Згенерувати QR-код",
  "mfa.inFlow": "В процесі",
  "mfa.loadingData": "Завантаження медичних даних...",
  "mfa.logout": "Вийти",
  "mfa.needAssignment": "Потрібне призначення лікаря",
  "mfa.noSessions": "Немає активних сесій",
  "mfa.patientsAnswering": "Пацієнти відповідають зараз",
  "mfa.portal": "Портал MFA",
  "mfa.redFlags": "Red Flags",
  "mfa.systemOnline": "Система онлайн",
  "mfa.unassigned": "Не призначено"
};

// ───────────────────────────────────────────────────────────────
// UNTRANSLATED ENTRIES: German text left identical in target langs
// Only fix genuinely German sentences/labels, NOT international terms
// ───────────────────────────────────────────────────────────────
const UNTRANSLATED_FIXES = {
  en: {
    "Bitte mindestens eine Telefonnummer (Mobil/Festnetz) oder eine E-Mail-Adresse angeben.": "Please provide at least one phone number (mobile/landline) or an email address.",
    "Falls Ihnen Ihre Patienten-ID bekannt ist, können Sie diese hier eingeben.": "If you know your patient ID, you can enter it here.",
    "Herzinsuffizienz/Arrhythmie": "Heart failure/Arrhythmia",
    "Nierenfunktionsstörung/Dialyseabhängigkeit": "Renal dysfunction/Dialysis dependence",
    "Patienten-ID (PID)": "Patient ID (PID)",
    "Rheuma": "Rheumatism",
    "Rufnummer (Mobil/Festnetz)": "Phone number (mobile/landline)",
    "Unter welcher Nummer können wir Sie zurückrufen?": "What number can we call you back on?",
    "VBG – Verwaltungs-Berufsgenossenschaft": "VBG – Administrative Professional Association",
    "z.B. 0171 12345678 / 030 12345678": "e.g. 0171 12345678 / 030 12345678",
    "z.B. 12345": "e.g. 12345"
  },
  ar: {
    "Bitte mindestens eine Telefonnummer (Mobil/Festnetz) oder eine E-Mail-Adresse angeben.": "يرجى تقديم رقم هاتف واحد على الأقل (جوال/أرضي) أو عنوان بريد إلكتروني.",
    "Falls Ihnen Ihre Patienten-ID bekannt ist, können Sie diese hier eingeben.": "إذا كنت تعرف رقم تعريف المريض الخاص بك، يمكنك إدخاله هنا.",
    "GdB 20-40": "درجة الإعاقة 20-40",
    "Glimepirid": "غليميبيريد",
    "Herzinsuffizienz/Arrhythmie": "قصور القلب/اضطراب نظم القلب",
    "Nierenfunktionsstörung/Dialyseabhängigkeit": "اضطراب وظائف الكلى/الاعتماد على غسيل الكلى",
    "Patienten-ID (PID)": "رقم تعريف المريض (PID)",
    "Rheuma": "الروماتيزم",
    "Rufnummer (Mobil/Festnetz)": "رقم الهاتف (جوال/أرضي)",
    "Unter welcher Nummer können wir Sie zurückrufen?": "على أي رقم يمكننا معاودة الاتصال بك؟",
    "VBG – Verwaltungs-Berufsgenossenschaft": "VBG – الجمعية المهنية الإدارية",
    "z.B. 0171 12345678 / 030 12345678": "مثال: 0171 12345678 / 030 12345678",
    "z.B. 12345": "مثال: 12345"
  },
  tr: {
    "37,5–38,0 °C (subfebril)": "37,5–38,0 °C (subfebril/düşük ateş)",
    "Bitte mindestens eine Telefonnummer (Mobil/Festnetz) oder eine E-Mail-Adresse angeben.": "Lütfen en az bir telefon numarası (cep/sabit hat) veya bir e-posta adresi girin.",
    "Falls Ihnen Ihre Patienten-ID bekannt ist, können Sie diese hier eingeben.": "Hasta kimlik numaranızı biliyorsanız buraya girebilirsiniz.",
    "Glimepirid": "Glimepirid",
    "Herzinsuffizienz/Arrhythmie": "Kalp yetmezliği/Aritmi",
    "Nierenfunktionsstörung/Dialyseabhängigkeit": "Böbrek fonksiyon bozukluğu/Diyaliz bağımlılığı",
    "Patienten-ID (PID)": "Hasta Kimlik No (PID)",
    "Rheuma": "Romatizma",
    "Rufnummer (Mobil/Festnetz)": "Telefon numarası (cep/sabit hat)",
    "Unter welcher Nummer können wir Sie zurückrufen?": "Sizi hangi numaradan geri arayabiliriz?",
    "VBG – Verwaltungs-Berufsgenossenschaft": "VBG – İdari Meslek Birliği",
    "z.B. 0171 12345678 / 030 12345678": "örn. 0171 12345678 / 030 12345678",
    "z.B. 12345": "örn. 12345"
  },
  uk: {
    "Bitte mindestens eine Telefonnummer (Mobil/Festnetz) oder eine E-Mail-Adresse angeben.": "Будь ласка, вкажіть хоча б один номер телефону (мобільний/стаціонарний) або адресу електронної пошти.",
    "Falls Ihnen Ihre Patienten-ID bekannt ist, können Sie diese hier eingeben.": "Якщо вам відомий ваш ідентифікатор пацієнта, ви можете ввести його тут.",
    "GdB 20-40": "Ступінь інвалідності 20-40",
    "Glimepirid": "Глімепірид",
    "Herzinsuffizienz/Arrhythmie": "Серцева недостатність/Аритмія",
    "Nierenfunktionsstörung/Dialyseabhängigkeit": "Порушення функції нирок/залежність від діалізу",
    "Patienten-ID (PID)": "ID пацієнта (PID)",
    "Rheuma": "Ревматизм",
    "Rufnummer (Mobil/Festnetz)": "Номер телефону (мобільний/стаціонарний)",
    "Unter welcher Nummer können wir Sie zurückrufen?": "За яким номером ми можемо вам передзвонити?",
    "VBG – Verwaltungs-Berufsgenossenschaft": "VBG – Адміністративне професійне товариство",
    "z.B. 0171 12345678 / 030 12345678": "напр. 0171 12345678 / 030 12345678",
    "z.B. 12345": "напр. 12345"
  },
  es: {
    "Bitte mindestens eine Telefonnummer (Mobil/Festnetz) oder eine E-Mail-Adresse angeben.": "Por favor, proporcione al menos un número de teléfono (móvil/fijo) o una dirección de correo electrónico.",
    "Falls Ihnen Ihre Patienten-ID bekannt ist, können Sie diese hier eingeben.": "Si conoce su identificación de paciente, puede introducirla aquí.",
    "Herzinsuffizienz/Arrhythmie": "Insuficiencia cardíaca/Arritmia",
    "Nierenfunktionsstörung/Dialyseabhängigkeit": "Disfunción renal/Dependencia de diálisis",
    "Patienten-ID (PID)": "ID de paciente (PID)",
    "Rheuma": "Reumatismo",
    "Rufnummer (Mobil/Festnetz)": "Número de teléfono (móvil/fijo)",
    "Unter welcher Nummer können wir Sie zurückrufen?": "¿A qué número podemos devolverle la llamada?",
    "VBG – Verwaltungs-Berufsgenossenschaft": "VBG – Asociación Profesional Administrativa",
    "z.B. 0171 12345678 / 030 12345678": "p. ej. 0171 12345678 / 030 12345678",
    "z.B. 12345": "p. ej. 12345"
  },
  fa: {
    "Bitte mindestens eine Telefonnummer (Mobil/Festnetz) oder eine E-Mail-Adresse angeben.": "لطفاً حداقل یک شماره تلفن (همراه/ثابت) یا یک آدرس ایمیل وارد کنید.",
    "Falls Ihnen Ihre Patienten-ID bekannt ist, können Sie diese hier eingeben.": "اگر شناسه بیمار خود را می‌دانید، می‌توانید آن را اینجا وارد کنید.",
    "Herzinsuffizienz/Arrhythmie": "نارسایی قلبی/آریتمی",
    "Nierenfunktionsstörung/Dialyseabhängigkeit": "اختلال عملکرد کلیه/وابستگی به دیالیز",
    "Patienten-ID (PID)": "شناسه بیمار (PID)",
    "Rheuma": "روماتیسم",
    "Rufnummer (Mobil/Festnetz)": "شماره تلفن (همراه/ثابت)",
    "Unter welcher Nummer können wir Sie zurückrufen?": "با چه شماره‌ای می‌توانیم با شما تماس بگیریم؟",
    "VBG – Verwaltungs-Berufsgenossenschaft": "VBG – انجمن حرفه‌ای اداری",
    "z.B. 0171 12345678 / 030 12345678": "مثلاً 0171 12345678 / 030 12345678",
    "z.B. 12345": "مثلاً 12345"
  },
  fr: {
    "Bitte mindestens eine Telefonnummer (Mobil/Festnetz) oder eine E-Mail-Adresse angeben.": "Veuillez fournir au moins un numéro de téléphone (mobile/fixe) ou une adresse e-mail.",
    "Falls Ihnen Ihre Patienten-ID bekannt ist, können Sie diese hier eingeben.": "Si vous connaissez votre identifiant patient, vous pouvez le saisir ici.",
    "Herzinsuffizienz/Arrhythmie": "Insuffisance cardiaque/Arythmie",
    "Nierenfunktionsstörung/Dialyseabhängigkeit": "Dysfonctionnement rénal/Dépendance à la dialyse",
    "Patienten-ID (PID)": "Identifiant patient (PID)",
    "Rheuma": "Rhumatisme",
    "Rufnummer (Mobil/Festnetz)": "Numéro de téléphone (mobile/fixe)",
    "Unter welcher Nummer können wir Sie zurückrufen?": "À quel numéro pouvons-nous vous rappeler ?",
    "VBG – Verwaltungs-Berufsgenossenschaft": "VBG – Association professionnelle administrative",
    "z.B. 0171 12345678 / 030 12345678": "p. ex. 0171 12345678 / 030 12345678",
    "z.B. 12345": "p. ex. 12345"
  },
  it: {
    "Bitte mindestens eine Telefonnummer (Mobil/Festnetz) oder eine E-Mail-Adresse angeben.": "Si prega di fornire almeno un numero di telefono (cellulare/fisso) o un indirizzo e-mail.",
    "Falls Ihnen Ihre Patienten-ID bekannt ist, können Sie diese hier eingeben.": "Se conosce il suo ID paziente, può inserirlo qui.",
    "Herzinsuffizienz/Arrhythmie": "Insufficienza cardiaca/Aritmia",
    "Nierenfunktionsstörung/Dialyseabhängigkeit": "Disfunzione renale/Dipendenza dalla dialisi",
    "Patienten-ID (PID)": "ID paziente (PID)",
    "Rheuma": "Reumatismo",
    "Rufnummer (Mobil/Festnetz)": "Numero di telefono (cellulare/fisso)",
    "Unter welcher Nummer können wir Sie zurückrufen?": "A quale numero possiamo richiamarla?",
    "VBG – Verwaltungs-Berufsgenossenschaft": "VBG – Associazione professionale amministrativa",
    "z.B. 0171 12345678 / 030 12345678": "es. 0171 12345678 / 030 12345678",
    "z.B. 12345": "es. 12345"
  },
  pl: {
    "Bitte mindestens eine Telefonnummer (Mobil/Festnetz) oder eine E-Mail-Adresse angeben.": "Proszę podać przynajmniej jeden numer telefonu (komórkowy/stacjonarny) lub adres e-mail.",
    "Falls Ihnen Ihre Patienten-ID bekannt ist, können Sie diese hier eingeben.": "Jeśli zna Pan(i) swój identyfikator pacjenta, może go Pan(i) tutaj wpisać.",
    "Herzinsuffizienz/Arrhythmie": "Niewydolność serca/Arytmia",
    "Nierenfunktionsstörung/Dialyseabhängigkeit": "Zaburzenia czynności nerek/Zależność od dializy",
    "Patienten-ID (PID)": "Identyfikator pacjenta (PID)",
    "Rheuma": "Reumatyzm",
    "Rufnummer (Mobil/Festnetz)": "Numer telefonu (komórkowy/stacjonarny)",
    "Unter welcher Nummer können wir Sie zurückrufen?": "Pod jakim numerem możemy do Pana/Pani oddzwonić?",
    "VBG – Verwaltungs-Berufsgenossenschaft": "VBG – Administracyjne Stowarzyszenie Zawodowe",
    "z.B. 0171 12345678 / 030 12345678": "np. 0171 12345678 / 030 12345678",
    "z.B. 12345": "np. 12345"
  }
};

// ───────────────────────────────────────────────────────────────
// ES orphan fix: "Müdigkeit" exists in ES but not in DE
// We'll leave it — it's a valid German word (fatigue) that may have
// been deliberately added. If the key doesn't exist in DE, the app
// simply won't use it. We will NOT remove it to avoid data loss.
// ───────────────────────────────────────────────────────────────

function applyFixes() {
  console.log('\n=== Translation Fix Script ===\n');

  const LANGS = ['en', 'ar', 'tr', 'uk', 'es', 'fa', 'fr', 'it', 'pl'];

  for (const lang of LANGS) {
    console.log(`\nProcessing: ${lang.toUpperCase()}`);
    const data = loadJson(lang);
    let addedCount = 0;
    let fixedCount = 0;

    // 1. Add common missing keys (AR, TR, ES, UK get the 4 common keys)
    //    All other langs already have them — but we add for any lang that's missing
    if (MISSING_COMMON[lang]) {
      for (const [key, value] of Object.entries(MISSING_COMMON[lang])) {
        if (!data.hasOwnProperty(key)) {
          data[key] = value;
          addedCount++;
          console.log(`  + Added missing: "${key}"`);
        }
      }
    }

    // 2. Add UK-specific missing keys (arzt.*, camera.*, mfa.*)
    if (lang === 'uk') {
      for (const [key, value] of Object.entries(UK_EXTRA_MISSING)) {
        if (!data.hasOwnProperty(key)) {
          data[key] = value;
          addedCount++;
          console.log(`  + Added missing: "${key}"`);
        }
      }
    }

    // 3. Fix untranslated entries (German text left as-is)
    if (UNTRANSLATED_FIXES[lang]) {
      for (const [key, newValue] of Object.entries(UNTRANSLATED_FIXES[lang])) {
        if (data.hasOwnProperty(key)) {
          const deRef = loadJson('de');
          const deValue = deRef[key];
          if (data[key] === deValue) {
            data[key] = newValue;
            fixedCount++;
            console.log(`  ~ Fixed untranslated: "${key}"`);
          }
        }
      }
    }

    console.log(`  Summary: +${addedCount} added, ~${fixedCount} fixed`);
    saveJson(lang, data);
  }

  console.log('\n=== All fixes applied! ===\n');
}

applyFixes();
