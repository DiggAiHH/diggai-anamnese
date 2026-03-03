/**
 * Fix English-language values in IT/FR/PL/FA translation files.
 * This script finds keys whose values look English and replaces them with
 * proper translations for each language.
 */
const fs = require('fs');
const path = require('path');

const DIR = 'c:/Users/tubbeTEC/Downloads/Anamnese-kimi/anamnese-app/public/locales';

// Comprehensive translation overrides for common English leftovers
const OVERRIDES = {
  it: {
    // Medical terms that were left in English
    'Schilddrüsenerkrankung': 'Malattia della tiroide',
    'Thyroid disease': 'Malattia della tiroide',  
    'Chronic lung disease': 'Malattia polmonare cronica',
    'Nervous system disease': 'Malattia del sistema nervoso',
    'Rheumatic disease': 'Malattia reumatica',
    'Blood clotting disorder': 'Disturbo della coagulazione',
    'Kidney dysfunction': 'Disfunzione renale',
    'MRSA infection': 'Infezione da MRSA',
    'Heart failure': 'Insufficienza cardiaca',
    'Heart disease': 'Malattia cardiaca',
    'Dialysis dependency': 'Dipendenza dalla dialisi',
    'Depression/mood disorder': 'Depressione/disturbo dell\'umore',
    'Liver/gastrointestinal disease': 'Malattia epatica/gastrointestinale',
    // UI/Navigation
    'Please select': 'Seleziona',
    'Please choose': 'Scegliere',
    'Please wait': 'Attendere prego',
    'Loading...': 'Caricamento...',
    'No results found': 'Nessun risultato trovato',
    'Save and continue': 'Salva e continua',
    'Go back': 'Torna indietro',
    'Submit': 'Invia',
    'Cancel': 'Annulla',
    'Close': 'Chiudi',
    'Delete': 'Elimina',
    'Edit': 'Modifica',
    'Search': 'Cerca',
    'Filter': 'Filtra',
    'Sort': 'Ordina',
    'Required field': 'Campo obbligatorio',
    'This field is required': 'Questo campo è obbligatorio',
    'Please fill in this field': 'Si prega di compilare questo campo',
    'Invalid input': 'Input non valido',
    'Error': 'Errore',
    'Success': 'Successo',
    'Warning': 'Avvertimento',
    'Information': 'Informazione',
    'Confirm': 'Conferma',
    'Are you sure?': 'Sei sicuro?',
    // Time/Date
    'Today': 'Oggi',
    'Yesterday': 'Ieri',
    'Tomorrow': 'Domani',
    'days ago': 'giorni fa',
    'hours ago': 'ore fa',
    'minutes ago': 'minuti fa',
    // Patient context
    'Your data has been saved': 'I tuoi dati sono stati salvati',
    'The form has been submitted successfully': 'Il modulo è stato inviato con successo',
    'Thank you for your patience': 'Grazie per la pazienza',
    'Please describe your symptoms': 'Descriva i suoi sintomi',
    'Please enter your medication': 'Inserisca i suoi farmaci',
    'Do you have any allergies?': 'Ha delle allergie?',
    'Have you had any surgeries?': 'Ha subito interventi chirurgici?',
    'Current medications': 'Farmaci attuali',
    'Medical history': 'Anamnesi',
    'Family history': 'Anamnesi familiare',
    'Social history': 'Anamnesi sociale',
  },
  fr: {
    'Schilddrüsenerkrankung': 'Maladie de la thyroïde',
    'Thyroid disease': 'Maladie de la thyroïde',
    'Chronic lung disease': 'Maladie pulmonaire chronique',
    'Nervous system disease': 'Maladie du système nerveux',
    'Rheumatic disease': 'Maladie rhumatismale',
    'Blood clotting disorder': 'Trouble de la coagulation',
    'Kidney dysfunction': 'Dysfonctionnement rénal',
    'MRSA infection': 'Infection SARM',
    'Heart failure': 'Insuffisance cardiaque',
    'Heart disease': 'Maladie cardiaque',
    'Dialysis dependency': 'Dépendance à la dialyse',
    'Depression/mood disorder': 'Dépression/trouble de l\'humeur',
    'Liver/gastrointestinal disease': 'Maladie hépatique/gastro-intestinale',
    'Please select': 'Veuillez sélectionner',
    'Please choose': 'Veuillez choisir',
    'Please wait': 'Veuillez patienter',
    'Loading...': 'Chargement...',
    'No results found': 'Aucun résultat trouvé',
    'Save and continue': 'Enregistrer et continuer',
    'Go back': 'Retourner',
    'Submit': 'Envoyer',
    'Cancel': 'Annuler',
    'Close': 'Fermer',
    'Delete': 'Supprimer',
    'Edit': 'Modifier',
    'Search': 'Rechercher',
    'Filter': 'Filtrer',
    'Sort': 'Trier',
    'Required field': 'Champ obligatoire',
    'This field is required': 'Ce champ est obligatoire',
    'Please fill in this field': 'Veuillez remplir ce champ',
    'Invalid input': 'Saisie non valide',
    'Error': 'Erreur',
    'Success': 'Succès',
    'Warning': 'Avertissement',
    'Information': 'Information',
    'Confirm': 'Confirmer',
    'Are you sure?': 'Êtes-vous sûr ?',
    'Today': 'Aujourd\'hui',
    'Yesterday': 'Hier',
    'Tomorrow': 'Demain',
    'days ago': 'il y a quelques jours',
    'hours ago': 'il y a quelques heures',
    'minutes ago': 'il y a quelques minutes',
    'Your data has been saved': 'Vos données ont été sauvegardées',
    'The form has been submitted successfully': 'Le formulaire a été soumis avec succès',
    'Thank you for your patience': 'Merci de votre patience',
    'Please describe your symptoms': 'Veuillez décrire vos symptômes',
    'Please enter your medication': 'Veuillez entrer vos médicaments',
    'Do you have any allergies?': 'Avez-vous des allergies ?',
    'Have you had any surgeries?': 'Avez-vous subi des opérations ?',
    'Current medications': 'Médicaments actuels',
    'Medical history': 'Antécédents médicaux',
    'Family history': 'Antécédents familiaux',
    'Social history': 'Antécédents sociaux',
  },
  pl: {
    'Schilddrüsenerkrankung': 'Choroba tarczycy',
    'Thyroid disease': 'Choroba tarczycy',
    'Chronic lung disease': 'Przewlekła choroba płuc',
    'Nervous system disease': 'Choroba układu nerwowego',
    'Rheumatic disease': 'Choroba reumatyczna',
    'Blood clotting disorder': 'Zaburzenia krzepnięcia krwi',
    'Kidney dysfunction': 'Zaburzenia czynności nerek',
    'MRSA infection': 'Zakażenie MRSA',
    'Heart failure': 'Niewydolność serca',
    'Heart disease': 'Choroba serca',
    'Dialysis dependency': 'Zależność od dializy',
    'Depression/mood disorder': 'Depresja/zaburzenia nastroju',
    'Liver/gastrointestinal disease': 'Choroby wątroby/przewodu pokarmowego',
    'Please select': 'Proszę wybrać',
    'Please choose': 'Proszę wybrać',
    'Please wait': 'Proszę czekać',
    'Loading...': 'Ładowanie...',
    'No results found': 'Nie znaleziono wyników',
    'Save and continue': 'Zapisz i kontynuuj',
    'Go back': 'Wróć',
    'Submit': 'Wyślij',
    'Cancel': 'Anuluj',
    'Close': 'Zamknij',
    'Delete': 'Usuń',
    'Edit': 'Edytuj',
    'Search': 'Szukaj',
    'Filter': 'Filtruj',
    'Sort': 'Sortuj',
    'Required field': 'Pole wymagane',
    'This field is required': 'To pole jest wymagane',
    'Please fill in this field': 'Proszę wypełnić to pole',
    'Invalid input': 'Nieprawidłowe dane',
    'Error': 'Błąd',
    'Success': 'Sukces',
    'Warning': 'Ostrzeżenie',
    'Information': 'Informacja',
    'Confirm': 'Potwierdź',
    'Are you sure?': 'Czy jesteś pewien?',
    'Today': 'Dzisiaj',
    'Yesterday': 'Wczoraj',
    'Tomorrow': 'Jutro',
    'days ago': 'dni temu',
    'hours ago': 'godzin temu',
    'minutes ago': 'minut temu',
    'Your data has been saved': 'Twoje dane zostały zapisane',
    'The form has been submitted successfully': 'Formularz został pomyślnie przesłany',
    'Thank you for your patience': 'Dziękujemy za cierpliwość',
    'Please describe your symptoms': 'Proszę opisać swoje objawy',
    'Please enter your medication': 'Proszę wpisać swoje leki',
    'Do you have any allergies?': 'Czy masz jakieś alergie?',
    'Have you had any surgeries?': 'Czy miałeś/aś jakieś operacje?',
    'Current medications': 'Aktualne leki',
    'Medical history': 'Wywiad lekarski',
    'Family history': 'Wywiad rodzinny',
    'Social history': 'Wywiad społeczny',
  },
  fa: {
    'Schilddrüsenerkrankung': 'بیماری تیروئید',
    'Thyroid disease': 'بیماری تیروئید',
    'Chronic lung disease': 'بیماری مزمن ریه',
    'Nervous system disease': 'بیماری سیستم عصبی',
    'Rheumatic disease': 'بیماری روماتیسمی',
    'Blood clotting disorder': 'اختلال انعقاد خون',
    'Kidney dysfunction': 'اختلال عملکرد کلیه',
    'MRSA infection': 'عفونت MRSA',
    'Heart failure': 'نارسایی قلبی',
    'Heart disease': 'بیماری قلبی',
    'Dialysis dependency': 'وابستگی به دیالیز',
    'Depression/mood disorder': 'افسردگی/اختلال خلقی',
    'Liver/gastrointestinal disease': 'بیماری کبد/گوارشی',
    'Please select': 'لطفاً انتخاب کنید',
    'Please choose': 'لطفاً انتخاب کنید',
    'Please wait': 'لطفاً صبر کنید',
    'Loading...': 'در حال بارگذاری...',
    'No results found': 'نتیجه‌ای یافت نشد',
    'Save and continue': 'ذخیره و ادامه',
    'Go back': 'بازگشت',
    'Submit': 'ارسال',
    'Cancel': 'لغو',
    'Close': 'بستن',
    'Delete': 'حذف',
    'Edit': 'ویرایش',
    'Search': 'جستجو',
    'Required field': 'فیلد الزامی',
    'This field is required': 'این فیلد الزامی است',
    'Please fill in this field': 'لطفاً این فیلد را پر کنید',
    'Invalid input': 'ورودی نامعتبر',
    'Error': 'خطا',
    'Success': 'موفقیت',
    'Warning': 'هشدار',
    'Today': 'امروز',
    'Yesterday': 'دیروز',
    'Tomorrow': 'فردا',
    'Your data has been saved': 'اطلاعات شما ذخیره شد',
    'The form has been submitted successfully': 'فرم با موفقیت ارسال شد',
    'Please describe your symptoms': 'لطفاً علائم خود را شرح دهید',
    'Current medications': 'داروهای فعلی',
    'Medical history': 'سابقه پزشکی',
  }
};

// Now fix: scan each language file, find English-looking values, replace them
for (const lang of ['it', 'fr', 'pl', 'fa']) {
  const filePath = path.join(DIR, lang, 'translation.json');
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  const overrides = OVERRIDES[lang];
  let fixed = 0;
  
  // 1. Apply direct value overrides (match on value)
  for (const [k, v] of Object.entries(data)) {
    if (typeof v === 'string' && overrides[v]) {
      data[k] = overrides[v];
      fixed++;
    }
  }
  
  // 2. Apply key-based overrides
  for (const [key, val] of Object.entries(overrides)) {
    if (key in data && data[key] !== val) {
      // Only override if current value looks English
      const current = String(data[key]).toLowerCase();
      const englishWords = ['the ', ' and ', 'your ', 'with ', ' have ', 'this ', 'disease', 'disorder', 'please', 'patient'];
      const isEnglish = englishWords.filter(w => current.includes(w)).length >= 1;
      if (isEnglish || data[key] === key) {
        data[key] = val;
        fixed++;
      }
    }
  }
  
  // 3. Add new keys for Diabetes + Herzerkrankungen (new questions)
  const newKeys = {
    it: {
      'Körpergröße (in cm)': 'Altezza (in cm)',
      'Auch für Kinder – z.B. 52 cm (Neugeborene) bis 250 cm.': 'Anche per bambini – es. 52 cm (neonati) fino a 250 cm.',
      'Körpergewicht (in kg)': 'Peso (in kg)',
      'Auch für Kinder – z.B. 3 kg (Neugeborene) bis 300 kg.': 'Anche per bambini – es. 3 kg (neonati) fino a 300 kg.',
      'Herzerkrankungen / Herzstörungen': 'Malattie cardiache / Disturbi cardiaci',
      'Diabetes mellitus': 'Diabete mellito',
      'Welche Art von Diabetes?': 'Che tipo di diabete?',
      'Diabetes Typ 1': 'Diabete tipo 1',
      'Diabetes Typ 2': 'Diabete tipo 2',
      'Schwangerschaftsdiabetes': 'Diabete gestazionale',
      'Insulinpflichtig': 'Insulino-dipendente',
      'Tablettenbehandelt': 'Trattato con compresse',
      'Nur Diät': 'Solo dieta',
      'Mobilnummer (optional)': 'Numero di cellulare (opzionale)',
      'Für dringende Rückfragen der Praxis.': 'Per richieste urgenti dello studio.',
      'Festnetznummer (optional)': 'Numero fisso (opzionale)',
      'Falls Sie auch über Festnetz erreichbar sind.': 'Se è raggiungibile anche via telefono fisso.',
      'Mehrfachauswahl möglich': 'Selezione multipla possibile',
      'Mehrfachauswahl möglich – oder Freitext eingeben': 'Selezione multipla possibile – o inserire testo libero',
      'Andere (Freitext)': 'Altro (testo libero)',
      'Welche Uhrzeit bevorzugen Sie?': 'Che orario preferisce?',
      'z.B. "ab 14 Uhr" oder "zwischen 10 und 12 Uhr"': 'es. "dalle 14" o "tra le 10 e le 12"',
    },
    fr: {
      'Körpergröße (in cm)': 'Taille (en cm)',
      'Auch für Kinder – z.B. 52 cm (Neugeborene) bis 250 cm.': 'Aussi pour les enfants – p. ex. 52 cm (nouveau-nés) à 250 cm.',
      'Körpergewicht (in kg)': 'Poids (en kg)',
      'Auch für Kinder – z.B. 3 kg (Neugeborene) bis 300 kg.': 'Aussi pour les enfants – p. ex. 3 kg (nouveau-nés) à 300 kg.',
      'Herzerkrankungen / Herzstörungen': 'Maladies cardiaques / Troubles cardiaques',
      'Diabetes mellitus': 'Diabète sucré',
      'Welche Art von Diabetes?': 'Quel type de diabète ?',
      'Diabetes Typ 1': 'Diabète de type 1',
      'Diabetes Typ 2': 'Diabète de type 2',
      'Schwangerschaftsdiabetes': 'Diabète gestationnel',
      'Insulinpflichtig': 'Insulino-dépendant',
      'Tablettenbehandelt': 'Traité par comprimés',
      'Nur Diät': 'Régime seul',
      'Mobilnummer (optional)': 'Numéro de portable (facultatif)',
      'Für dringende Rückfragen der Praxis.': 'Pour les demandes urgentes du cabinet.',
      'Festnetznummer (optional)': 'Numéro fixe (facultatif)',
      'Falls Sie auch über Festnetz erreichbar sind.': 'Si vous êtes également joignable par téléphone fixe.',
      'Mehrfachauswahl möglich': 'Sélection multiple possible',
      'Mehrfachauswahl möglich – oder Freitext eingeben': 'Sélection multiple possible – ou saisir du texte libre',
      'Andere (Freitext)': 'Autre (texte libre)',
      'Welche Uhrzeit bevorzugen Sie?': 'Quelle heure préférez-vous ?',
      'z.B. "ab 14 Uhr" oder "zwischen 10 und 12 Uhr"': 'p. ex. « à partir de 14h » ou « entre 10h et 12h »',
    },
    pl: {
      'Körpergröße (in cm)': 'Wzrost (w cm)',
      'Auch für Kinder – z.B. 52 cm (Neugeborene) bis 250 cm.': 'Również dla dzieci – np. 52 cm (noworodki) do 250 cm.',
      'Körpergewicht (in kg)': 'Masa ciała (w kg)',
      'Auch für Kinder – z.B. 3 kg (Neugeborene) bis 300 kg.': 'Również dla dzieci – np. 3 kg (noworodki) do 300 kg.',
      'Herzerkrankungen / Herzstörungen': 'Choroby serca / Zaburzenia sercowe',
      'Diabetes mellitus': 'Cukrzyca',
      'Welche Art von Diabetes?': 'Jaki typ cukrzycy?',
      'Diabetes Typ 1': 'Cukrzyca typu 1',
      'Diabetes Typ 2': 'Cukrzyca typu 2',
      'Schwangerschaftsdiabetes': 'Cukrzyca ciążowa',
      'Insulinpflichtig': 'Insulinozależny',
      'Tablettenbehandelt': 'Leczony tabletkami',
      'Nur Diät': 'Tylko dieta',
      'Mobilnummer (optional)': 'Numer komórkowy (opcjonalnie)',
      'Für dringende Rückfragen der Praxis.': 'W przypadku pilnych pytań ze strony gabinetu.',
      'Festnetznummer (optional)': 'Numer stacjonarny (opcjonalnie)',
      'Falls Sie auch über Festnetz erreichbar sind.': 'Jeśli jest Pan/Pani dostępny/a również telefonicznie na numer stacjonarny.',
      'Mehrfachauswahl möglich': 'Możliwy wielokrotny wybór',
      'Mehrfachauswahl möglich – oder Freitext eingeben': 'Możliwy wielokrotny wybór – lub wpisz tekst',
      'Andere (Freitext)': 'Inne (tekst wolny)',
      'Welche Uhrzeit bevorzugen Sie?': 'Jaką godzinę Pan/Pani preferuje?',
      'z.B. "ab 14 Uhr" oder "zwischen 10 und 12 Uhr"': 'np. „od 14:00" lub „między 10:00 a 12:00"',
    },
    fa: {
      'Körpergröße (in cm)': 'قد (به سانتی‌متر)',
      'Auch für Kinder – z.B. 52 cm (Neugeborene) bis 250 cm.': 'همچنین برای کودکان – مثلاً ۵۲ سانتی‌متر (نوزادان) تا ۲۵۰ سانتی‌متر.',
      'Körpergewicht (in kg)': 'وزن (به کیلوگرم)',
      'Auch für Kinder – z.B. 3 kg (Neugeborene) bis 300 kg.': 'همچنین برای کودکان – مثلاً ۳ کیلوگرم (نوزادان) تا ۳۰۰ کیلوگرم.',
      'Herzerkrankungen / Herzstörungen': 'بیماری‌های قلبی / اختلالات قلبی',
      'Diabetes mellitus': 'دیابت',
      'Welche Art von Diabetes?': 'چه نوع دیابتی؟',
      'Diabetes Typ 1': 'دیابت نوع ۱',
      'Diabetes Typ 2': 'دیابت نوع ۲',
      'Schwangerschaftsdiabetes': 'دیابت بارداری',
      'Insulinpflichtig': 'نیازمند انسولین',
      'Tablettenbehandelt': 'درمان با قرص',
      'Nur Diät': 'فقط رژیم غذایی',
      'Mobilnummer (optional)': 'شماره موبایل (اختیاری)',
      'Für dringende Rückfragen der Praxis.': 'برای سوالات فوری مطب.',
      'Festnetznummer (optional)': 'شماره تلفن ثابت (اختیاری)',
      'Falls Sie auch über Festnetz erreichbar sind.': 'اگر از طریق تلفن ثابت نیز در دسترس هستید.',
      'Mehrfachauswahl möglich': 'امکان انتخاب چندگانه',
      'Mehrfachauswahl möglich – oder Freitext eingeben': 'امکان انتخاب چندگانه – یا متن آزاد وارد کنید',
      'Andere (Freitext)': 'سایر (متن آزاد)',
      'Welche Uhrzeit bevorzugen Sie?': 'چه ساعتی را ترجیح می‌دهید؟',
      'z.B. "ab 14 Uhr" oder "zwischen 10 und 12 Uhr"': 'مثلاً «از ساعت ۱۴» یا «بین ۱۰ تا ۱۲»',
    }
  };
  
  // Add new keys
  if (newKeys[lang]) {
    for (const [k, v] of Object.entries(newKeys[lang])) {
      if (!data[k]) {
        data[k] = v;
        fixed++;
      }
    }
  }
  
  // Sort keys alphabetically for consistency
  const sorted = {};
  for (const k of Object.keys(data).sort()) {
    sorted[k] = data[k];
  }
  
  fs.writeFileSync(filePath, JSON.stringify(sorted, null, 2) + '\n', 'utf8');
  console.log(`${lang.toUpperCase()}: fixed ${fixed} keys, total ${Object.keys(sorted).length}`);
}

// Also add the new keys to DE, EN, AR, TR, UK, ES
const extraLangs = {
  de: {
    'Körpergröße (in cm)': 'Körpergröße (in cm)',
    'Auch für Kinder – z.B. 52 cm (Neugeborene) bis 250 cm.': 'Auch für Kinder – z.B. 52 cm (Neugeborene) bis 250 cm.',
    'Körpergewicht (in kg)': 'Körpergewicht (in kg)',
    'Auch für Kinder – z.B. 3 kg (Neugeborene) bis 300 kg.': 'Auch für Kinder – z.B. 3 kg (Neugeborene) bis 300 kg.',
    'Herzerkrankungen / Herzstörungen': 'Herzerkrankungen / Herzstörungen',
    'Diabetes mellitus': 'Diabetes mellitus',
    'Welche Art von Diabetes?': 'Welche Art von Diabetes?',
    'Insulinpflichtig': 'Insulinpflichtig',
    'Tablettenbehandelt': 'Tablettenbehandelt',
    'Nur Diät': 'Nur Diät',
    'Schwangerschaftsdiabetes': 'Schwangerschaftsdiabetes',
    'Mobilnummer (optional)': 'Mobilnummer (optional)',
    'Für dringende Rückfragen der Praxis.': 'Für dringende Rückfragen der Praxis.',
    'Festnetznummer (optional)': 'Festnetznummer (optional)',
    'Falls Sie auch über Festnetz erreichbar sind.': 'Falls Sie auch über Festnetz erreichbar sind.',
    'Mehrfachauswahl möglich': 'Mehrfachauswahl möglich',
    'Mehrfachauswahl möglich – oder Freitext eingeben': 'Mehrfachauswahl möglich – oder Freitext eingeben',
    'Andere (Freitext)': 'Andere (Freitext)',
    'Welche Uhrzeit bevorzugen Sie?': 'Welche Uhrzeit bevorzugen Sie?',
    'z.B. "ab 14 Uhr" oder "zwischen 10 und 12 Uhr"': 'z.B. "ab 14 Uhr" oder "zwischen 10 und 12 Uhr"',
  },
  en: {
    'Körpergröße (in cm)': 'Height (in cm)',
    'Auch für Kinder – z.B. 52 cm (Neugeborene) bis 250 cm.': 'Also for children – e.g. 52 cm (newborns) up to 250 cm.',
    'Körpergewicht (in kg)': 'Weight (in kg)',
    'Auch für Kinder – z.B. 3 kg (Neugeborene) bis 300 kg.': 'Also for children – e.g. 3 kg (newborns) up to 300 kg.',
    'Herzerkrankungen / Herzstörungen': 'Heart diseases / Cardiac disorders',
    'Diabetes mellitus': 'Diabetes mellitus',
    'Welche Art von Diabetes?': 'What type of diabetes?',
    'Insulinpflichtig': 'Insulin-dependent',
    'Tablettenbehandelt': 'Treated with tablets',
    'Nur Diät': 'Diet only',
    'Schwangerschaftsdiabetes': 'Gestational diabetes',
    'Mobilnummer (optional)': 'Mobile number (optional)',
    'Für dringende Rückfragen der Praxis.': 'For urgent inquiries from the practice.',
    'Festnetznummer (optional)': 'Landline number (optional)',
    'Falls Sie auch über Festnetz erreichbar sind.': 'If you are also reachable by landline.',
    'Mehrfachauswahl möglich': 'Multiple selection possible',
    'Mehrfachauswahl möglich – oder Freitext eingeben': 'Multiple selection possible – or enter free text',
    'Andere (Freitext)': 'Other (free text)',
    'Welche Uhrzeit bevorzugen Sie?': 'What time do you prefer?',
    'z.B. "ab 14 Uhr" oder "zwischen 10 und 12 Uhr"': 'e.g. "from 2 PM" or "between 10 AM and 12 PM"',
  },
  ar: {
    'Körpergröße (in cm)': 'الطول (بالسنتيمتر)',
    'Auch für Kinder – z.B. 52 cm (Neugeborene) bis 250 cm.': 'أيضاً للأطفال – مثلاً ٥٢ سم (حديثي الولادة) حتى ٢٥٠ سم.',
    'Körpergewicht (in kg)': 'الوزن (بالكيلوغرام)',
    'Auch für Kinder – z.B. 3 kg (Neugeborene) bis 300 kg.': 'أيضاً للأطفال – مثلاً ٣ كجم (حديثي الولادة) حتى ٣٠٠ كجم.',
    'Herzerkrankungen / Herzstörungen': 'أمراض القلب / اضطرابات القلب',
    'Diabetes mellitus': 'داء السكري',
    'Welche Art von Diabetes?': 'أي نوع من السكري؟',
    'Insulinpflichtig': 'يحتاج إنسولين',
    'Tablettenbehandelt': 'معالج بالأقراص',
    'Nur Diät': 'حمية فقط',
    'Schwangerschaftsdiabetes': 'سكري الحمل',
    'Mobilnummer (optional)': 'رقم الجوال (اختياري)',
    'Festnetznummer (optional)': 'رقم الهاتف الثابت (اختياري)',
    'Mehrfachauswahl möglich': 'يمكن الاختيار المتعدد',
    'Andere (Freitext)': 'أخرى (نص حر)',
    'Welche Uhrzeit bevorzugen Sie?': 'أي وقت تفضل؟',
  },
  tr: {
    'Körpergröße (in cm)': 'Boy (cm cinsinden)',
    'Auch für Kinder – z.B. 52 cm (Neugeborene) bis 250 cm.': 'Çocuklar için de geçerli – örn. 52 cm (yenidoğanlar) ile 250 cm arası.',
    'Körpergewicht (in kg)': 'Kilo (kg cinsinden)',
    'Auch für Kinder – z.B. 3 kg (Neugeborene) bis 300 kg.': 'Çocuklar için de geçerli – örn. 3 kg (yenidoğanlar) ile 300 kg arası.',
    'Herzerkrankungen / Herzstörungen': 'Kalp hastalıkları / Kalp bozuklukları',
    'Diabetes mellitus': 'Şeker hastalığı',
    'Welche Art von Diabetes?': 'Hangi tip diyabet?',
    'Insulinpflichtig': 'İnsüline bağımlı',
    'Tablettenbehandelt': 'Tabletlerle tedavi edilen',
    'Nur Diät': 'Sadece diyet',
    'Schwangerschaftsdiabetes': 'Gebelik diyabeti',
    'Mobilnummer (optional)': 'Cep telefonu numarası (isteğe bağlı)',
    'Festnetznummer (optional)': 'Sabit hat numarası (isteğe bağlı)',
    'Mehrfachauswahl möglich': 'Birden fazla seçim yapılabilir',
    'Andere (Freitext)': 'Diğer (serbest metin)',
    'Welche Uhrzeit bevorzugen Sie?': 'Hangi saati tercih edersiniz?',
  },
  uk: {
    'Körpergröße (in cm)': 'Зріст (у см)',
    'Auch für Kinder – z.B. 52 cm (Neugeborene) bis 250 cm.': 'Також для дітей – напр. 52 см (новонароджені) до 250 см.',
    'Körpergewicht (in kg)': 'Вага (у кг)',
    'Auch für Kinder – z.B. 3 kg (Neugeborene) bis 300 kg.': 'Також для дітей – напр. 3 кг (новонароджені) до 300 кг.',
    'Herzerkrankungen / Herzstörungen': 'Хвороби серця / Серцеві розлади',
    'Diabetes mellitus': 'Цукровий діабет',
    'Welche Art von Diabetes?': 'Який тип діабету?',
    'Insulinpflichtig': 'Інсулінозалежний',
    'Tablettenbehandelt': 'Лікування таблетками',
    'Nur Diät': 'Тільки дієта',
    'Schwangerschaftsdiabetes': 'Гестаційний діабет',
    'Mobilnummer (optional)': 'Номер мобільного (необов\'язково)',
    'Festnetznummer (optional)': 'Номер стаціонарного (необов\'язково)',
    'Mehrfachauswahl möglich': 'Можливий множинний вибір',
    'Andere (Freitext)': 'Інше (вільний текст)',
    'Welche Uhrzeit bevorzugen Sie?': 'Яку годину ви віддаєте перевагу?',
  },
  es: {
    'Körpergröße (in cm)': 'Estatura (en cm)',
    'Auch für Kinder – z.B. 52 cm (Neugeborene) bis 250 cm.': 'También para niños – p. ej. 52 cm (recién nacidos) hasta 250 cm.',
    'Körpergewicht (in kg)': 'Peso (en kg)',
    'Auch für Kinder – z.B. 3 kg (Neugeborene) bis 300 kg.': 'También para niños – p. ej. 3 kg (recién nacidos) hasta 300 kg.',
    'Herzerkrankungen / Herzstörungen': 'Enfermedades cardíacas / Trastornos cardíacos',
    'Diabetes mellitus': 'Diabetes mellitus',
    'Welche Art von Diabetes?': '¿Qué tipo de diabetes?',
    'Insulinpflichtig': 'Dependiente de insulina',
    'Tablettenbehandelt': 'Tratado con pastillas',
    'Nur Diät': 'Solo dieta',
    'Schwangerschaftsdiabetes': 'Diabetes gestacional',
    'Mobilnummer (optional)': 'Número de móvil (opcional)',
    'Festnetznummer (optional)': 'Número fijo (opcional)',
    'Mehrfachauswahl möglich': 'Selección múltiple posible',
    'Andere (Freitext)': 'Otro (texto libre)',
    'Welche Uhrzeit bevorzugen Sie?': '¿Qué hora prefiere?',
  },
};

for (const [lang, keys] of Object.entries(extraLangs)) {
  const filePath = path.join(DIR, lang, 'translation.json');
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let added = 0;
  for (const [k, v] of Object.entries(keys)) {
    if (!data[k]) {
      data[k] = v;
      added++;
    }
  }
  
  const sorted = {};
  for (const k of Object.keys(data).sort()) {
    sorted[k] = data[k];
  }
  
  fs.writeFileSync(filePath, JSON.stringify(sorted, null, 2) + '\n', 'utf8');
  console.log(`${lang.toUpperCase()}: added ${added} new keys, total ${Object.keys(sorted).length}`);
}

console.log('\nDone! All languages updated.');
